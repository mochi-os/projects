// Mochi Projects: Create object dialog component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  toast,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ObjectTemplate, ProjectObject } from "@/types";

interface CreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

      // If we have a default status, set it
      if (defaultStatus && response.data.id) {
        await projectsApi.setValue(
          project.project.id,
          response.data.id,
          "status",
          defaultStatus,
        );
      }

      return response.data;
    },
    onMutate: async (values: FormValues) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["objects", project.project.id],
      });

      // Snapshot the previous value
      const previousObjects = queryClient.getQueryData<ProjectObject[]>([
        "objects",
        project.project.id,
      ]);

      // Generate a temporary ID
      const tempId = `temp-${Date.now()}`;

      // Create optimistic object
      const optimisticObject: ProjectObject = {
        id: tempId,
        project: project.project.id,
        type: values.type,
        number: -1, // Temporary number
        parent: "",
        created: Date.now(),
        updated: Date.now(),
        values: {
          title: values.title || "New Item",
          ...(defaultStatus ? { status: defaultStatus } : {}),
        },
        isOptimistic: true,
      };

      console.log('[Optimistic] Adding temp object:', optimisticObject);
      console.log('[Optimistic] Previous objects count:', previousObjects?.length || 0);

      // Optimistically update to the new value
      queryClient.setQueryData<ProjectObject[]>(
        ["objects", project.project.id],
        (old) => {
          const updated = [...(old || []), optimisticObject];
          console.log('[Optimistic] Updated objects count:', updated.length);
          return updated;
        },
      );

      // Close dialog immediately
      form.reset();
      onOpenChange(false);

      // Return context with rollback info
      return { previousObjects, tempId, values };
    },
    onSuccess: (data, _variables, context) => {
      // Seamlessly swap the temp object with the real one
      queryClient.setQueryData<ProjectObject[]>(
        ["objects", project.project.id],
        (old) => {
          const swapped = old?.map((obj) =>
            obj.id === context?.tempId
              ? {
                  ...obj,
                  id: data.id,
                  number: data.number,
                  readable: data.readable,
                  isOptimistic: false,
                }
              : obj,
          );
          console.log('[Success] Swapped temp ID', context?.tempId, 'with real ID', data.id);
          console.log('[Success] Updated objects:', swapped);
          return swapped;
        },
      );

      // Invalidate in background for consistency
      queryClient.invalidateQueries({
        queryKey: ["objects", project.project.id],
      });
      
      onCreated?.(data.id, data.number, data.readable);
    },
    onError: (err: Error, _variables, context) => {
      // Rollback to previous state
      if (context?.previousObjects) {
        queryClient.setQueryData(
          ["objects", project.project.id],
          context.previousObjects,
        );
      }

      // Show error toast with retry
      const title = context?.values.title || "item";
      toast.error(`We couldn't create '${title}'`, {
        description: err.message,
        action: {
          label: "Retry",
          onClick: () => {
            if (context?.values) {
              createMutation.mutate(context.values);
            }
          },
        },
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    setError(null);
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create item</DialogTitle>
        </DialogHeader>

        <Form {...form}>
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

            {templates.length > 1 && (
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
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
                        {templates.map((template) => (
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
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
