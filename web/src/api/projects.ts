import endpoints from "./endpoints";
import { projectsRequest } from "./request";
import type { AccessRule } from "@mochi/web";
import type {
  Project,
  ProjectDetails,
  ProjectTemplate,
  ProjectView,
  ProjectClass,
  ProjectField,
  FieldOption,
  ObjectListResponse,
  ObjectCreateResponse,
  ObjectGetResponse,
  CommentListResponse,
  ActivityListResponse,
  AttachmentListResponse,
  WatcherListResponse,
  LinkListResponse,
  Comment,
  RequestData,
  RepositoryListResponse,
  BranchListResponse,
  MergeCheckResponse,
  DiffResponse,
  MergeResponse,
} from "@/types";

// Response types
interface ProjectListResponse {
  data: {
    projects: Project[];
  };
}

interface ProjectCreateResponse {
  data: {
    id: string;
    fingerprint: string;
  };
}

interface ProjectGetResponse {
  data: ProjectDetails;
}

interface TemplatesResponse {
  data: {
    templates: ProjectTemplate[];
  };
}

interface SuccessResponse {
  data: {
    success: boolean;
  };
}

interface ViewListResponse {
  data: {
    views: ProjectView[];
  };
}

interface ViewCreateResponse {
  data: {
    id: string;
    name: string;
    viewtype: string;
  };
}

// Request types
interface CreateProjectRequest {
  name: string;
  template: string;
  description?: string;
  prefix?: string;
  privacy?: "public" | "private";
}

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  prefix?: string;
}

interface CreateObjectRequest {
  class: string;
  title?: string;
  template?: string;
  parent?: string;
}

interface MoveObjectRequest {
  field?: string;  // Column field name (e.g., "status" or "column")
  value?: string;  // New column value
  rank?: number;
  row_field?: string;  // Row field name (for swimlane moves)
  row_value?: string;  // New row value
  scope_parent?: string;  // Scope rank renumbering to siblings of this parent
  promote?: string;  // "true" to clear parent (promote child to top-level)
}

interface CreateViewRequest {
  name: string;
  viewtype?: "board" | "list";
  filter?: string;
  columns?: string;
  rows?: string;
  fields?: string;
  sort?: string;
  direction?: "asc" | "desc";
  classes?: string;
  border?: string;
}

interface UpdateViewRequest {
  name?: string;
  viewtype?: "board" | "list";
  filter?: string;
  columns?: string;
  rows?: string;
  fields?: string;
  sort?: string;
  direction?: "asc" | "desc";
  classes?: string;
  border?: string;
}

// Class response/request types
interface ClassListResponse {
  data: {
    classes: ProjectClass[];
  };
}

interface ClassCreateResponse {
  data: {
    id: string;
    name: string;
    sort: number;
  };
}

interface CreateClassRequest {
  name: string;
  requests?: string;
  title?: string;
}

interface UpdateClassRequest {
  name?: string;
  requests?: string;
  title?: string;
}

// Hierarchy response/request types
interface HierarchyGetResponse {
  data: {
    parents: string[];
  };
}

interface SetHierarchyRequest {
  parents: string;
}

// Field response/request types
interface FieldListResponse {
  data: {
    fields: ProjectField[];
  };
}

interface FieldCreateResponse {
  data: {
    id: string;
    name: string;
    fieldtype: string;
    sort: number;
  };
}

interface CreateFieldRequest {
  name: string;
  fieldtype?: string;
  flags?: string;
  multi?: string;
  card?: string;
  rows?: string;
}

interface UpdateFieldRequest {
  id?: string;
  name?: string;
  flags?: string;
  multi?: string;
  card?: string;
  min?: string;
  max?: string;
  pattern?: string;
  minlength?: string;
  maxlength?: string;
  prefix?: string;
  suffix?: string;
  format?: string;
  position?: string;
  rows?: string;
}

// Option response/request types
interface OptionListResponse {
  data: {
    options: FieldOption[];
  };
}

