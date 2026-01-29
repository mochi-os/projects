import { cn } from "@mochi/common";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  isOverlay?: boolean;
}

export function KanbanCard({
  object,
  fields,
  options,
  prefix,
  className,
  isOverlay,
  ...props
}: KanbanCardProps) {
  const title = object.values.title || `${prefix}-${object.number}`;
  const cardFields = fields.filter((f) => f.card === 1);

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-3 cursor-grab relative",
        "hover:border-primary/50 hover:shadow-sm transition-all",
        // Overlay specific styles
        isOverlay && "cursor-grabbing shadow-xl rotate-2 scale-105 z-50 opacity-100 ring-2 ring-primary",
        className
      )}
      {...props}
    >
      <div className="text-xs text-muted-foreground mb-1">
        {prefix}-{object.number}
      </div>
      <div className="font-medium text-sm mb-2 line-clamp-2 text-foreground">{title}</div>

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
