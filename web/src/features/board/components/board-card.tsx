// Mochi Projects: Board card component
// Copyright Alistair Cunningham 2026

import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@mochi/common";
import { Check, CheckSquare, CornerLeftUp } from "lucide-react";
import type { ProjectObject, ProjectField, FieldOption, ChecklistItem, ProjectClass } from "@/types";

interface BoardCardProps {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  objectMap?: Record<string, ProjectObject>;
  classMap?: Record<string, ProjectClass>;
  allObjects?: ProjectObject[];
  statusField?: string;
  rowField?: string;
  peopleMap?: Record<string, string>;
  draggable?: boolean;
  onClick?: () => void;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

// Format a date value for display
function formatDate(value: string): string {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString();
}

export function BoardCard({
  object,
  fields,
  options,
  prefix,
  objectMap,
  classMap,
  allObjects,
  statusField,
  rowField,
  peopleMap,
  draggable: canDrag = true,
  onClick,
}: BoardCardProps) {
  // Use first field as the card header, fallback to prefix-number
  const headerField = fields[0];
  const rawTitle = headerField
    ? (object.values[headerField.id] || `${prefix}-${object.number}`)
    : `${prefix}-${object.number}`;
  const title = truncate(rawTitle, 160);

  // Body fields: exclude the header field, statusField, and rowField
  const cardFields = fields.slice(1).filter(
    (f) => f.id !== statusField && f.id !== rowField,
  );

  // Get border color from the first field with a coloured option
  let borderColor: string | undefined;
  for (const f of fields) {
    const value = object.values[f.id];
    if (!value) continue;
    const fieldOptions = options[f.id];
    if (!fieldOptions) continue;
    const match = fieldOptions.find((o) => o.id === value && o.colour);
    if (match) {
      borderColor = match.colour;
      break;
    }
  }

  // Get parent info — use first field value of parent, fallback to prefix-number
  const parentObject = object.parent && objectMap ? objectMap[object.parent] : null;
  const parentClassName = parentObject && classMap ? classMap[parentObject.class]?.name || parentObject.class : null;
  const parentTitle = parentObject
    ? (Object.values(parentObject.values).find((v) => v) || `${prefix}-${parentObject.number}`)
    : null;

  // Compute child status counts for parent cards
  const children = allObjects && statusField
    ? allObjects.filter((o) => o.parent === object.id)
    : [];
  const statusOptions = statusField ? (options[statusField] || []) : [];
  const statusCounts: Record<string, number> = {};
  if (children.length > 0) {
    for (const child of children) {
      const status = child.values[statusField!] || "";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  }

  // Render a field value inline on the card
  const renderField = (field: ProjectField) => {
    const value = object.values[field.id];
    if (!value) return null;

    const fieldOptions = options[field.id] || [];
    const option = fieldOptions.find((o) => o.id === value);

    switch (field.fieldtype) {
      case "enumerated":
        if (!option) return null;
        return (
          <span
            key={field.id}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            {option.colour && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.colour }} />
            )}
            {option.name}
          </span>
        );

      case "checklist":
        try {
          const items: ChecklistItem[] = JSON.parse(value);
          if (items.length === 0) return null;
          const doneCount = items.filter((item) => item.done).length;
          const allDone = doneCount === items.length;
          return (
            <span
              key={field.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                allDone
                  ? "bg-green-500/10 text-green-600 ring-green-500/30"
                  : "bg-muted text-muted-foreground ring-border"
              )}
            >
              <CheckSquare className="h-3 w-3" />
              {doneCount}/{items.length}
            </span>
          );
        } catch {
          return null;
        }

      case "date":
        return (
          <span key={field.id} className="text-[10px] text-muted-foreground">
            {formatDate(value)}
          </span>
        );

      case "user": {
        const name = peopleMap?.[value] || value;
        return (
          <span key={field.id} className="text-[10px] text-muted-foreground">
            {truncate(name, 25)}
          </span>
        );
      }

      case "checkbox":
        if (value !== "true") return null;
        return (
          <span
            key={field.id}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <Check className="h-3 w-3" />
            {field.name}
          </span>
        );

      case "number":
        return (
          <span key={field.id} className="text-[10px] text-muted-foreground">
            {value}
          </span>
        );

      case "text":
      default:
        return (
          <span key={field.id} className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            {truncate(value, 80)}
          </span>
        );
    }
  };

  // Check if any body field has a value to render
  const hasBodyFields = cardFields.some((f) => {
    const value = object.values[f.id];
    if (!value) return false;
    if (f.fieldtype === "checkbox" && value !== "true") return false;
    return true;
  });

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-[10px] border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        "cursor-pointer active:scale-[0.99]",
      )}
      style={borderColor ? { borderColor: borderColor } : undefined}
      onClick={onClick}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => {
        e.dataTransfer.setData("text/plain", object.id);
        e.dataTransfer.effectAllowed = "move";
      } : undefined}
    >
      {/* Header / Title */}
      <div className="font-medium text-sm leading-tight text-card-foreground">
        {title}
      </div>

      {/* Body fields */}
      {hasBodyFields && (
        <div className="flex flex-col gap-1">
          {cardFields.map((field) => renderField(field))}
        </div>
      )}

      {/* Parent / Children indicators */}
      {(parentObject || children.length > 0) && (
        <>
          <hr className="border-dashed" />
          <div className="flex items-center gap-2 flex-wrap">
            {parentObject && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                    <CornerLeftUp className="size-3" />
                    <span className="truncate max-w-[140px]">{parentTitle}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{parentClassName}: {parentTitle}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {statusOptions
              .filter((opt) => (statusCounts[opt.id] || 0) > 0)
              .map((opt) => (
                <span key={opt.id} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.colour }} />
                  {statusCounts[opt.id]}
                </span>
              ))}
          </div>
        </>
      )}

    </div>
  );
}
