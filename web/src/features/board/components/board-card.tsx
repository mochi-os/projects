// Mochi Projects: Board card component
// Copyright Alistair Cunningham 2026

import { cn } from "@mochi/common";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface BoardCardProps {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  onClick?: () => void;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

export function BoardCard({
  object,
  fields,
  options,
  prefix,
  onClick,
}: BoardCardProps) {
  const rawTitle = object.values.title || `${prefix}-${object.number}`;
  const title = truncate(rawTitle, 160);
  // Exclude title (shown separately), status (redundant - card is already in status column), and priority (shown as border)
  const cardFields = fields.filter(
    (f) => f.card === 1 && f.id !== "title" && f.id !== "status" && f.id !== "priority",
  );

  // Get priority color for card border
  const priorityValue = object.values.priority;
  const priorityOptions = options.priority || [];
  const priorityOption = priorityOptions.find((o) => o.id === priorityValue);
  const borderColor = priorityOption?.colour;

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-[10px] p-3 cursor-pointer",
        "hover:shadow-sm transition-all",
        "active:scale-[0.98]",
        !borderColor && "border-border hover:border-primary/50",
      )}
      style={borderColor ? { borderColor } : undefined}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", object.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="font-medium text-sm mb-2 line-clamp-2">{title}</div>

      {object.values.description && (
        <div className="text-xs text-muted-foreground mb-2">
          {truncate(object.values.description, 160)}
        </div>
      )}

      {cardFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {cardFields.map((field) => {
            const value = object.values[field.id];
            if (!value) return null;

            const fieldOptions = options[field.id] || [];
            const option = fieldOptions.find((o) => o.id === value);

            if (field.fieldtype === "enum" && option) {
              return (
                <span
                  key={field.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: option.colour
                      ? `${option.colour}20`
                      : undefined,
                    color: option.colour || undefined,
                  }}
                >
                  {option.name}
                </span>
              );
            }

            return (
              <span key={field.id} className="text-xs text-muted-foreground">
                {value}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
