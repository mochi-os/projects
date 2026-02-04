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
  classMap: Record<string, string>;
  prefix: string;
  showClass?: boolean;
  showId?: boolean;
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
  classMap,
  prefix,
  showClass = true,
  showId = true,
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
    <tr
      className={cn(
        "hover:bg-muted/50 cursor-pointer text-sm group",
        isDragOver && "bg-primary/10",
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
      {/* Drag handle + expand/collapse */}
      <td className="whitespace-nowrap py-1.5 pl-1">
        <div className="flex items-center" style={{ paddingLeft: indentPx }}>
          <div className="w-5 flex items-center justify-center opacity-0 group-hover:opacity-50 cursor-grab">
            <GripVertical className="size-3" />
          </div>
          {hasChildren ? (
            <button
              className="size-5 flex items-center justify-center hover:bg-muted rounded"
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
            <div className="size-5" />
          )}
        </div>
      </td>

      {/* Class badge */}
      {showClass && (
        <td className="whitespace-nowrap px-2 py-1.5">
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {classMap[object.class] || object.class}
          </span>
        </td>
      )}

      {/* Object number */}
      {showId && (
        <td className="whitespace-nowrap px-2 py-1.5 text-xs text-muted-foreground font-mono">
          {prefix}-{object.number}
        </td>
      )}

      {/* Field columns */}
      {fields.map((field) => {
        const value = object.values[field.id] || "";
        const displayValue = field.id === "title" ? truncate(value, 100) : value;
        return (
          <td
            key={field.id}
            className={cn(
              "px-2 py-1.5",
              field.id === "title" ? "" : "whitespace-nowrap"
            )}
          >
            {renderFieldValue(field, displayValue)}
          </td>
        );
      })}
    </tr>
  );
}
