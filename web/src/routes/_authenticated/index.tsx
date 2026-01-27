import { createFileRoute } from '@tanstack/react-router'
import { GeneralError } from '@mochi/common'
import { ProjectsListPage } from '@/features/projects/pages'

export const Route = createFileRoute('/_authenticated/')({
  component: ProjectsListPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
})
