// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The object model itself is shared with the crm app — see @mochi/web
// types/entity-object. Only the project container, the request/repository
// integration and the response envelopes are app-specific and defined here.
import type {
  EntityAccess,
  EntityActivity,
  EntityAttachment,
  EntityChecklistItem,
  EntityClass,
  EntityComment,
  EntityField,
  EntityFieldOption,
  EntityObject,
  EntityObjectLink,
  EntityObjectListResponse,
  EntityCommentListResponse,
  EntityActivityListResponse,
  EntityAttachmentListResponse,
  EntityWatcherListResponse,
  EntityLinkListResponse,
  EntitySortState,
  EntityView,
  EntityWatcher,
} from "@mochi/web";

// Project types
export type ProjectAccess = EntityAccess;

export interface Project {
  id: string;
  fingerprint: string;
  name: string;
  description: string;
  prefix: string;
  owner: number;
  ownername: string;
  server: string;
  created: number;
  updated: number;
  // 0 while a freshly-subscribed project's bulk content is still arriving over
  // P2P; 1 once it has landed. The board shows a loading state until then.
  populated: number;
  access: ProjectAccess;
}

// Projects add per-class request settings; the rest of the class is shared.
export interface ProjectClass extends EntityClass {
  requests: string;
}

export type ProjectField = EntityField;
export type FieldOption = EntityFieldOption;
export type ProjectView = EntityView;

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: number;
  classes?: { id: string; name: string }[];
}

export interface ProjectDetails {
  project: Project;
  classes: ProjectClass[];
  fields: Record<string, ProjectField[]>;
  options: Record<string, Record<string, FieldOption[]>>;
  views: ProjectView[];
  hierarchy: Record<string, string[]>;
}

// Object types. Projects issue human-readable identifiers (PROJ-14), so number
// is always present here even though the shared model leaves it optional.
export type ProjectObject = EntityObject & {
  project: string;
  number: number;
};

export type ObjectLink = EntityObjectLink;
export type CommentAttachment = EntityAttachment;
export type Comment = EntityComment;
export type Attachment = EntityAttachment;
export type ChecklistItem = EntityChecklistItem;
export type Activity = EntityActivity;
export type Watcher = EntityWatcher;

export interface RequestData {
  id: string;
  object: string;
  type: string;
  repository: string;
  source: string;
  target: string;
  status: string;
  title: string;
  description: string;
  draft: number;
  created: number;
  updated: number;
}

// Sort state for views
export type SortState = EntitySortState;

// API Response types: the shared client's envelopes under this app's names.
// Only the ones this app shapes differently are declared here.
export type ObjectListResponse = EntityObjectListResponse<ProjectObject>;
export type CommentListResponse = EntityCommentListResponse;
export type ActivityListResponse = EntityActivityListResponse;
export type AttachmentListResponse = EntityAttachmentListResponse;
export type WatcherListResponse = EntityWatcherListResponse;
export type LinkListResponse = EntityLinkListResponse;

export interface ObjectCreateResponse {
  data: {
    id: string;
    number: number;
    readable: string;
  };
}

export interface ObjectGetResponse {
  data: {
    object: ProjectObject & { readable: string };
    values: Record<string, string>;
    outgoing: ObjectLink[];
    incoming: ObjectLink[];
    watching: boolean;
    requests: RequestData[];
    comment_count: number;
  };
}

// Repository types (for Request integration)
export interface Repository {
  id: string;
  name: string;
  path: string;
  url: string;
}

export interface Branch {
  name: string;
  commit: string;
  current: boolean;
}

export interface RepositoryListResponse {
  data: {
    repositories: Repository[];
  };
}

export interface BranchListResponse {
  data: {
    branches: Branch[];
  };
}

export interface MergeCheckResponse {
  data: {
    can_merge: boolean;
    conflicts: string[];
    ahead: number;
    behind: number;
  };
}

export interface DiffResponse {
  data: string;
}

export interface MergeResponse {
  data: {
    success: boolean;
    commit: string;
    message: string;
  };
}
