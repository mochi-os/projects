// Mochi Projects: Activity list component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { EntityActivityList, type EntityField } from "@mochi/web";
import projectsApi from "@/api/projects";

interface ActivityListProps {
  projectId: string;
  objectId: string;
  fields?: EntityField[];
}

export function ActivityList({ projectId, objectId, fields }: ActivityListProps) {
  return (
    <EntityActivityList
      containerId={projectId}
      objectId={objectId}
      fields={fields}
      listActivity={projectsApi.listActivity}
    />
  );
}
