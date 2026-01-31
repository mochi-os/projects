// Project types
export interface Project {
  id: string;
  fingerprint: string;
  name: string;
  description: string;
  prefix: string;
  counter: number;
  owner: number;
  ownername: string;
  server: string;
  created: number;
  updated: number;
}

export interface ProjectType {
  id: string;
  name: string;
  sort: number;
}

export interface ProjectField {
  id: string;
  name: string;
  fieldtype: string;
  required: number;
  multi: number;
  sort: number;
  card: number;
  position: string;
}

export interface FieldOption {
  id: string;
  name: string;
  colour: string;
  icon: string;
  sort: number;
}

export interface ProjectView {
  id: string;
  name: string;
  viewtype: string;
  filter: string;
  columns: string;
  rows: string;
  cardfields: string;
  sort: string;
  direction: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
}

export interface ObjectTemplate {
  id: string;
  name: string;
  description: string;
  fields: Record<string, string>;
}

export interface ProjectDetails {
  project: Project;
  types: ProjectType[];
  fields: Record<string, ProjectField[]>;
  options: Record<string, Record<string, FieldOption[]>>;
  views: ProjectView[];
  hierarchy: Record<string, string[]>;
}

// Object types
export interface ProjectObject {
  id: string;
  project: string;
  type: string;
  number: number;
  parent: string;
  rank: number;
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

export interface Comment {
  id: string;
  parent: string;
  author: string;
  name: string;
  content: string;
  created: number;
  edited: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimetype: string;
  created: number;
}

export interface Activity {
  id: string;
  actor: string;
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

// API Response types
export interface ObjectListResponse {
  data: {
    objects: ProjectObject[];
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
    links: ObjectLink[];
    linked_by: ObjectLink[];
    watching: boolean;
  };
}

export interface CommentListResponse {
  data: {
    comments: Comment[];
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

// Repository types (for Pull Request integration)
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

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  status: "added" | "modified" | "deleted" | "renamed";
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
  data: {
    files: DiffFile[];
    additions: number;
    deletions: number;
    diff: string;
  };
}

export interface MergeResponse {
  data: {
    success: boolean;
    commit: string;
    message: string;
  };
}
