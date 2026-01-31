import endpoints from "./endpoints";
import { projectsRequest } from "./request";
import type {
  Project,
  ProjectDetails,
  ProjectTemplate,
  ObjectTemplate,
  ProjectView,
  ProjectType,
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

interface ObjectTemplatesResponse {
  data: {
    templates: ObjectTemplate[];
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
  type: string;
  title?: string;
  template?: string;
  parent?: string;
}

interface MoveObjectRequest {
  status?: string;
  rank?: number;
}

interface CreateViewRequest {
  name: string;
  viewtype?: "board" | "list";
  filter?: string;
  columns?: string;
  rows?: string;
  cardfields?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

interface UpdateViewRequest {
  name?: string;
  viewtype?: "board" | "list";
  filter?: string;
  columns?: string;
  rows?: string;
  cardfields?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

// Type response/request types
interface TypeListResponse {
  data: {
    types: ProjectType[];
  };
}

interface TypeCreateResponse {
  data: {
    id: string;
    name: string;
    sort: number;
  };
}

interface CreateTypeRequest {
  name: string;
}

interface UpdateTypeRequest {
  name?: string;
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
  required?: string;
  multi?: string;
  card?: string;
}

interface UpdateFieldRequest {
  name?: string;
  required?: string;
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

// API methods
const projectsApi = {
  // List all projects
  list: async (): Promise<ProjectListResponse> => {
    return projectsRequest.get<ProjectListResponse>(endpoints.projects.list);
  },

  // Get available templates
  templates: async (): Promise<TemplatesResponse> => {
    return projectsRequest.get<TemplatesResponse>(endpoints.projects.templates);
  },

  // Get object templates
  objectTemplates: async (): Promise<ObjectTemplatesResponse> => {
    return projectsRequest.get<ObjectTemplatesResponse>(
      endpoints.projects.objectTemplates,
    );
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
    params?: { type?: string; status?: string; parent?: string },
  ): Promise<ObjectListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
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
    data: { parent?: string; type?: string },
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
  ): Promise<{ data: Comment }> => {
    return projectsRequest.post<{ data: Comment }>(
      endpoints.projects.commentCreate(projectId, objectId),
      { content, parent },
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
    return projectsRequest.post<SuccessResponse, UpdateViewRequest>(
      endpoints.projects.viewUpdate(projectId, viewId),
      data,
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

  // ============= Type Methods =============

  // List types
  listTypes: async (projectId: string): Promise<TypeListResponse> => {
    return projectsRequest.get<TypeListResponse>(
      endpoints.projects.types(projectId),
    );
  },

  // Create type
  createType: async (
    projectId: string,
    data: CreateTypeRequest,
  ): Promise<TypeCreateResponse> => {
    return projectsRequest.post<TypeCreateResponse, CreateTypeRequest>(
      endpoints.projects.typeCreate(projectId),
      data,
    );
  },

  // Update type
  updateType: async (
    projectId: string,
    typeId: string,
    data: UpdateTypeRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateTypeRequest>(
      endpoints.projects.typeUpdate(projectId, typeId),
      data,
    );
  },

  // Delete type
  deleteType: async (
    projectId: string,
    typeId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.typeDelete(projectId, typeId),
    );
  },

  // ============= Hierarchy Methods =============

  // Get hierarchy
  getHierarchy: async (
    projectId: string,
    typeId: string,
  ): Promise<HierarchyGetResponse> => {
    return projectsRequest.get<HierarchyGetResponse>(
      endpoints.projects.hierarchy(projectId, typeId),
    );
  },

  // Set hierarchy
  setHierarchy: async (
    projectId: string,
    typeId: string,
    parents: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, SetHierarchyRequest>(
      endpoints.projects.hierarchySet(projectId, typeId),
      { parents: parents.join(",") },
    );
  },

  // ============= Field Methods =============

  // List fields
  listFields: async (
    projectId: string,
    typeId: string,
  ): Promise<FieldListResponse> => {
    return projectsRequest.get<FieldListResponse>(
      endpoints.projects.fields(projectId, typeId),
    );
  },

  // Create field
  createField: async (
    projectId: string,
    typeId: string,
    data: CreateFieldRequest,
  ): Promise<FieldCreateResponse> => {
    return projectsRequest.post<FieldCreateResponse, CreateFieldRequest>(
      endpoints.projects.fieldCreate(projectId, typeId),
      data,
    );
  },

  // Update field
  updateField: async (
    projectId: string,
    typeId: string,
    fieldId: string,
    data: UpdateFieldRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateFieldRequest>(
      endpoints.projects.fieldUpdate(projectId, typeId, fieldId),
      data,
    );
  },

  // Delete field
  deleteField: async (
    projectId: string,
    typeId: string,
    fieldId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.fieldDelete(projectId, typeId, fieldId),
    );
  },

  // Reorder fields
  reorderFields: async (
    projectId: string,
    typeId: string,
    order: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.fieldReorder(projectId, typeId),
      { order: order.join(",") },
    );
  },

  // ============= Option Methods =============

  // List options
  listOptions: async (
    projectId: string,
    typeId: string,
    fieldId: string,
  ): Promise<OptionListResponse> => {
    return projectsRequest.get<OptionListResponse>(
      endpoints.projects.options(projectId, typeId, fieldId),
    );
  },

  // Create option
  createOption: async (
    projectId: string,
    typeId: string,
    fieldId: string,
    data: CreateOptionRequest,
  ): Promise<OptionCreateResponse> => {
    return projectsRequest.post<OptionCreateResponse, CreateOptionRequest>(
      endpoints.projects.optionCreate(projectId, typeId, fieldId),
      data,
    );
  },

  // Update option
  updateOption: async (
    projectId: string,
    typeId: string,
    fieldId: string,
    optionId: string,
    data: UpdateOptionRequest,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse, UpdateOptionRequest>(
      endpoints.projects.optionUpdate(projectId, typeId, fieldId, optionId),
      data,
    );
  },

  // Delete option
  deleteOption: async (
    projectId: string,
    typeId: string,
    fieldId: string,
    optionId: string,
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.optionDelete(projectId, typeId, fieldId, optionId),
    );
  },

  // Reorder options
  reorderOptions: async (
    projectId: string,
    typeId: string,
    fieldId: string,
    order: string[],
  ): Promise<SuccessResponse> => {
    return projectsRequest.post<SuccessResponse>(
      endpoints.projects.optionReorder(projectId, typeId, fieldId),
      { order: order.join(",") },
    );
  },

  // ============= Repository Methods (for Pull Requests) =============

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
  ): Promise<MergeResponse> => {
    return projectsRequest.post<MergeResponse>(
      endpoints.projects.repositoryMerge(repoId),
      { source, target, message },
    );
  },

  // ============================================================================
  // Remote Projects (Subscribe/Bookmark)
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

};

export default projectsApi;
