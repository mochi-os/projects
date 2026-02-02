// Mochi Projects: Tree row component
// Copyright Alistair Cunningham 2026

import { ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@mochi/common";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface TreeRowProps {
  object: ProjectObject;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  peopleMap: Record<string, string>;
  typeMap: Record<string, string>;
  prefix: string;
  isDragOver: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

export function TreeRow({
  object,
  depth,
  hasChildren,
  isExpanded,
  fields,
  options,
  peopleMap,
  typeMap,
  prefix,
  isDragOver,
  onToggleExpand,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnd,
}: TreeRowProps) {
  const renderFieldValue = (field: ProjectField, value: string) => {
    if (!value) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (field.fieldtype) {
      case "enumerated": {
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
        const date = new Date(value + "T00:00:00");
        return (
          <span className="truncate">
            {date.toLocaleDateString()}
          </span>
        );
      }

      case "user": {
        const name = peopleMap[value] || value;
        return <span className="truncate">{truncate(name, 25)}</span>;
      }

      case "text":
      default:
        return <span className="truncate">{value}</span>;
    }
  };

  // Calculate indentation (24px per level)
  const indentPx = depth * 24;

  return (
    <div
      className={cn(
        "flex items-center hover:bg-muted/50 cursor-pointer text-sm group",
        isDragOver && "bg-primary/10 border-l-2 border-primary",
      )}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", object.id);
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div className="w-6 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-50 cursor-grab">
        <GripVertical className="size-3" />
      </div>

      {/* Indentation and expand/collapse */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ width: indentPx + 24 }}
      >
        <div style={{ width: indentPx }} />
        {hasChildren ? (
          <button
            className="size-6 flex items-center justify-center hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <div className="size-6" />
        )}
      </div>

      {/* Type badge */}
      <div className="w-20 flex-shrink-0 px-1">
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {typeMap[object.type] || object.type}
        </span>
      </div>

      {/* Object number */}
      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground font-mono px-2">
        {prefix}-{object.number}
      </div>

      {/* Field columns */}
      {fields.map((field) => {
        const value = object.values[field.id] || "";
        const displayValue = field.id === "title" ? truncate(value, 100) : value;
        return (
          <div
            key={field.id}
            className={cn("px-3 py-2", field.id === "title" ? "flex-1 min-w-0" : "w-28 flex-shrink-0")}
          >
            {renderFieldValue(field, displayValue)}
          </div>
        );
      })}
    </div>
  );
}
