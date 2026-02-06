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
import type { ProjectView, ProjectField, ProjectClass, FieldOption } from "@/types";

// Edit View Dialog
interface EditViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: ProjectView | null;
  fields: ProjectField[];
  classes: ProjectClass[];
  onUpdate: (updates: Partial<ProjectView>) => void;
  onUpdateClasses: (classes: string[]) => void;
  onDelete: () => void;
}

export function EditViewDialog({
  open,
  onOpenChange,
  view,
  fields,
  classes,
  onUpdate,
  onUpdateClasses,
  onDelete,
}: EditViewDialogProps) {
  const allClassIds = useMemo(() => classes.map((c) => c.id), [classes]);

  const [name, setName] = useState("");
  const [viewtype, setViewtype] = useState("board");
  const [columns, setColumns] = useState("");
  const [viewFields, setViewFields] = useState("");
  const [sort, setSort] = useState("");
  const [direction, setDirection] = useState("asc");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  useEffect(() => {
    if (view) {
      setName(view.name);
      setViewtype(view.viewtype);
      setColumns(view.columns);
      setViewFields(view.fields || "");
      setSort(view.sort);
      setDirection(view.direction);
      setSelectedClasses(view.classes?.length ? view.classes : allClassIds);
    }
  }, [view, allClassIds]);

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
    if (viewFields !== (view.fields || "")) {
      onUpdate({ fields: viewFields });
    }
    if (sort !== view.sort) {
      onUpdate({ sort });
    }
    if (direction !== view.direction) {
      onUpdate({ direction });
    }
    // Check if classes changed
    const currentClasses = view.classes?.length ? view.classes : allClassIds;
    if (JSON.stringify(selectedClasses.sort()) !== JSON.stringify(currentClasses.sort())) {
      onUpdateClasses(selectedClasses);
    }
    onOpenChange(false);
  };

  const toggleViewField = (fieldId: string) => {
    const currentFields = viewFields.split(",").filter(Boolean);
    if (currentFields.includes(fieldId)) {
      setViewFields(currentFields.filter((f) => f !== fieldId).join(","));
    } else {
      setViewFields([...currentFields, fieldId].join(","));
    }
  };

  const toggleClass = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter((c) => c !== classId));
    } else {
      setSelectedClasses([...selectedClasses, classId]);
    }
  };

  const viewFieldsList = viewFields.split(",").filter(Boolean);
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

          {classes.length > 1 && (
            <div className="space-y-2">
              <Label>Show classes</Label>
              <div className="space-y-1">
                {classes.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => toggleClass(cls.id)}
                      className="rounded"
                    />
                    {cls.name}
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
                    checked={viewFieldsList.includes(field.id)}
                    onChange={() => toggleViewField(field.id)}
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

// Edit Class Dialog
interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cls: ProjectClass | null;
  classes: ProjectClass[];
  hierarchy: string[];
  fields: ProjectField[];
  onUpdate: (name: string) => void;
  onUpdateHierarchy: (parents: string[]) => void;
  onDelete: () => void;
  onAddField: () => void;
  onEditField: (field: ProjectField) => void;
}

export function EditClassDialog({
  open,
  onOpenChange,
  cls,
  classes,
  hierarchy,
  fields,
  onUpdate,
  onUpdateHierarchy,
  onDelete,
  onAddField,
  onEditField,
}: EditClassDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (cls) {
      setName(cls.name);
    }
  }, [cls]);

  if (!cls) return null;

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== cls.name) {
      onUpdate(name.trim());
    }
  };

  const toggleParent = (parentId: string) => {
    const newParents = hierarchy.includes(parentId)
      ? hierarchy.filter((p) => p !== parentId)
      : [...hierarchy, parentId];
    onUpdateHierarchy(newParents);
  };

  const otherClasses = classes.filter((c) => c.id !== cls.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Edit class</DialogTitle>
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
                Delete class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
            />
          </div>

          {otherClasses.length > 0 && (
            <div className="space-y-2">
              <Label>Can be child of</Label>
              <p className="text-xs text-muted-foreground">
                Select which classes this can be nested under
              </p>
              <div className="space-y-1">
                {otherClasses.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={hierarchy.includes(c.id)}
                      onChange={() => toggleParent(c.id)}
                      className="rounded"
                    />
                    {c.name}
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
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
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
  const [rows, setRows] = useState(1);

  useEffect(() => {
    if (field) {
      setName(field.name);
      setRows(field.rows || 1);
    }
  }, [field]);

  if (!field) return null;

  const isSystemField = field.id === "title";

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== field.name) {
      onUpdate({ name: name.trim() });
    }
  };

  const handleRowsBlur = () => {
    if (field.fieldtype === "text" && rows !== (field.rows || 1)) {
      onUpdate({ rows });
    }
  };

  const handleRequiredChange = (checked: boolean) => {
    onUpdate({ required: checked ? 1 : 0 });
  };

  const handleCardChange = (checked: boolean) => {
    onUpdate({ card: checked ? 1 : 0 });
  };

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
              onBlur={handleNameBlur}
              disabled={isSystemField}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <p className="text-sm text-muted-foreground capitalize">{field.fieldtype}</p>
          </div>

          {field.fieldtype === "text" && (
            <div className="space-y-2">
              <Label htmlFor="field-rows">Rows</Label>
              <Input
                id="field-rows"
                type="number"
                min={1}
                max={20}
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                onBlur={handleRowsBlur}
              />
              <p className={`text-xs text-muted-foreground ${rows === 1 ? "" : "invisible"}`}>
                Single line of text only
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={field.required === 1}
                onChange={(e) => handleRequiredChange(e.target.checked)}
                className="rounded"
                disabled={isSystemField}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={field.card === 1}
                onChange={(e) => handleCardChange(e.target.checked)}
                className="rounded"
              />
              Show by default
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
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
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
    // Always send both name and colour to prevent losing values
    if (name.trim() !== option.name || colour !== option.colour) {
      onUpdate({ name: name.trim(), colour });
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
