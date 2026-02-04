// Mochi Projects: Add dialogs for design editor
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@mochi/common";

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
  onAdd: (name: string) => void;
}

export function AddClassDialog({
  open,
  onOpenChange,
  onAdd,
}: AddClassDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add class</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Name</Label>
              <Input
                id="class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Task, Bug, Epic"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add field</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Name</Label>
              <Input
                id="field-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Title, Status, Priority"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-type">Type</Label>
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
            {fieldtype === "text" && (
              <div className="space-y-2">
                <Label htmlFor="field-rows">Rows</Label>
                <Input
                  id="field-rows"
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                />
                <p className={`text-xs text-muted-foreground ${rows === 1 ? "" : "invisible"}`}>
                  Single line of text only
                </p>
              </div>
            )}
            {fieldtype === "enumerated" && (
              <div className="space-y-2">
                <Label>Options</Label>
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
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || (fieldtype === "enumerated" && options.length === 0)}
            >
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), colour);
      setName("");
      setColour(
        DEFAULT_COLOURS[Math.floor(Math.random() * DEFAULT_COLOURS.length)],
      );
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="option-name">Name</Label>
              <Input
                id="option-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., To do, In progress, Done"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Colour</Label>
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
            <div className="flex items-center gap-2">
              <span
                className="size-4 rounded-full"
                style={{ backgroundColor: colour }}
              />
              <span className="text-sm">Preview: {name || "Option name"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add View Dialog
interface AddViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, viewtype: string) => void;
}

export function AddViewDialog({
  open,
  onOpenChange,
  onAdd,
}: AddViewDialogProps) {
  const [name, setName] = useState("");
  const [viewtype, setViewtype] = useState("board");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), viewtype);
      setName("");
      setViewtype("board");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add view</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Board, Sprint View"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-type">Type</Label>
              <select
                id="view-type"
                value={viewtype}
                onChange={(e) => setViewtype(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="board">Board</option>
                <option value="tree">Tree</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
