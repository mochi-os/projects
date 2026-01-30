// Mochi Projects: Board card component
// Copyright Alistair Cunningham 2026

import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@mochi/common";
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

  // Exclude title, status, priority for the body content
  const cardFields = fields.filter(
    (f) => f.card === 1 && f.id !== "title" && f.id !== "status" && f.id !== "priority",
  );

  // Get priority color for left border strip
  const priorityValue = object.values.priority;
  const priorityOptions = options.priority || [];
  const priorityOption = priorityOptions.find((o) => o.id === priorityValue);
  const priorityColor = priorityOption?.colour;

  // Format date
  const dateStr = new Date(object.created * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  // Get assignee info
  const assigneeId = object.values.assignee;
  const assigneeOptions = options.assignee || [];
  const assigneeOption = assigneeOptions.find((o) => o.id === assigneeId);
  const assigneeName = assigneeOption?.name || assigneeId || "Unassigned";
  // Get initials (first letter of first 2 words if possible, or just first letter)
  const assigneeInitials = assigneeName === "Unassigned" 
    ? "U" 
    : assigneeName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

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
      <div className={cn("pr-6 font-medium text-sm leading-tight text-card-foreground", priorityColor && "pl-2")}>
        {title}
      </div>

      {/* Edit Action (Visible on Hover) */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
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

            if (field.fieldtype === "enum" && option) {
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
            return null; // Skip non-enum text fields in card view to keep it minimal
          })}
        </div>
      )}

      {/* Footer: Date & ID & Assignee */}
      <div className={cn("mt-1 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground", priorityColor && "pl-2")}>
        <div className="flex items-center gap-1.5">
          {/* Assignee Avatar with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium transition-colors cursor-help",
                  assigneeId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {assigneeInitials}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{assigneeName}</p>
            </TooltipContent>
          </Tooltip>

          <span>{dateStr}</span>
        </div>
        <div className="font-mono opacity-50">
          {prefix}-{object.number}
        </div>
      </div>
    </div>
  );
}
