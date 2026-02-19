// Mochi Projects: Create object dialog component
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import {
  Button,
  Label,
  Sheet,
  SheetContent,
  SheetFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { FieldEditor } from "./field-editor";

interface CreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  project: ProjectDetails;
  defaultFields?: { field: string; value: string }[];
  defaultParent?: string;
  allowedClasses?: string[];
  onCreated?: (id: string, number: number, readable: string) => void;
}

export function CreateObjectDialog({
  open,
  onOpenChange,
  projectId,
  project,
  defaultFields,
  defaultParent,
  allowedClasses,
  onCreated,
}: CreateObjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedType] = useState(project.classes[0]?.id || "");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [parent, setParent] = useState("");
  const queryClient = useQueryClient();

  // Filter classes to those allowed by the current view
  const availableClasses = allowedClasses?.length
    ? project.classes.filter((c) => allowedClasses.includes(c.id))
    : project.classes;

  // Reset state when dialog opens/closes or type changes
  useEffect(() => {
    if (open) {
      const initialType = availableClasses[0]?.id || "";
      setSelectedType(initialType);
      setParent(defaultParent || "");
      setError(null);
      // Initialize field values with defaults
      const initialValues: Record<string, string> = {};
      if (defaultFields) {
        for (const df of defaultFields) {
          initialValues[df.field] = df.value;
        }
      }
      // Auto-select first option for required enumerated fields
      const fields = project.fields[initialType] || [];
      const opts = project.options[initialType] || {};
      for (const f of fields) {
        if (f.fieldtype === "enumerated" && f.flags?.split(",").includes("required") && !initialValues[f.id]) {
          const fieldOpts = opts[f.id] || [];
          if (fieldOpts.length > 0) {
            initialValues[f.id] = fieldOpts[0].id;
          }
        }
      }
      setFieldValues(initialValues);
    }
  }, [open, project.classes, defaultFields, defaultParent]);

  // Update default field values when type changes (if fields exist in new type)
  useEffect(() => {
    if (defaultFields && selectedClass) {
      const classFields = project.fields[selectedClass] || [];
      const updates: Record<string, string> = {};
      for (const df of defaultFields) {
        if (classFields.some((f) => f.id === df.field)) {
          updates[df.field] = df.value;
        }
      }
      if (Object.keys(updates).length > 0) {
        setFieldValues((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [selectedClass, defaultFields, project.fields]);

  // Load objects for parent selection (shares cache with project page)
  const { data: objectListData } = useQuery({
    queryKey: ["objects", projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(project.project.id);
      return response.data;
    },
  });
  const objectsData = objectListData?.objects;

  // Fetch project members for the owner picker
  const { data: peopleData } = useQuery({
    queryKey: ["people", projectId],
    queryFn: async () => {
      const response = await projectsApi.listPeople(projectId);
      return response.data.people;
    },
    staleTime: 60000,
  });

  // Get fields and options for selected type
  const classFields = useMemo(() => {
    return project.fields[selectedClass] || [];
  }, [project.fields, selectedClass]);

  const classOptions = useMemo(() => {
    return project.options[selectedClass] || {};
  }, [project.options, selectedClass]);

  const missingRequired = classFields.some(
    (f) => f.flags?.split(",").includes("required") && !fieldValues[f.id]?.trim(),
  );

  // Get display title for any object using its class's title field
  const objectTitle = (obj: { class: string; number: number; values: Record<string, string> }) => {
    const cls = project.classes.find((c) => c.id === obj.class);
    return (cls?.title ? obj.values[cls.title] : "") || `${project.project.prefix}-${obj.number}`;
  };

  // Filter objects to only show valid parents based on hierarchy rules
  const allowedParentClasses = useMemo(() => {
    return project.hierarchy[selectedClass] || [];
  }, [project.hierarchy, selectedClass]);

  const canBeTopLevel = allowedParentClasses.includes("");
  const parentRequired = !canBeTopLevel && allowedParentClasses.length > 0;

  const validParentOptions = useMemo(() => {
    if (!objectsData || !selectedClass) return [];

    const parentClassIds = allowedParentClasses.filter((t) => t !== "");
    if (parentClassIds.length === 0) return [];

    return objectsData.filter((obj) => parentClassIds.includes(obj.class));
  }, [objectsData, selectedClass, allowedParentClasses]);

  // Get current parent object info
  const currentParent = useMemo(() => {
    if (!parent || !objectsData) return null;
    return objectsData.find((obj) => obj.id === parent);
  }, [parent, objectsData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Find the title field from the class
      const selectedCls = project.classes.find((c) => c.id === selectedClass);
      const titleFieldId = selectedCls?.title;

      // Create the object
      const response = await projectsApi.createObject(project.project.id, {
        class: selectedClass,
        title: titleFieldId ? fieldValues[titleFieldId] || undefined : undefined,
        parent: parent || undefined,
      });

      // Set all field values (skip title — already sent in create call)
      const objectId = response.data.id;
      const validFields = new Set((project.fields[selectedClass] || []).map((f) => f.id));
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        if (fieldId !== titleFieldId && value && validFields.has(fieldId)) {
          await projectsApi.setValue(project.project.id, objectId, fieldId, value);
        }
      }

      return {
        ...response.data,
        fieldValues,
        parent,
      };
    },
    onSuccess: (data) => {
      // Add new object to cache immediately for instant UI update
      const newObject = {
        id: data.id,
        project: project.project.id,
        class: selectedClass,
        number: data.number,
        parent: data.parent || "",
        rank: 999999,
        created: Math.floor(Date.now() / 1000),
        updated: Math.floor(Date.now() / 1000),
        values: { ...fieldValues },
      };
      queryClient.setQueryData(
        ["objects", projectId],
        (old: { objects: Array<{ id: string; values: Record<string, string> }>; watched?: string[] } | undefined) => {
          if (!old) return { objects: [newObject], watched: [] };
          return { ...old, objects: [...old.objects, newObject] };
        },
      );
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
      onCreated?.(data.id, data.number, data.readable);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Auto-select first parent when parent is required, preferring one in the same column
  useEffect(() => {
    if (open && parentRequired && !parent && validParentOptions.length > 0) {
      if (defaultFields && defaultFields.length > 0) {
        const columnParent = validParentOptions.find((obj) =>
          defaultFields.every((df) => obj.values[df.field] === df.value),
        );
        if (columnParent) {
          setParent(columnParent.id);
          return;
        }
      }
      setParent(validParentOptions[0].id);
    }
  }, [open, parentRequired, parent, validParentOptions, defaultFields]);

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    setParent("");
    // Reset field values but keep defaults if applicable
    const newValues: Record<string, string> = {};
    if (defaultFields) {
      const newTypeFields = project.fields[newType] || [];
      for (const df of defaultFields) {
        if (newTypeFields.some((f) => f.id === df.field)) {
          newValues[df.field] = df.value;
        }
      }
    }
    // Auto-select first option for required enumerated fields
    const fields = project.fields[newType] || [];
    const opts = project.options[newType] || {};
    for (const f of fields) {
      if (f.fieldtype === "enumerated" && f.flags?.split(",").includes("required") && !newValues[f.id]) {
        const fieldOpts = opts[f.id] || [];
        if (fieldOpts.length > 0) {
          newValues[f.id] = fieldOpts[0].id;
        }
      }
    }
    setFieldValues(newValues);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose} modal={false}>
      <SheetContent className="w-full sm:max-w-2xl p-0 gap-0 [&>button:last-child]:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Label className="text-xl font-bold">New</Label>
            <Select value={selectedClass} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-auto h-auto py-1 px-2 text-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {availableClasses.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            title="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-6">
              {/* Parent picker */}
              {(validParentOptions.length > 0 || parentRequired) && (
                <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                  <label className="text-sm font-medium text-muted-foreground pt-2">
                    Parent
                  </label>
                  {validParentOptions.length > 0 ? (
                    <Select
                      value={parent || "_none_"}
                      onValueChange={(v) => setParent(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None">
                          {currentParent
                            ? objectTitle(currentParent)
                            : "None"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        {!parentRequired && <SelectItem value="_none_">None</SelectItem>}
                        {validParentOptions.map((obj) => (
                          <SelectItem key={obj.id} value={obj.id}>
                            {objectTitle(obj)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">
                      No {allowedParentClasses.filter((t) => t !== "").map((id) => project.classes.find((c) => c.id === id)?.name || id).join(" or ")} to add to
                    </p>
                  )}
                </div>
              )}

              {/* Dynamic fields based on selected type */}
              {classFields.map((field, index) => {
                  const isFirstTextField = field.fieldtype === "text" && classFields.findIndex((f) => f.fieldtype === "text") === index;
                  return (
                  <div key={field.id} className="grid grid-cols-[120px_1fr] gap-4 items-start">
                    <label className="text-sm font-medium text-muted-foreground pt-2">
                      {field.name}
                    </label>
                    <FieldEditor
                      field={field}
                      value={fieldValues[field.id] || ""}
                      options={classOptions[field.id] || []}
                      onChange={(value) => handleFieldChange(field.id, value)}
                      disabled={createMutation.isPending}
                      autoFocus={isFirstTextField}
                      immediate
                      hideLabel
                      localPeople={peopleData}
                    />
                  </div>
                  );
                })}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t">
            <Button type="submit" disabled={createMutation.isPending || (parentRequired && !parent) || missingRequired}>
              <Check className="size-4" />
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
