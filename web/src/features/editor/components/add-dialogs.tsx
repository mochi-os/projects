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
interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, fieldtype: string) => void;
}

const FIELD_TYPES = [
  { id: "text", name: "Text" },
  { id: "number", name: "Number" },
  { id: "date", name: "Date" },
  { id: "enumerated", name: "Select" },
  { id: "user", name: "User" },
  { id: "checkbox", name: "Checkbox" },
  { id: "checklist", name: "Checklist" },
];

export function AddFieldDialog({
  open,
  onOpenChange,
  onAdd,
}: AddFieldDialogProps) {
  const [name, setName] = useState("");
  const [fieldtype, setFieldtype] = useState("text");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), fieldtype);
      setName("");
      setFieldtype("text");
      onOpenChange(false);
    }
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

// Add Option Dialog
interface AddOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, colour: string) => void;
  title?: string;
}

const DEFAULT_COLOURS = [
  "#94a3b8",
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
];

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
