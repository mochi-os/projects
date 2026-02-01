// Mochi Projects: Create object dialog component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ObjectTemplate } from "@/types";

interface CreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string; // Used for query cache key (matches URL param)
  project: ProjectDetails;
  templates: ObjectTemplate[];
  defaultStatus?: string;
  onCreated?: (id: string, number: number, readable: string) => void;
}

interface FormValues {
  title: string;
  type: string;
  template: string;
}

export function CreateObjectDialog({
  open,
  onOpenChange,
  projectId,
  project,
  templates,
  defaultStatus,
  onCreated,
}: CreateObjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      type: project.types[0]?.id || "",
      template: "blank",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Create the object
      const response = await projectsApi.createObject(project.project.id, {
        type: values.type,
        title: values.title || undefined,
        template: values.template !== "blank" ? values.template : undefined,
      });

      // If we have a default status and the type has a status field, set it
      const typeFields = project.fields[values.type] || [];
      const hasStatusField = typeFields.some((f) => f.id === "status");
      if (defaultStatus && response.data.id && hasStatusField) {
        await projectsApi.setValue(
          project.project.id,
          response.data.id,
          "status",
          defaultStatus,
        );
      }

      return {
        ...response.data,
        status: hasStatusField ? defaultStatus : undefined,
        title: values.title,
        type: values.type,
      };
    },
    onSuccess: (data) => {
      // Add new object to cache immediately for instant UI update
      const newObject = {
        id: data.id,
        project: project.project.id,
        type: data.type,
        number: data.number,
        parent: "",
        rank: 999999, // Temporary high rank, will be corrected on refetch
        created: Math.floor(Date.now() / 1000),
        updated: Math.floor(Date.now() / 1000),
        values: {
          title: data.title || "",
          status: data.status || "",
        },
      };
      queryClient.setQueryData(
        ["objects", projectId],
        (old: Array<{ id: string; values: Record<string, string> }> | undefined) => {
          return old ? [...old, newObject] : [newObject];
        },
      );
      // Also invalidate to get full data from server
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
      onCreated?.(data.id, data.number, data.readable);
      form.reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (values: FormValues) => {
    setError(null);
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <DialogHeader className="flex-row items-center gap-3 space-y-0">
            <DialogTitle className="shrink-0">New:</DialogTitle>
            {templates.length > 1 && (
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...templates]
                          .sort((a, b) => {
                            // Keep "Blank" first, then sort alphabetically
                            if (a.id === "blank") return -1;
                            if (b.id === "blank") return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {project.types.length > 1 && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {project.types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
