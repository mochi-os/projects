// Mochi Projects: Board card component
// Copyright Alistair Cunningham 2026

import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@mochi/common";
import { CheckSquare, CornerLeftUp } from "lucide-react";
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
  objectMap,
  classMap,
  allObjects,
  statusField,
  onClick,
}: BoardCardProps) {
  const rawTitle = object.values.title || `${prefix}-${object.number}`;
  const title = truncate(rawTitle, 160);

  // Exclude title, status, priority for the body content
  const cardFields = fields.filter(
    (f) => f.id !== "title" && f.id !== "status" && f.id !== "priority",
  );

  // Get priority color for left border strip
  const priorityValue = object.values.priority;
  const priorityOptions = options.priority || [];
  const priorityOption = priorityOptions.find((o) => o.id === priorityValue);
  const priorityColor = priorityOption?.colour;

  // Get parent info
  const parentObject = object.parent && objectMap ? objectMap[object.parent] : null;
  const parentClassName = parentObject && classMap ? classMap[parentObject.class]?.name || parentObject.class : null;
  const parentTitle = parentObject?.values.title || (parentObject ? `${prefix}-${parentObject.number}` : null);

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

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        "cursor-pointer active:scale-[0.99]",
      )}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", object.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      {/* Priority Indicator Strip */}
      {priorityColor && (
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
          style={{ backgroundColor: priorityColor }}
        />
      )}

      {/* Header / Title */}
      <div className={cn("font-medium text-sm leading-tight text-card-foreground", priorityColor && "pl-2")}>
        {title}
      </div>

      {/* Description Preview */}
      {object.values.description && (
        <div className={cn("text-xs text-muted-foreground line-clamp-3", priorityColor && "pl-2")}>
          {object.values.description}
        </div>
      )}

      {/* Tags / Badges */}
      {cardFields.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", priorityColor && "pl-2")}>
          {cardFields.map((field) => {
            const value = object.values[field.id];
            if (!value) return null;

            const fieldOptions = options[field.id] || [];
            const option = fieldOptions.find((o) => o.id === value);

            if (field.fieldtype === "enumerated" && option) {
              return (
                <span
                  key={field.id}
                  className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset"
                  style={{
                    backgroundColor: option.colour ? `${option.colour}10` : "var(--muted)",
                    color: option.colour || "var(--muted-foreground)",
                    boxShadow: option.colour ? `inset 0 0 0 1px ${option.colour}30` : undefined,
                  }}
                >
                  {option.name}
                </span>
              );
            }

            if (field.fieldtype === "checklist") {
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
            }

            return null; // Skip other field types in card view to keep it minimal
          })}
        </div>
      )}

      {/* Parent / Children indicators */}
      {(parentObject || children.length > 0) && (
        <>
          <hr className="border-dashed" />
          <div className={cn("flex items-center gap-2 flex-wrap", priorityColor && "pl-2")}>
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
