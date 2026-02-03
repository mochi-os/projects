// Mochi Projects: Edit dialogs for design editor
// Copyright Alistair Cunningham 2026

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SortDirectionButton,
} from "@mochi/common";
import { MoreHorizontal } from "lucide-react";
import type { ProjectView, ProjectField, ProjectType, FieldOption } from "@/types";

// Edit View Dialog
interface EditViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: ProjectView | null;
  fields: ProjectField[];
  types: ProjectType[];
  onUpdate: (updates: Partial<ProjectView>) => void;
  onUpdateTypes: (types: string[]) => void;
  onDelete: () => void;
}

export function EditViewDialog({
  open,
  onOpenChange,
  view,
  fields,
  types,
  onUpdate,
  onUpdateTypes,
  onDelete,
}: EditViewDialogProps) {
  const allTypeIds = useMemo(() => types.map((t) => t.id), [types]);

  const [name, setName] = useState("");
  const [viewtype, setViewtype] = useState("board");
  const [columns, setColumns] = useState("");
  const [cardfields, setCardfields] = useState("");
  const [sort, setSort] = useState("");
  const [direction, setDirection] = useState("asc");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (view) {
      setName(view.name);
      setViewtype(view.viewtype);
      setColumns(view.columns);
      setCardfields(view.cardfields || "");
      setSort(view.sort);
      setDirection(view.direction);
      setSelectedTypes(view.types?.length ? view.types : allTypeIds);
    }
  }, [view, allTypeIds]);

  if (!view) return null;

  const handleSave = () => {
    if (name.trim() && name !== view.name) {
      onUpdate({ name: name.trim() });
    }
    if (viewtype !== view.viewtype) {
      onUpdate({ viewtype });
    }
    if (columns !== view.columns) {
      onUpdate({ columns });
    }
    if (cardfields !== (view.cardfields || "")) {
      onUpdate({ cardfields });
    }
    if (sort !== view.sort) {
      onUpdate({ sort });
    }
    if (direction !== view.direction) {
      onUpdate({ direction });
    }
    // Check if types changed
    const currentTypes = view.types?.length ? view.types : allTypeIds;
    if (JSON.stringify(selectedTypes.sort()) !== JSON.stringify(currentTypes.sort())) {
      onUpdateTypes(selectedTypes);
    }
    onOpenChange(false);
  };

  const toggleCardField = (fieldId: string) => {
    const currentFields = cardfields.split(",").filter(Boolean);
    if (currentFields.includes(fieldId)) {
      setCardfields(currentFields.filter((f) => f !== fieldId).join(","));
    } else {
      setCardfields([...currentFields, fieldId].join(","));
    }
  };

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const cardfieldsList = cardfields.split(",").filter(Boolean);
  const enumeratedFields = fields.filter((f) => f.fieldtype === "enumerated");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Edit view</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Delete view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Layout</Label>
            <RadioGroup value={viewtype} onValueChange={setViewtype}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="board" id="vt-board" />
                <Label htmlFor="vt-board" className="font-normal cursor-pointer">
                  Board
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="tree" id="vt-tree" />
                <Label htmlFor="vt-tree" className="font-normal cursor-pointer">
                  Tree
                </Label>
              </div>
            </RadioGroup>
          </div>

          {types.length > 1 && (
            <div className="space-y-2">
              <Label>Show types</Label>
              <div className="space-y-1">
                {types.map((type) => (
                  <label
                    key={type.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                      className="rounded"
                    />
                    {type.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {viewtype === "board" && enumeratedFields.length > 0 && (
            <div className="space-y-2">
              <Label>Group by (columns)</Label>
              <select
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {enumeratedFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fields on card</Label>
            <div className="space-y-1">
              {fields.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={cardfieldsList.includes(field.id)}
                    onChange={() => toggleCardField(field.id)}
                    className="rounded"
                  />
                  {field.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default sort</Label>
            <div className="flex gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">None</option>
                <option value="created">Created</option>
                <option value="number">Number</option>
                <option value="updated">Updated</option>
                {[...fields].sort((a, b) => a.name.localeCompare(b.name)).map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
              <SortDirectionButton
                direction={direction as "asc" | "desc"}
                onToggle={() => setDirection(direction === "asc" ? "desc" : "asc")}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Type Dialog
interface EditTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ProjectType | null;
  types: ProjectType[];
  hierarchy: string[];
  fields: ProjectField[];
  onUpdate: (name: string) => void;
  onUpdateHierarchy: (parents: string[]) => void;
  onDelete: () => void;
  onAddField: () => void;
  onEditField: (field: ProjectField) => void;
}

export function EditTypeDialog({
  open,
  onOpenChange,
  type,
  types,
  hierarchy,
  fields,
  onUpdate,
  onUpdateHierarchy,
  onDelete,
  onAddField,
  onEditField,
}: EditTypeDialogProps) {
  const [name, setName] = useState("");
  const [parents, setParents] = useState<string[]>([]);

  useEffect(() => {
    if (type) {
      setName(type.name);
      setParents(hierarchy);
    }
  }, [type, hierarchy]);

  if (!type) return null;

  const handleSave = () => {
    if (name.trim() && name !== type.name) {
      onUpdate(name.trim());
    }
    if (JSON.stringify(parents.sort()) !== JSON.stringify(hierarchy.sort())) {
      onUpdateHierarchy(parents);
    }
    onOpenChange(false);
  };

  const toggleParent = (parentId: string) => {
    if (parents.includes(parentId)) {
      setParents(parents.filter((p) => p !== parentId));
    } else {
      setParents([...parents, parentId]);
    }
  };

  const otherTypes = types.filter((t) => t.id !== type.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Edit type</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Delete type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type-name">Name</Label>
            <Input
              id="type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {otherTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Can be child of</Label>
              <p className="text-xs text-muted-foreground">
                Select which types this can be nested under
              </p>
              <div className="space-y-1">
                {otherTypes.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={parents.includes(t.id)}
                      onChange={() => toggleParent(t.id)}
                      className="rounded"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fields</Label>
            <div className="space-y-1">
              {fields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => onEditField(field)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors border"
                >
                  <span>{field.name}</span>
                  <span className="text-muted-foreground ml-2 capitalize">
                    ({field.fieldtype})
                  </span>
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onAddField}>
              Add field
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Field Dialog
interface EditFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: ProjectField | null;
  options: FieldOption[];
  onUpdate: (updates: Partial<ProjectField>) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onEditOption: (option: FieldOption) => void;
  onDeleteOption: (optionId: string) => void;
  onReorderOptions: (order: string[]) => void;
}

export function EditFieldDialog({
  open,
  onOpenChange,
  field,
  options,
  onUpdate,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
}: EditFieldDialogProps) {
  const [name, setName] = useState("");
  const [required, setRequired] = useState(false);
  const [card, setCard] = useState(false);

  useEffect(() => {
    if (field) {
      setName(field.name);
      setRequired(field.required === 1);
      setCard(field.card === 1);
    }
  }, [field]);

  if (!field) return null;

  const handleSave = () => {
    const updates: Partial<ProjectField> = {};
    if (name.trim() && name !== field.name) {
      updates.name = name.trim();
    }
    if ((required ? 1 : 0) !== field.required) {
      updates.required = required ? 1 : 0;
    }
    if ((card ? 1 : 0) !== field.card) {
      updates.card = card ? 1 : 0;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    onOpenChange(false);
  };

  const isSystemField = field.id === "title";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Edit field</DialogTitle>
          {!isSystemField && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  Delete field
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">Name</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystemField}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <p className="text-sm text-muted-foreground capitalize">{field.fieldtype}</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded"
                disabled={isSystemField}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={card}
                onChange={(e) => setCard(e.target.checked)}
                className="rounded"
              />
              Show on card by default
            </label>
          </div>

          {field.fieldtype === "enumerated" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-1">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: opt.colour }}
                      />
                      <span className="text-sm">{opt.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditOption(opt)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteOption(opt.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onAddOption}>
                Add option
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Option Dialog
interface EditOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: FieldOption | null;
  onUpdate: (updates: { name?: string; colour?: string }) => void;
  onDelete: () => void;
}

const DEFAULT_COLOURS = [
  "#94a3b8",
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#4ade80",
  "#2dd4bf",
  "#22d3d8",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

export function EditOptionDialog({
  open,
  onOpenChange,
  option,
  onUpdate,
  onDelete,
}: EditOptionDialogProps) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(DEFAULT_COLOURS[0]);

  useEffect(() => {
    if (option) {
      setName(option.name);
      setColour(option.colour);
    }
  }, [option]);

  if (!option) return null;

  const handleSave = () => {
    const updates: { name?: string; colour?: string } = {};
    if (name.trim() && name !== option.name) {
      updates.name = name.trim();
    }
    if (colour !== option.colour) {
      updates.colour = colour;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Edit option</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Delete option
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="option-name">Name</Label>
            <Input
              id="option-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-8 rounded-full border-2 ${
                    colour.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColour(c)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="size-6 rounded-full border"
                style={{ backgroundColor: colour }}
              />
              <Input
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: colour }}
            />
            <span className="text-sm">Preview: {name || "Option name"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
