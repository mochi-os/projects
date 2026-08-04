// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The projects API is the shared entity API plus what only this app has:
// templates, merge requests, and the repository integration behind them.
// Class create/update are overridden rather than shared, since a project class
// carries a `requests` setting that a CRM class has no concept of.

import { createEntityApi, type EntityApiShapes } from "@mochi/web";
import endpoints from "./endpoints";
import { projectsRequest } from "./request";
import type {
  Project,
  ProjectDetails,
  ProjectTemplate,
  ProjectClass,
  ObjectLink,
  RequestData,
  RepositoryListResponse,
  BranchListResponse,
  MergeCheckResponse,
  DiffResponse,
  MergeResponse,
  ProjectObject,
} from "@/types";

interface CreateProjectRequest {
  name: string;
  description?: string;
  template: string;
  prefix?: string;
  privacy?: "public" | "private";
}

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  prefix?: string;
}

interface CreateClassRequest {
  name: string;
  title?: string;
  requests?: string;
}

interface UpdateClassRequest {
  name?: string;
  title?: string;
  requests?: string;
}

interface SuccessResponse {
  data: {
    success: boolean;
  };
}

interface ProjectApiShapes extends EntityApiShapes {
  summary: Project;
  details: ProjectDetails;
  object: ProjectObject;
  objectDetail: {
    object: ProjectObject & { readable: string };
    values: Record<string, string>;
    outgoing: ObjectLink[];
    incoming: ObjectLink[];
    watching: boolean;
    comment_count: number;
    requests: RequestData[];
  };
  objectCreated: { id: string; number: number; readable: string };
  createRequest: CreateProjectRequest;
  updateRequest: UpdateProjectRequest;
  listKey: "projects";
}

const entityApi = createEntityApi<ProjectApiShapes>({
  request: projectsRequest,
  endpoints: endpoints.projects,
  resourceKey: "project",
});

const projectsApi = {
  ...entityApi,

  // Get available templates
  templates: async (): Promise<{ data: { templates: ProjectTemplate[] } }> => {
    return projectsRequest.get(endpoints.projects.templates);
  },

  // ============= Class Methods (project classes carry `requests`) =============

  listClasses: async (
    projectId: string,
  ): Promise<{ data: { classes: ProjectClass[] } }> => {
    return projectsRequest.get(endpoints.projects.classes(projectId));
  },

  createClass: async (
    projectId: string,
    data: CreateClassRequest,
  ): Promise<{ data: { id: string; name: string; sort: number } }> => {
    return projectsRequest.post<
      { data: { id: string; name: string; sort: number } },
      CreateClassRequest
    >(endpoints.projects.classCreate(projectId), data);
  },

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
};

export default projectsApi;
