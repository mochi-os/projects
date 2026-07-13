// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Project types
export type ProjectAccess = "owner" | "design" | "write" | "comment" | "view";

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

export interface ProjectClass {
  id: string;
  name: string;
  rank: number;
  requests: string;
  title: string;
}

export interface ProjectField {
  id: string;
  name: string;
  fieldtype: string;
  flags: string;
  multi: number;
  rank: number;
  card: number;
  position: string;
  rows: number;
  pattern?: string;
  minlength?: number;
  maxlength?: number;
}

export interface FieldOption {
  id: string;
  name: string;
  colour: string;
  icon: string;
  rank: number;
}

export interface ProjectView {
  id: string;
  name: string;
  viewtype: string;
  filter: string;
  columns: string;
  rows: string;
  fields: string;
  sort: string;
  direction: string;
  classes: string[];
  rank: number;
  border: string;
}

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

// Object types
export interface ProjectObject {
  id: string;
  project: string;
  class: string;
  number: number;
  parent: string;
  // Fractional-index ordering key (#53): an opaque base-62 string, compared
  // lexicographically. Not a position — the move action still sends a 1-based
  // target index, the server computes the key.
  rank: string;
  created: number;
  updated: number;
  readable?: string;
  values: Record<string, string>;
}

export interface ObjectLink {
  target?: string;
  source?: string;
  linktype: string;
  created: number;
  number?: number;
  type?: string;
  title?: string;
}

export interface CommentAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  created: number;
}

export interface Comment {
  id: string;
  parent: string;
  author: string;
  name: string;
  content: string;
  created: number;
  edited: number;
  children: Comment[];
  attachments: CommentAttachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  created: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Activity {
  id: string;
  user: string;
  name: string;
  action: string;
  field: string;
  oldvalue: string;
  newvalue: string;
  created: number;
}

export interface Watcher {
  user: string;
  created: number;
}

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

// Field flag check helper
export function fieldHasFlag(field: { flags?: string }, flag: string): boolean {
  return field.flags?.split(",").includes(flag) ?? false;
}

// Sort state for views
export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

// API Response types
export interface ObjectListResponse {
  data: {
    objects: ProjectObject[];
    watched?: string[];
  };
}

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

export interface CommentListResponse {
  data: {
    comments: Comment[];
    count: number;
  };
}

export interface ActivityListResponse {
  data: {
    activities: Activity[];
  };
}

export interface AttachmentListResponse {
  data: {
    attachments: Attachment[];
  };
}

export interface WatcherListResponse {
  data: {
    watchers: Watcher[];
    watching: boolean;
  };
}

export interface LinkListResponse {
  data: {
    outgoing: ObjectLink[];
    incoming: ObjectLink[];
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
