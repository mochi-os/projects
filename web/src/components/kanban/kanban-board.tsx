import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ColumnContainer } from "./column-container";
import { KanbanCard } from "./kanban-card";
import type { ProjectObject, ProjectDetails } from "@/types";

interface KanbanBoardProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string) => void;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export function KanbanBoard({
  project,
  objects,
  statusField,
  onCreateClick,
  onMoveObject,
}: KanbanBoardProps) {
  // Config
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 3px distance constraint for drag start
      },
    })
  );

  // Derived state for Fields and Options
  const defaultType = project.types[0];
  const typeFields = defaultType ? project.fields[defaultType.id] || [] : [];
  const typeOptions = defaultType ? project.options[defaultType.id] || {} : {};
  
  // Columns (Statuses)
  const statusOptions = useMemo(() => {
    const opts = typeOptions[statusField] || [];
    return [...opts.sort((a, b) => a.sort - b.sort)];
  }, [typeOptions, statusField]);

  // Local state for optimistic updates during drag
  const [activeObject, setActiveObject] = useState<ProjectObject | null>(null);
  const [localObjects, setLocalObjects] = useState<ProjectObject[]>(objects);

  // Sync local objects when props change (e.g. from server)
  useEffect(() => {
    setLocalObjects(objects);
  }, [objects]);

  const objectsByStatus = useMemo(() => {
    const grouped: Record<string, ProjectObject[]> = {};
    statusOptions.forEach((opt) => {
      grouped[opt.id] = [];
    });
    // Extra default
    grouped[""] = [];

    localObjects.forEach((obj) => {
      const status = obj.values[statusField] || "";
      if (typeof grouped[status] === 'undefined') {
         // handle unknown status
         grouped[status] = []; 
      }
      grouped[status].push(obj);
    });
    return grouped;
  }, [localObjects, statusOptions, statusField]);

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Task") {
      setActiveObject(event.active.data.current.object);
      return;
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    // Implemented simplified drag over logic:
    // If over a component, we just check if status needs changing.
    // For full reordering within the same column or across columns:

    setLocalObjects((prev) => {
      const activeIndex = prev.findIndex((o) => o.id === activeId);
      const activeObj = prev[activeIndex];
      
      // 1. Dragging over a Column (empty space or header)
      if (isOverColumn) {
         const overColumnId = overId as string;
         if (activeObj.values[statusField] !== overColumnId) {
             // Move to the new column
             const newObj = { ...activeObj, values: { ...activeObj.values, [statusField]: overColumnId } };
             const newArr = [...prev];
             newArr[activeIndex] = newObj;
             // We could also move it to end of list, but keeping index is fine for now as sort strategy
             return newArr;
         }
      }

      // 2. Dragging over another Task
      if (isOverTask) {
        const overIndex = prev.findIndex((o) => o.id === overId);
        const overObj = prev[overIndex];
        
        if (activeObj.values[statusField] !== overObj.values[statusField]) {
            // Moving to different column
             const newObj = { ...activeObj, values: { ...activeObj.values, [statusField]: overObj.values[statusField] } };
             const newArr = [...prev];
             newArr[activeIndex] = newObj;
             return arrayMove(newArr, activeIndex, overIndex);
        } else {
             // Reordering in same column
             return arrayMove(prev, activeIndex, overIndex);
        }
      }

      return prev;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveObject(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;


    // Trigger the final persistence
    // We compare the 'localObjects' state derived status vs the original props or just rely on 'localObjects' final state?
    // Actually, 'localObjects' has the final state.
    // We need to find the object in localObjects and see if its status changed compared to *what it was before drag*?
    // Or simpler: we know where it ended up.
    
    // BUT 'onMoveObject' usually expects (id, status).
    // If we reordered, we might need a different API for 'index'. 
    // The current API 'onMoveObject' seems to only handle status change (moveMutation in parent).
    // So we assume reordering within column is NOT persisted (or ignored) for now, only Status change.
    
    const finalObj = localObjects.find(o => o.id === activeId);
    if (finalObj) {
         const finalStatus = finalObj.values[statusField];
         // We should check if it's different from the *original* status or just trigger it.
         // Triggering it is safe usually.
         onMoveObject?.(activeId, finalStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px] px-4">
        {statusOptions.map((status) => (
          <ColumnContainer
            key={status.id}
            id={status.id}
            title={status.name}
            colour={status.colour}
            objects={objectsByStatus[status.id] || []}
            fields={typeFields}
            options={typeOptions}
            prefix={project.project.prefix}
            onCreateClick={() => onCreateClick?.(status.id)}
          />
        ))}
         {/* Column for items without status if any */}
        {objectsByStatus[""]?.length > 0 && (
            <ColumnContainer
            id=""
            title="No Status"
            objects={objectsByStatus[""]}
            fields={typeFields}
            options={typeOptions}
            prefix={project.project.prefix}
            />
        )}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
            {activeObject && (
                <KanbanCard
                    object={activeObject}
                    fields={typeFields}
                    options={typeOptions}
                    prefix={project.project.prefix}
                    isOverlay
                />
            )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
