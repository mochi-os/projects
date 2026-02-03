// Mochi Projects: Design preview component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { cn } from "@mochi/common";
import type {
  ProjectType,
  ProjectField,
  FieldOption,
  ProjectView,
} from "@/types";

type PreviewMode = "board" | "card";

interface DesignPreviewProps {
  types: ProjectType[];
  fields: Record<string, ProjectField[]>;
  options: Record<string, Record<string, FieldOption[]>>;
  views: ProjectView[];
  selectedTypeId: string | null;
}

// Sample data for preview
const SAMPLE_CARDS = [
  {
    id: "1",
    number: 1,
    values: {
      title: "Implement login feature",
      status: "progress",
      priority: "high",
      description: "Add user authentication",
    },
  },
  {
    id: "2",
    number: 2,
    values: {
      title: "Fix navigation bug",
      status: "todo",
      priority: "medium",
      description: "Navigation not working on mobile",
    },
  },
  {
    id: "3",
    number: 3,
    values: {
      title: "Update documentation",
      status: "done",
      priority: "low",
      description: "Add API documentation",
    },
  },
];

export function DesignPreview({
  types,
  fields,
  options,
  views,
  selectedTypeId,
}: DesignPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("board");

  const typeId = selectedTypeId || types[0]?.id || "task";
  const typeFields = fields[typeId] || [];
  const typeOptions = options[typeId] || {};

  // Get the first board view or create a default
  const boardView = views.find((v) => v.viewtype === "board") || {
    columns: "status",
    cardfields: "title,priority",
  };

  const cardFields = boardView.cardfields?.split(",").filter(Boolean) || [
    "title",
  ];
  const columnField = boardView.columns || "status";
  const columnOptions = typeOptions[columnField] || [];

  const renderFieldValue = (field: ProjectField, value: string) => {
    if (!value) return null;

    if (field.fieldtype === "enumerated") {
      const fieldOpts = typeOptions[field.id] || [];
      const opt = fieldOpts.find((o) => o.id === value);
      if (opt) {
        return (
          <span className="inline-flex items-center gap-1">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: opt.colour }}
            />
            <span className="text-xs">{opt.name}</span>
          </span>
        );
      }
    }

    return <span className="text-xs text-muted-foreground">{value}</span>;
  };

  const renderCard = (card: (typeof SAMPLE_CARDS)[0]) => {
    return (
      <div className="p-3 bg-background border rounded-lg shadow-sm space-y-2">
        <div className="text-xs text-muted-foreground font-mono">
          proj-{card.number}
        </div>
        {cardFields.map((fieldId) => {
          const field = typeFields.find((f) => f.id === fieldId);
          if (!field) return null;
          const value = card.values[fieldId as keyof typeof card.values];
          if (!value) return null;

          if (fieldId === "title") {
            return (
              <div key={fieldId} className="font-medium text-sm">
                {value}
              </div>
            );
          }

          return <div key={fieldId}>{renderFieldValue(field, value)}</div>;
        })}
      </div>
    );
  };

  const renderBoardPreview = () => {
    if (columnOptions.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-8">
          Add options to the "{columnField}" field to see board columns
        </div>
      );
    }

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnOptions.slice(0, 4).map((opt) => (
          <div
            key={opt.id}
            className="w-64 shrink-0 bg-muted/50 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: opt.colour }}
              />
              <span className="font-medium text-sm">{opt.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {
                  SAMPLE_CARDS.filter(
                    (c) =>
                      c.values[columnField as keyof typeof c.values] === opt.id,
                  ).length
                }
              </span>
            </div>
            <div className="space-y-2">
              {SAMPLE_CARDS.filter(
                (c) =>
                  c.values[columnField as keyof typeof c.values] === opt.id,
              ).map((card) => (
                <div key={card.id}>{renderCard(card)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCardPreview = () => {
    const card = SAMPLE_CARDS[0];
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-background border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-muted-foreground">
              proj-{card.number}
            </span>
          </div>
          {typeFields.map((field) => {
            const value = card.values[field.id as keyof typeof card.values];
            return (
              <div key={field.id} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {field.name}
                  {field.required === 1 && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </label>
                <div className="text-sm">
                  {renderFieldValue(field, value || "") || (
                    <span className="text-muted-foreground italic">Empty</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b">
        <span className="text-sm font-medium">Preview:</span>
        {(["board", "card"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setPreviewMode(mode)}
            className={cn(
              "px-2 py-1 text-sm rounded",
              previewMode === mode
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-auto bg-muted/30">
        {previewMode === "board" && renderBoardPreview()}
        {previewMode === "card" && renderCardPreview()}
      </div>
    </div>
  );
}
