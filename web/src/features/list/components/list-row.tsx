// Mochi Projects: List row component
// Copyright Alistair Cunningham 2026

import { cn } from "@mochi/common";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface ListRowProps {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  onClick: () => void;
}

export function ListRow({
  object,
  fields,
  options,
  onClick,
}: ListRowProps) {
  const renderFieldValue = (field: ProjectField, value: string) => {
    if (!value) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (field.fieldtype) {
      case "enum": {
        const fieldOptions = options[field.id] || [];
        const option = fieldOptions.find((o) => o.id === value);
        if (option) {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: option.colour }}
              />
              <span className="truncate">{option.name}</span>
            </span>
          );
        }
        return <span className="truncate">{value}</span>;
      }

      case "date": {
        const date = new Date(parseInt(value) * 1000);
        return (
          <span className="truncate">
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      }

      case "user":
        return <span className="truncate">{value}</span>;

      case "text":
      default:
        return <span className="truncate">{value}</span>;
    }
  };

  return (
    <div
      className="flex items-center border-b border-border hover:bg-muted/50 cursor-pointer text-sm"
      onClick={onClick}
    >
      {/* Field columns */}
      {fields.map((field) => (
        <div
          key={field.id}
          className={cn("px-3 py-2", field.id === "title" ? "flex-1" : "w-32")}
        >
          {renderFieldValue(field, object.values[field.id] || "")}
        </div>
      ))}
    </div>
  );
}
