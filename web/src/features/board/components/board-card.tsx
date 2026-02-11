// Mochi Projects: Board card component
// Copyright Alistair Cunningham 2026

import { Card, cn, Tooltip, TooltipContent, TooltipTrigger } from "@mochi/common";
import { Check, CheckSquare, CornerLeftUp } from "lucide-react";
import type { ProjectObject, ProjectField, FieldOption, ChecklistItem } from "@/types";

interface BoardCardProps {
  object: ProjectObject;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  objectMap?: Record<string, ProjectObject>;
  allFields?: Record<string, ProjectField[]>;
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
  allFields,
  allObjects,
  statusField,
  rowField,
  peopleMap,
  draggable: canDrag = true,
  onClick,
}: BoardCardProps) {
  // Use field with 'title' flag as the card header
  const headerField = fields.find((f) => f.flags?.split(",").includes("title"));
  const rawTitle = headerField
    ? (object.values[headerField.id] || `${prefix}-${object.number}`)
    : `${prefix}-${object.number}`;
  const title = truncate(rawTitle, 160);

  // Body fields: exclude the header field, statusField, and rowField
  const cardFields = fields.filter(
    (f) => f !== headerField && f.id !== statusField && f.id !== rowField,
  );

  // Get border color from the first field with the 'border' flag
  let borderColor: string | undefined;
  const borderFields = fields.filter((f) => f.flags?.split(",").includes("border"));
  for (const f of borderFields) {
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

  // Get parent info — use title-flagged field of parent, fallback to prefix-number
  const parentObject = object.parent && objectMap ? objectMap[object.parent] : null;
  const parentFields = parentObject
    ? (allFields?.[parentObject.class] || fields)
    : null;
  const parentTitleField = parentFields?.find((f) => f.flags?.split(",").includes("title"));
  const parentTitle = parentObject
    ? ((parentTitleField ? parentObject.values[parentTitleField.id] : null) || `${prefix}-${parentObject.number}`)
    : null;

  // Compute child status counts for parent cards
  const children = allObjects && statusField
    ? allObjects.filter((o) => o.parent === object.id)
    : [];

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
    <Card
      className={cn(
        "group relative p-3 py-3 transition-all hover:shadow-md",
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
      {/* Header row: title + parent/children indicators */}
      <div className="flex items-baseline gap-2">
        <div className="font-medium text-sm leading-tight text-card-foreground flex-1 min-w-0">
          {title}
        </div>
        {parentObject && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground shrink-0 self-center">
                <CornerLeftUp className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{parentTitle}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {children.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {children.length}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-0.5">
                {children.map((child) => {
                  const childFields = allFields?.[child.class] || fields;
                  const childTitleField = childFields.find((f) => f.flags?.split(",").includes("title"));
                  const childTitle = childTitleField
                    ? (child.values[childTitleField.id] || `${prefix}-${child.number}`)
                    : `${prefix}-${child.number}`;
                  return <p key={child.id}>{childTitle}</p>;
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Body fields */}
      {hasBodyFields && (
        <div className="flex flex-col gap-1">
          {cardFields.map((field) => renderField(field))}
        </div>
      )}

    </Card>
  );
}
