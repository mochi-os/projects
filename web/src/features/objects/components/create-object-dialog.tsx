// Mochi Projects: Create object dialog component
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  defaultField?: { field: string; value: string };
  onCreated?: (id: string, number: number, readable: string) => void;
}

export function CreateObjectDialog({
  open,
  onOpenChange,
  projectId,
  project,
  defaultField,
  onCreated,
}: CreateObjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(project.types[0]?.id || "");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [parent, setParent] = useState("");
  const queryClient = useQueryClient();

  // Reset state when dialog opens/closes or type changes
  useEffect(() => {
    if (open) {
      const initialType = project.types[0]?.id || "";
      setSelectedType(initialType);
      setParent("");
      setError(null);
      // Initialize field values with defaults
      const initialValues: Record<string, string> = {};
      if (defaultField) {
        initialValues[defaultField.field] = defaultField.value;
      }
      setFieldValues(initialValues);
    }
  }, [open, project.types, defaultField]);

  // Update default field value when type changes (if field exists in new type)
  useEffect(() => {
    if (defaultField && selectedType) {
      const typeFields = project.fields[selectedType] || [];
      const hasField = typeFields.some((f) => f.id === defaultField.field);
      if (hasField) {
        setFieldValues((prev) => ({
          ...prev,
          [defaultField.field]: defaultField.value,
        }));
      }
    }
  }, [selectedType, defaultField, project.fields]);

  // Load objects for parent selection
  const { data: objectsData } = useQuery({
    queryKey: ["objects", projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(project.project.id);
      return response.data.objects;
    },
  });

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
  const typeFields = useMemo(() => {
    return project.fields[selectedType] || [];
  }, [project.fields, selectedType]);

  const typeOptions = useMemo(() => {
    return project.options[selectedType] || {};
  }, [project.options, selectedType]);

  // Filter objects to only show valid parents based on hierarchy rules
  const validParentOptions = useMemo(() => {
    if (!objectsData || !selectedType) return [];

    const allowedParentTypes = project.hierarchy[selectedType] || [];
    const parentTypeIds = allowedParentTypes.filter((t) => t !== "");

    if (parentTypeIds.length === 0) return [];

    return objectsData.filter((obj) => parentTypeIds.includes(obj.type));
  }, [objectsData, selectedType, project.hierarchy]);

  // Build type name map
  const typeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of project.types) {
      map[t.id] = t.name;
    }
    return map;
  }, [project.types]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create the object
      const response = await projectsApi.createObject(project.project.id, {
        type: selectedType,
        title: fieldValues.title || undefined,
        parent: parent || undefined,
      });

      // Set all field values
      const objectId = response.data.id;
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        if (fieldId !== "title" && value) {
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
        type: selectedType,
        number: data.number,
        parent: data.parent || "",
        rank: 999999,
        created: Math.floor(Date.now() / 1000),
        updated: Math.floor(Date.now() / 1000),
        values: { ...fieldValues },
      };
      queryClient.setQueryData(
        ["objects", projectId],
        (old: Array<{ id: string; values: Record<string, string> }> | undefined) => {
          return old ? [...old, newObject] : [newObject];
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

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    setParent("");
    // Reset field values but keep defaults if applicable
    const newValues: Record<string, string> = {};
    if (defaultField) {
      const newTypeFields = project.fields[newType] || [];
      if (newTypeFields.some((f) => f.id === defaultField.field)) {
        newValues[defaultField.field] = defaultField.value;
      }
    }
    setFieldValues(newValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            New
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-auto h-auto py-0.5 px-2 text-lg font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {project.types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Parent picker */}
          <div className={validParentOptions.length === 0 ? "hidden" : "grid grid-cols-[100px_1fr] gap-4 items-start"}>
            <label className="text-sm font-medium text-muted-foreground pt-2">
              Parent
            </label>
            <Select
              value={parent || "_none_"}
              onValueChange={(v) => setParent(v === "_none_" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None</SelectItem>
                {validParentOptions.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {typeNameMap[obj.type] || obj.type}: {obj.values.title || `${project.project.prefix}-${obj.number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic fields based on selected type */}
          {typeFields
            .filter((f) => !["repository", "source_branch", "target_branch"].includes(f.id))
            .map((field) => (
              <div key={field.id} className="grid grid-cols-[100px_1fr] gap-4 items-start">
                <label className="text-sm font-medium text-muted-foreground pt-2">
                  {field.name}
                  {field.required === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
                <FieldEditor
                  field={field}
                  value={fieldValues[field.id] || ""}
                  options={typeOptions[field.id] || []}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  disabled={createMutation.isPending}
                  hideLabel
                  localPeople={peopleData}
                />
              </div>
            ))}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="size-4 mr-1" />
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
