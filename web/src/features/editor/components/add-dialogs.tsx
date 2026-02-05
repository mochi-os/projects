// Mochi Projects: Add dialogs for design editor
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  SortDirectionButton,
} from "@mochi/common";
import { Check, Plus, X } from "lucide-react";
import type { ProjectField, ProjectClass } from "@/types";

const DEFAULT_COLOURS = [
  "#94a3b8",
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
];

// Add Class Dialog
interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ProjectClass[];
  onAdd: (name: string, parents: string[]) => void;
}

export function AddClassDialog({
  open,
  onOpenChange,
  classes,
  onAdd,
}: AddClassDialogProps) {
  const [name, setName] = useState("");
  const [parents, setParents] = useState<string[]>([]);

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), parents);
      setName("");
      setParents([]);
      onOpenChange(false);
    }
  };

  const toggleParent = (classId: string) => {
    if (parents.includes(classId)) {
      setParents(parents.filter((p) => p !== classId));
    } else {
      setParents([...parents, classId]);
    }
  };

  const handleClose = () => {
    setName("");
    setParents([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <SheetTitle>Add class</SheetTitle>
          <Button variant="ghost" size="icon" className="size-8" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Name</Label>
            <div className="pl-4">
              <Input
                id="class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Task, Bug, Epic"
                autoFocus
              />
            </div>
          </div>

          {classes.length > 0 && (
            <div className="space-y-2">
              <Label>Can be child of</Label>
              <div className="pl-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select which classes this can be nested under
                </p>
                <div className="space-y-1">
                  {classes.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={parents.includes(c.id)}
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
        </div>
        <SheetFooter className="px-6 py-4 border-t">
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Check className="size-4" />
            Add class
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Add Field Dialog
interface PendingOption {
  id: string;
  name: string;
  colour: string;
}

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, fieldtype: string, rows?: number, options?: PendingOption[]) => void;
}

const FIELD_TYPES = [
  { id: "checkbox", name: "Checkbox" },
  { id: "checklist", name: "Checklist" },
  { id: "date", name: "Date" },
  { id: "number", name: "Number" },
  { id: "enumerated", name: "Select" },
  { id: "text", name: "Text" },
  { id: "user", name: "User" },
];

export function AddFieldDialog({
  open,
  onOpenChange,
  onAdd,
}: AddFieldDialogProps) {
  const [name, setName] = useState("");
  const [fieldtype, setFieldtype] = useState("text");
  const [rows, setRows] = useState(1);
  const [options, setOptions] = useState<PendingOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");

  const resetForm = () => {
    setName("");
    setFieldtype("text");
    setRows(1);
    setOptions([]);
    setNewOptionName("");
  };

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(
        name.trim(),
        fieldtype,
        fieldtype === "text" && rows > 1 ? rows : undefined,
        fieldtype === "enumerated" ? options : undefined
      );
      resetForm();
      onOpenChange(false);
    }
  };

  const addOption = () => {
    if (newOptionName.trim()) {
      setOptions([
        ...options,
        {
          id: crypto.randomUUID(),
          name: newOptionName.trim(),
          colour: DEFAULT_COLOURS[options.length % DEFAULT_COLOURS.length],
        },
      ]);
      setNewOptionName("");
    }
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <SheetTitle>Add field</SheetTitle>
          <Button variant="ghost" size="icon" className="size-8" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">Name</Label>
            <div className="pl-4">
              <Input
                id="field-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Title, Status, Priority"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <div className="pl-4">
              <select
                id="field-type"
                value={fieldtype}
                onChange={(e) => setFieldtype(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {fieldtype === "text" && (
            <div className="space-y-2">
              <Label htmlFor="field-rows">Rows</Label>
              <div className="pl-4">
                <Input
                  id="field-rows"
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                />
                <p className={`text-xs text-muted-foreground mt-1 ${rows === 1 ? "" : "invisible"}`}>
                  Single line of text only
                </p>
              </div>
            </div>
          )}
          {fieldtype === "enumerated" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="pl-4 space-y-2">
                {options.length > 0 && (
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: opt.colour }}
                          />
                          <span className="text-sm">{opt.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(opt.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    placeholder="Option name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    disabled={!newOptionName.trim()}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="px-6 py-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || (fieldtype === "enumerated" && options.length === 0)}
          >
            <Check className="size-4" />
            Add field
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Add Option Dialog
interface AddOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, colour: string) => void;
  title?: string;
}

export function AddOptionDialog({
  open,
  onOpenChange,
  onAdd,
  title = "Add option",
}: AddOptionDialogProps) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(DEFAULT_COLOURS[0]);

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), colour);
      setName("");
      setColour(
        DEFAULT_COLOURS[Math.floor(Math.random() * DEFAULT_COLOURS.length)],
      );
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setName("");
    setColour(DEFAULT_COLOURS[0]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <Button variant="ghost" size="icon" className="size-8" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="option-name">Name</Label>
            <div className="pl-4">
              <Input
                id="option-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., To do, In progress, Done"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="pl-4">
              <div className="flex gap-2">
                {DEFAULT_COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-8 rounded-full border-2 ${
                      colour === c ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColour(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: colour }}
            />
            <span className="text-sm">Preview: {name || "Option name"}</span>
          </div>
        </div>
        <SheetFooter className="px-6 py-4 border-t">
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Check className="size-4" />
            Add option
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Add View Dialog
interface AddViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ProjectField[];
  classes: ProjectClass[];
  onAdd: (
    name: string,
    viewtype: string,
    columns: string,
    rows: string,
    selectedFields: string[],
    sort: string,
    direction: string,
    selectedClasses: string[]
  ) => void;
}

export function AddViewDialog({
  open,
  onOpenChange,
  fields,
  classes,
  onAdd,
}: AddViewDialogProps) {
  const [name, setName] = useState("");
  const [viewtype, setViewtype] = useState("board");
  const [columns, setColumns] = useState("");
  const [rows, setRows] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sort, setSort] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const enumeratedFields = fields.filter((f) => f.fieldtype === "enumerated");

  // Initialize defaults when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Set defaults
      setSelectedFields(fields.map((f) => f.id));
      setSelectedClasses(classes.map((c) => c.id));
      if (enumeratedFields.length > 0 && !columns) {
        setColumns(enumeratedFields[0].id);
      }
    } else {
      // Reset form
      setName("");
      setViewtype("board");
      setColumns("");
      setRows("");
      setSelectedFields([]);
      setSort("");
      setDirection("asc");
      setSelectedClasses([]);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(
        name.trim(),
        viewtype,
        columns,
        rows,
        selectedFields,
        sort,
        direction,
        selectedClasses
      );
      handleOpenChange(false);
    }
  };

  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const toggleClass = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter((c) => c !== classId));
    } else {
      setSelectedClasses([...selectedClasses, classId]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <SheetTitle>Add view</SheetTitle>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Name</Label>
            <div className="pl-4">
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Board, Sprint View"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Layout</Label>
            <div className="pl-4">
              <RadioGroup value={viewtype} onValueChange={setViewtype}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="board" id="add-vt-board" />
                  <Label htmlFor="add-vt-board" className="font-normal cursor-pointer">
                    Board
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="tree" id="add-vt-tree" />
                  <Label htmlFor="add-vt-tree" className="font-normal cursor-pointer">
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

          {viewtype === "board" && enumeratedFields.length > 0 && (
            <div className="space-y-2">
              <Label>Columns group by</Label>
              <div className="pl-4">
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
            </div>
          )}

          {viewtype === "board" && enumeratedFields.length > 0 && (
            <div className="space-y-2">
              <Label>Rows group by</Label>
              <div className="pl-4">
                <select
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
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
                    checked={selectedFields.includes(field.id)}
                    onChange={() => toggleField(field.id)}
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
                direction={direction}
                onToggle={() => setDirection(direction === "asc" ? "desc" : "asc")}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="px-6 py-4 border-t">
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Check className="size-4" />
            Add view
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
