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
import { Check, GripVertical, Minus, MoreHorizontal, Plus } from "lucide-react";
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

  useEffect(() => {
    if (view) {
      setName(view.name);
    }
  }, [view]);

  if (!view) return null;

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== view.name) {
      onUpdate({ name: name.trim() });
    }
  };

  const handleViewtypeChange = (value: string) => {
    if (value !== view.viewtype) {
      onUpdate({ viewtype: value });
    }
  };

  const handleColumnsChange = (value: string) => {
    if (value !== view.columns) {
      onUpdate({ columns: value });
    }
  };

  const handleRowsChange = (value: string) => {
    if (value !== view.rows) {
      onUpdate({ rows: value });
    }
  };

  const handleSortChange = (value: string) => {
    if (value !== view.sort) {
      onUpdate({ sort: value });
    }
  };

  const handleDirectionToggle = () => {
    const newDirection = view.direction === "asc" ? "desc" : "asc";
    onUpdate({ direction: newDirection });
  };

  const toggleViewField = (fieldId: string) => {
    const currentFields = (view.fields || "").split(",").filter(Boolean);
    let newFields: string[];
    if (currentFields.includes(fieldId)) {
      newFields = currentFields.filter((f) => f !== fieldId);
    } else {
      newFields = [...currentFields, fieldId];
    }
    onUpdate({ fields: newFields.join(",") });
  };

  const toggleClass = (classId: string) => {
    const currentClasses = view.classes?.length ? view.classes : allClassIds;
    let newClasses: string[];
    if (currentClasses.includes(classId)) {
      newClasses = currentClasses.filter((c) => c !== classId);
    } else {
      newClasses = [...currentClasses, classId];
    }
    onUpdateClasses(newClasses);
  };

  const viewFieldsList = (view.fields || "").split(",").filter(Boolean);
  const selectedClasses = view.classes?.length ? view.classes : allClassIds;
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
              <DropdownMenuItem onClick={onDelete}>
                <Minus className="size-4" />
                Delete view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Name</Label>
            <div className="pl-4">
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Layout</Label>
            <div className="pl-4">
              <RadioGroup value={view.viewtype} onValueChange={handleViewtypeChange}>
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
          </div>

          {classes.length > 1 && (
            <div className="space-y-2">
              <Label>Show classes</Label>
              <div className="pl-4 space-y-1">
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

          {view.viewtype === "board" && enumeratedFields.length > 0 && (
            <div className="space-y-2">
              <Label>Columns group by</Label>
              <div className="pl-4">
                <select
                  value={view.columns}
                  onChange={(e) => handleColumnsChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {enumeratedFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {view.viewtype === "board" && enumeratedFields.length > 0 && (
            <div className="space-y-2">
              <Label>Rows group by</Label>
              <div className="pl-4">
                <select
                  value={view.rows || ""}
                  onChange={(e) => handleRowsChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">None</option>
                  {enumeratedFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Show fields</Label>
            <div className="pl-4 space-y-1">
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
            <div className="pl-4 flex gap-2">
              <select
                value={view.sort}
                onChange={(e) => handleSortChange(e.target.value)}
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
                direction={view.direction as "asc" | "desc"}
                onToggle={handleDirectionToggle}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            <Check className="size-4" />
            Done
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
  onReorderFields: (order: string[]) => void;
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
  onReorderFields,
}: EditClassDialogProps) {
  const [name, setName] = useState("");
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", fieldId);
  };

  const handleDragEnd = () => {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    if (fieldId !== draggedFieldId) {
      setDragOverFieldId(fieldId);
    }
  };

  const handleDragLeave = () => {
    setDragOverFieldId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    if (!draggedFieldId || draggedFieldId === targetFieldId) return;

    const currentOrder = fields.map((f) => f.id);
    const draggedIndex = currentOrder.indexOf(draggedFieldId);
    const targetIndex = currentOrder.indexOf(targetFieldId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedFieldId);

    onReorderFields(newOrder);
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

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
              <DropdownMenuItem onClick={onDelete}>
                <Minus className="size-4" />
                Delete class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 pr-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Name</Label>
            <div className="pl-4">
              <Input
                id="class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
              />
            </div>
          </div>

          {otherClasses.length > 0 && (
            <div className="space-y-2">
              <Label>Can be child of</Label>
              <div className="pl-4 space-y-2">
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
            </div>
          )}

          <div className="space-y-2">
            <Label>Fields</Label>
            <div className="pl-4 space-y-2">
              <div className="space-y-1">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, field.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, field.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors border cursor-grab ${
                      dragOverFieldId === field.id ? "border-primary bg-primary/10" : ""
                    } ${draggedFieldId === field.id ? "opacity-50" : ""}`}
                  >
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <button
                      type="button"
                      onClick={() => onEditField(field)}
                      className="flex-1 text-left hover:text-primary"
                    >
                      <span>{field.name}</span>
                      <span className="text-muted-foreground ml-2 capitalize">
                        ({field.fieldtype})
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onAddField}>
            <Plus className="size-4" />
            Add field
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            <Check className="size-4" />
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
                <DropdownMenuItem onClick={onDelete}>
                  <Minus className="size-4" />
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
            <Check className="size-4" />
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
              <DropdownMenuItem onClick={onDelete}>
                <Minus className="size-4" />
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