interface OptionCreateResponse {
  data: {
    id: string;
    name: string;
    colour: string;
    sort: number;
  };
}

interface CreateOptionRequest {
  name: string;
  colour?: string;
  icon?: string;
}

interface UpdateOptionRequest {
  name?: string;
  colour?: string;
  icon?: string;
}

// Search response type
interface DirectoryEntry {
  id: string;
  name: string;
  fingerprint: string;
  location?: string;
}

interface SearchResponse {
  data: DirectoryEntry[];
}

// API methods
const projectsApi = {
  // List all projects
  list: async (): Promise<ProjectListResponse> => {
    return projectsRequest.get<ProjectListResponse>(endpoints.projects.list);
  },

  // Search for projects in the directory
  search: async (params: { search: string }): Promise<SearchResponse> => {
    return projectsRequest.get<SearchResponse>(
      `${endpoints.projects.search}?search=${encodeURIComponent(params.search)}`
    );
  },

  // Get available templates
  templates: async (): Promise<TemplatesResponse> => {
    return projectsRequest.get<TemplatesResponse>(endpoints.projects.templates);
  },

  // Create a new project
  create: async (
    data: CreateProjectRequest,
  ): Promise<ProjectCreateResponse> => {
    return projectsRequest.post<ProjectCreateResponse, CreateProjectRequest>(
      endpoints.projects.create,
      data,
    );
  },

  // Get project details
  get: async (projectId: string): Promise<ProjectGetResponse> => {
    return projectsRequest.get<ProjectGetResponse>(
      endpoints.projects.info(projectId),
    );
  },

  // Update project
  update: async (
    projectId: string,
    data: UpdateProjectRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateProjectRequest>(
      endpoints.projects.update(projectId),
      data,
    );
  },

  // Delete project
  delete: async (projectId: string): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.delete(projectId),
    );
  },

  // List project members (subscribers + owners)
  listPeople: async (
    projectId: string,
  ): Promise<{ data: { people: { id: string; name: string }[] } }> => {
    return projectsRequest.get(endpoints.projects.people(projectId));
  },

  // ============= Object Methods =============

  // List objects
  listObjects: async (
    projectId: string,
    params?: { class?: string; status?: string; parent?: string },
  ): Promise<ObjectListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.class) searchParams.set("class", params.class);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.parent !== undefined) searchParams.set("parent", params.parent);
    const query = searchParams.toString();
    const url =
      endpoints.projects.objects(projectId) + (query ? `?${query}` : "");
    return projectsRequest.get<ObjectListResponse>(url);
  },

  // Create object
  createObject: async (
    projectId: string,
    data: CreateObjectRequest,
  ): Promise<ObjectCreateResponse> => {
    return projectsRequest.post<ObjectCreateResponse, CreateObjectRequest>(
      endpoints.projects.objectCreate(projectId),
      data,
    );
  },

  // Get object
  getObject: async (
    projectId: string,
    objectId: string,
  ): Promise<ObjectGetResponse> => {
    return projectsRequest.get<ObjectGetResponse>(
      endpoints.projects.object(projectId, objectId),
    );
  },

  // Update object
  updateObject: async (
    projectId: string,
    objectId: string,
    data: { parent?: string; class?: string },
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.objectUpdate(projectId, objectId),
      data,
    );
  },

  // Delete object
  deleteObject: async (
    projectId: string,
    objectId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.objectDelete(projectId, objectId),
    );
  },

  // Move object (change status - for drag-drop)
  moveObject: async (
    projectId: string,
    objectId: string,
    data: MoveObjectRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, MoveObjectRequest>(
      endpoints.projects.objectMove(projectId, objectId),
      data,
    );
  },

  // Set multiple values
  setValues: async (
    projectId: string,
    objectId: string,
    values: Record<string, string>,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.valuesSet(projectId, objectId),
      values,
    );
  },

  // Set single value
  setValue: async (
    projectId: string,
    objectId: string,
    field: string,
    value: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.valueSet(projectId, objectId, field),
      { value },
    );
  },

  // ============= Link Methods =============

  // List links
  listLinks: async (
    projectId: string,
    objectId: string,
  ): Promise<LinkListResponse> => {
    return projectsRequest.get<LinkListResponse>(
      endpoints.projects.links(projectId, objectId),
    );
  },

  // Create link
  createLink: async (
    projectId: string,
    objectId: string,
    target: string,
    linktype: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.linkCreate(projectId, objectId),
      { target, linktype },
    );
  },

  // Delete link
  deleteLink: async (
    projectId: string,
    objectId: string,
    target: string,
    linktype: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.linkDelete(projectId, objectId),
      { target, linktype },
    );
  },

  // ============= Comment Methods =============

  // List comments
  listComments: async (
    projectId: string,
    objectId: string,
  ): Promise<CommentListResponse> => {
    return projectsRequest.get<CommentListResponse>(
      endpoints.projects.comments(projectId, objectId),
    );
  },

  // Create comment
  createComment: async (
    projectId: string,
    objectId: string,
    content: string,
    parent?: string,
    files?: File[],
  ): Promise<{ data: Comment }> => {
    const formData = new FormData();
    formData.append("content", content);
    if (parent) formData.append("parent", parent);
    if (files) {
      files.forEach((file) => formData.append("files", file));
    }
    return projectsRequest.post<{ data: Comment }>(
      endpoints.projects.commentCreate(projectId, objectId),
      formData,
    );
  },

  // Update comment
  updateComment: async (
    projectId: string,
    objectId: string,
    commentId: string,
    content: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.commentUpdate(projectId, objectId, commentId),
      { content },
    );
  },

  // Delete comment
  deleteComment: async (
    projectId: string,
    objectId: string,
    commentId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.commentDelete(projectId, objectId, commentId),
    );
  },

  // ============= Activity Methods =============

  // List activity
  listActivity: async (
    projectId: string,
    objectId: string,
  ): Promise<ActivityListResponse> => {
    return projectsRequest.get<ActivityListResponse>(
      endpoints.projects.activity(projectId, objectId),
    );
  },

  // ============= Attachment Methods =============

  // Upload attachments
  uploadAttachments: async (
    projectId: string,
    objectId: string,
    files: File[],
  ): Promise<AttachmentListResponse> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    return projectsRequest.post(
      endpoints.projects.attachmentCreate(projectId, objectId),
      formData,
    );
  },

  // List attachments
  listAttachments: async (
    projectId: string,
    objectId: string,
  ): Promise<AttachmentListResponse> => {
    return projectsRequest.get<AttachmentListResponse>(
      endpoints.projects.attachments(projectId, objectId),
    );
  },

  // Delete attachment
  deleteAttachment: async (
    projectId: string,
    objectId: string,
    attachmentId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.attachmentDelete(projectId, objectId, attachmentId),
    );
  },

  // ============= Watcher Methods =============

  // List watchers
  listWatchers: async (
    projectId: string,
    objectId: string,
  ): Promise<WatcherListResponse> => {
    return projectsRequest.get<WatcherListResponse>(
      endpoints.projects.watchers(projectId, objectId),
    );
  },

  // Add watcher (self)
  addWatcher: async (
    projectId: string,
    objectId: string,
  ): Promise<SuccessResponse & { data: { watching: boolean } }> => {
    return projectsRequest.post<
      SuccessResponse & { data: { watching: boolean } }
    >(endpoints.projects.watcherAdd(projectId, objectId));
  },

  // Remove watcher (self)
  removeWatcher: async (
    projectId: string,
    objectId: string,
  ): Promise<SuccessResponse & { data: { watching: boolean } }> => {
    return projectsRequest.post<
      SuccessResponse & { data: { watching: boolean } }
    >(endpoints.projects.watcherRemove(projectId, objectId));
  },

  // ============= Design Import/Export Methods =============

  // Export design as template JSON
  exportDesign: async (
    projectId: string,
  ): Promise<{ data: Record<string, unknown> }> => {
    return projectsRequest.get(endpoints.projects.designExport(projectId));
  },

  // Import design from template JSON or built-in template ID
  importDesign: async (
    projectId: string,
    data: Record<string, unknown>,
    template?: string,
    templateVersion?: number,
  ): Promise<SuccessResponse> => {
    const payload: Record<string, string> = {
      template: template || "",
      template_version: String(templateVersion || 0),
    };
    // Only send data if it has content (for file imports)
    // For built-in templates, the backend loads the template file by template ID
    if (Object.keys(data).length > 0) {
      payload.data = JSON.stringify(data);
    }
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.designImport(projectId),
      payload,
    );
  },

  // ============= View Methods =============

  // List views
  listViews: async (projectId: string): Promise<ViewListResponse> => {
    return projectsRequest.get<ViewListResponse>(
      endpoints.projects.views(projectId),
    );
  },

  // Create view
  createView: async (
    projectId: string,
    data: CreateViewRequest,
  ): Promise<ViewCreateResponse> => {
    return projectsRequest.post<ViewCreateResponse, CreateViewRequest>(
      endpoints.projects.viewCreate(projectId),
      data,
    );
  },

  // Update view
  updateView: async (
    projectId: string,
    viewId: string,
    data: UpdateViewRequest,
  ): Promise<SuccessResponse> => {
    // Filter out undefined values before sending
    const cleanData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        cleanData[key] = value;
      }
    }
    return projectsRequest.post<SuccessResponse, Record<string, string>>(
      endpoints.projects.viewUpdate(projectId, viewId),
      cleanData,
    );
  },

  // Delete view
  deleteView: async (
    projectId: string,
    viewId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.viewDelete(projectId, viewId),
    );
  },

  // Reorder views
  reorderViews: async (
    projectId: string,
    order: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.viewReorder(projectId),
      { order: order.join(",") },
    );
  },

  // ============= Class Methods =============

  // List classes
  listClasses: async (projectId: string): Promise<ClassListResponse> => {
    return projectsRequest.get<ClassListResponse>(
      endpoints.projects.classes(projectId),
    );
  },

  // Create class
  createClass: async (
    projectId: string,
    data: CreateClassRequest,
  ): Promise<ClassCreateResponse> => {
    return projectsRequest.post<ClassCreateResponse, CreateClassRequest>(
      endpoints.projects.classCreate(projectId),
      data,
    );
  },

  // Update class
  updateClass: async (
    projectId: string,
    classId: string,
    data: UpdateClassRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateClassRequest>(
      endpoints.projects.classUpdate(projectId, classId),
      data,
    );
  },

  // Delete class
  deleteClass: async (
    projectId: string,
    classId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.classDelete(projectId, classId),
    );
  },

  // ============= Hierarchy Methods =============

  // Get hierarchy
  getHierarchy: async (
    projectId: string,
    classId: string,
  ): Promise<HierarchyGetResponse> => {
    return projectsRequest.get<HierarchyGetResponse>(
      endpoints.projects.hierarchy(projectId, classId),
    );
  },

  // Set hierarchy
  setHierarchy: async (
    projectId: string,
    classId: string,
    parents: string[],
  ): Promise<SuccessResponse> => {
    // Use _none_ to indicate empty list, since empty string means "can be root"
    const parentsStr = parents.length === 0 ? "_none_" : parents.join(",");
    return projectsRequest.post<SuccessResponse, SetHierarchyRequest>(
      endpoints.projects.hierarchySet(projectId, classId),
      { parents: parentsStr },
    );
  },

  // ============= Field Methods =============

  // List fields
  listFields: async (
    projectId: string,
    classId: string,
  ): Promise<FieldListResponse> => {
    return projectsRequest.get<FieldListResponse>(
      endpoints.projects.fields(projectId, classId),
    );
  },

  // Create field
  createField: async (
    projectId: string,
    classId: string,
    data: CreateFieldRequest,
  ): Promise<FieldCreateResponse> => {
    return projectsRequest.post<FieldCreateResponse, CreateFieldRequest>(
      endpoints.projects.fieldCreate(projectId, classId),
      data,
    );
  },

  // Update field
  updateField: async (
    projectId: string,
    classId: string,
    fieldId: string,
    data: UpdateFieldRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateFieldRequest>(
      endpoints.projects.fieldUpdate(projectId, classId, fieldId),
      data,
    );
  },

  // Delete field
  deleteField: async (
    projectId: string,
    classId: string,
    fieldId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.fieldDelete(projectId, classId, fieldId),
    );
  },

  // Reorder fields
  reorderFields: async (
    projectId: string,
    classId: string,
    order: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.fieldReorder(projectId, classId),
      { order: order.join(",") },
    );
  },

  // ============= Option Methods =============

  // List options
  listOptions: async (
    projectId: string,
    classId: string,
    fieldId: string,
  ): Promise<OptionListResponse> => {
    return projectsRequest.get<OptionListResponse>(
      endpoints.projects.options(projectId, classId, fieldId),
    );
  },

  // Create option
  createOption: async (
    projectId: string,
    classId: string,
    fieldId: string,
    data: CreateOptionRequest,
  ): Promise<OptionCreateResponse> => {
    return projectsRequest.post<OptionCreateResponse, CreateOptionRequest>(
      endpoints.projects.optionCreate(projectId, classId, fieldId),
      data,
    );
  },

  // Update option
  updateOption: async (
    projectId: string,
    classId: string,
    fieldId: string,
    optionId: string,
    data: UpdateOptionRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateOptionRequest>(
      endpoints.projects.optionUpdate(projectId, classId, fieldId, optionId),
      data,
    );
  },

  // Delete option
  deleteOption: async (
    projectId: string,
    classId: string,
    fieldId: string,
    optionId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.optionDelete(projectId, classId, fieldId, optionId),
    );
  },

  // Reorder options
  reorderOptions: async (
    projectId: string,
    classId: string,
    fieldId: string,
    order: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.optionReorder(projectId, classId, fieldId),
      { order: order.join(",") },
    );
  },

  // ============= Request Methods =============

  // List requests for an object
  listRequests: async (
    projectId: string,
    objectId: string,
  ): Promise<{ data: { requests: RequestData[] } }> => {
    return projectsRequest.get(
      endpoints.projects.requests(projectId, objectId),
    );
  },

  // Create a request
  createRequest: async (
    projectId: string,
    objectId: string,
    data: { type?: string; repository?: string; source?: string; target?: string; title?: string; description?: string; draft?: number },
  ): Promise<{ data: RequestData }> => {
    return projectsRequest.post(
      endpoints.projects.requestCreate(projectId, objectId),
      data,
    );
  },

  // Update a request
  updateRequest: async (
    projectId: string,
    objectId: string,
    requestId: string,
    data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string },
  ): Promise<{ data: RequestData }> => {
    return projectsRequest.post(
      endpoints.projects.requestUpdate(projectId, objectId, requestId),
      data,
    );
  },

  // Delete a request
  deleteRequest: async (
    projectId: string,
    objectId: string,
    requestId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post(
      endpoints.projects.requestDelete(projectId, objectId, requestId),
    );
  },

  // ============= Diff Preference Methods =============

  getDiffPreference: async (): Promise<{ data: { style: string } }> => {
    return projectsRequest.get(endpoints.projects.diffPreference);
  },

  setDiffPreference: async (
    style: string,
  ): Promise<{ data: { style: string } }> => {
    return projectsRequest.post(endpoints.projects.diffPreferenceSet, {
      style,
    });
  },

  // ============= Repository Methods (for merge requests) =============

  // List available repositories
  listRepositories: async (): Promise<RepositoryListResponse> => {
    return projectsRequest.get<RepositoryListResponse>(
      endpoints.projects.repositories,
    );
  },

  // Get branches for a repository
  getRepositoryBranches: async (
    repoId: string,
  ): Promise<BranchListResponse> => {
    return projectsRequest.get<BranchListResponse>(
      endpoints.projects.repositoryBranches(repoId),
    );
  },

  // Check if branches can be merged
  checkMerge: async (
    repoId: string,
    source: string,
    target: string,
  ): Promise<MergeCheckResponse> => {
    return projectsRequest.post<MergeCheckResponse>(
      endpoints.projects.repositoryMergeCheck(repoId),
      { source, target },
    );
  },

  // Get diff between branches
  getDiff: async (
    repoId: string,
    base: string,
    head: string,
  ): Promise<DiffResponse> => {
    return projectsRequest.post<DiffResponse>(
      endpoints.projects.repositoryDiff(repoId),
      { base, head },
    );
  },

  // Perform merge
  merge: async (
    repoId: string,
    source: string,
    target: string,
    message: string,
    projectId?: string,
    method?: string,
  ): Promise<MergeResponse> => {
    return projectsRequest.post<MergeResponse>(
      endpoints.projects.repositoryMerge(repoId),
      { source, target, message, project: projectId, method },
    );
  },

  // ============================================================================
  // Remote Projects (Subscribe)
  // ============================================================================

  // Probe a remote project by URL
  probe: async (
    url: string,
  ): Promise<{
    data: {
      id: string;
      name: string;
      description: string;
      prefix: string;
      fingerprint: string;
      class: string;
      server: string;
      remote: boolean;
    };
  }> => {
    return projectsRequest.post(endpoints.projects.probe, { url });
  },

  // Get recommended projects
  recommendations: async (): Promise<{
    data: {
      projects: Array<{
        id: string;
        name: string;
        blurb: string;
        fingerprint: string;
      }>;
    };
  }> => {
    return projectsRequest.get(endpoints.projects.recommendations);
  },

  // Subscribe to a remote project
  subscribe: async (
    projectId: string,
    server?: string,
  ): Promise<{ data: { fingerprint: string } }> => {
    return projectsRequest.post(endpoints.projects.subscribe, {
      project: projectId,
      server,
    });
  },

  // Unsubscribe from a remote project
  unsubscribe: async (
    projectId: string,
  ): Promise<{ data: { success: boolean } }> => {
    return projectsRequest.post(endpoints.projects.unsubscribe, {
      project: projectId,
    });
  },

  // ============================================================================
  // Access Control
  // ============================================================================

  // Get access rules for a project
  getAccessRules: async (
    projectId: string,
  ): Promise<{
    data: {
      rules: AccessRule[];
      owner: { id: string; name: string };
    };
  }> => {
    return projectsRequest.get(endpoints.projects.access(projectId));
  },

  // Set access level for a subject
  setAccessLevel: async (
    projectId: string,
    subject: string,
    level: string,
  ): Promise<{ data: { success: boolean } }> => {
    return projectsRequest.post(endpoints.projects.accessSet(projectId), {
      subject,
      level,
    });
  },

  // Revoke access for a subject
  revokeAccess: async (
    projectId: string,
    subject: string,
  ): Promise<{ data: { success: boolean } }> => {
    return projectsRequest.post(endpoints.projects.accessRevoke(projectId), {
      subject,
    });
  },

  // ============= Notification Methods =============

  // Check if notification subscriptions exist
  checkSubscription: async (): Promise<{ data: { exists: boolean } }> => {
    return projectsRequest.get(endpoints.projects.notificationsCheck);
  },

  // Search users (for adding access rules)
  searchUsers: async (
    query: string,
  ): Promise<{ results: { id: string; name: string; fingerprint: string }[] }> => {
    return projectsRequest.get(`${endpoints.projects.usersSearch}?q=${encodeURIComponent(query)}`);
  },

  // List groups (for adding access rules)
  listGroups: async (): Promise<{ groups: { id: string; name: string }[] }> => {
    return projectsRequest.get(endpoints.projects.groups);
  },
};

export default projectsApi;
