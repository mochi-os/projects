import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCard } from "./kanban-card";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";


interface TaskCardProps {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
}

export function TaskCard({ object, fields, options, prefix }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: object.id,
    data: {
      type: "Task",
      object,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <KanbanCard
            object={object}
            fields={fields}
            options={options}
            prefix={prefix}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <KanbanCard
        object={object}
        fields={fields}
        options={options}
        prefix={prefix}
      />
    </div>
  );
}
