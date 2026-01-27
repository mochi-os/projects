import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
  getErrorMessage,
  RadioGroup,
  RadioGroupItem,
} from '@mochi/common'
import { FolderKanban, Plus } from 'lucide-react'
import projectsApi from '@/api/projects'
import { useProjectsStore } from '@/stores/projects-store'
import type { ProjectTemplate } from '@/types'

interface CreateProjectDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  hideTrigger,
}: CreateProjectDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('simple')
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const navigate = useNavigate()
  const refreshProjects = useProjectsStore((state) => state.refresh)

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingTemplates(true)
      projectsApi
        .templates()
        .then((response) => {
          setTemplates(response.data?.templates ?? [])
        })
        .catch((error) => {
          console.error('[CreateProjectDialog] Failed to load templates', error)
        })
        .finally(() => {
          setIsLoadingTemplates(false)
        })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!selectedTemplate) {
      toast.error('Please select a template')
      return
    }

    setIsPending(true)
    try {
      const response = await projectsApi.create({
        name: name.trim(),
        template: selectedTemplate,
        privacy: 'private',
      })

      const fingerprint = response.data?.fingerprint
      await refreshProjects()

      toast.success('Project created')
      onOpenChange?.(false)
      setName('')
      setSelectedTemplate('simple')

      if (fingerprint) {
        void navigate({ to: '/$projectId', params: { projectId: fingerprint } })
      } else {
        void navigate({ to: '/' })
      }
    } catch (error) {
      console.error('[CreateProjectDialog] Failed to create project', error)
      toast.error(getErrorMessage(error, 'Failed to create project'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            New project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <FolderKanban className="size-4" />
              </div>
              Create project
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My project"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              {isLoadingTemplates ? (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  Loading templates...
                </div>
              ) : (
                <RadioGroup
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  className="gap-3"
                >
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start space-x-3"
                    >
                      <RadioGroupItem
                        value={template.id}
                        id={template.id}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={template.id}
                        className="flex cursor-pointer flex-col gap-1 font-normal"
                      >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {template.description}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedTemplate}>
              {isPending ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
