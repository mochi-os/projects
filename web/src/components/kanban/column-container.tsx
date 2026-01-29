import { useMemo } from "react";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@mochi/common";
import { Plus } from "lucide-react";
import { TaskCard } from "./task-card";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface ColumnContainerProps {
  id: string; // This is the status ID
  title: string;
  colour?: string;
  objects: ProjectObject[];
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  onCreateClick?: () => void;
}

export function ColumnContainer({
  id,
  title,
  colour,
  objects,
  fields,
  options,
  prefix,
  onCreateClick,
}: ColumnContainerProps) {
  const objectIds = useMemo(() => objects.map((obj) => obj.id), [objects]);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: id,
    data: {
      type: "Column",
      column: { id, title },
    },
    disabled: true, // For now, we only drag tasks, not columns. Enable if column reordering is needed.
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg h-full max-h-full",
        "bg-muted/30 border",
        isDragging && "opacity-50"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {colour && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colour }}
            />
          )}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {objects.length}
          </span>
        </div>
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <Plus className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden">
        <SortableContext items={objectIds}>
          {objects.map((object) => (
            <TaskCard
              key={object.id}
              object={object}
              fields={fields}
              options={options}
              prefix={prefix}
            />
          ))}
        </SortableContext>

        {objects.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
                No items
            </div>
        )}
      </div>
    </div>
  );
}
