// Endpoints are relative to baseURL which is already set to /projects/ in request.ts
const endpoints = {
  projects: {
    // Class-level endpoints (no entity context)
    list: "-/list",
    create: "-/create",
    templates: "-/templates",
    search: "directory/search",
    probe: "probe",
    subscribe: "subscribe",
    unsubscribe: "unsubscribe",

    // Entity-level endpoints (use /-/ separator)
    info: (projectId: string) => `${projectId}/-/info`,
    update: (projectId: string) => `${projectId}/-/update`,
    delete: (projectId: string) => `${projectId}/-/delete`,
    people: (projectId: string) => `${projectId}/-/people`,

    // Access control endpoints
    access: (projectId: string) => `${projectId}/-/access`,
    accessSet: (projectId: string) => `${projectId}/-/access/set`,
    accessRevoke: (projectId: string) => `${projectId}/-/access/revoke`,

    // Object endpoints
    objects: (projectId: string) => `${projectId}/-/objects`,
    objectCreate: (projectId: string) => `${projectId}/-/objects/create`,
    object: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}`,
    objectUpdate: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/update`,
    objectDelete: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/delete`,
    objectMove: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/move`,

    // Value endpoints
    valuesSet: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/values`,
    valueSet: (projectId: string, objectId: string, field: string) =>
      `${projectId}/-/objects/${objectId}/values/${field}`,

    // Link endpoints
    links: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/links`,
    linkCreate: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/links/create`,
    linkDelete: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/links/delete`,

    // Comment endpoints
    comments: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/comments`,
    commentCreate: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/comments/create`,
    commentUpdate: (projectId: string, objectId: string, commentId: string) =>
      `${projectId}/-/objects/${objectId}/comments/${commentId}/update`,
    commentDelete: (projectId: string, objectId: string, commentId: string) =>
      `${projectId}/-/objects/${objectId}/comments/${commentId}/delete`,

    // Attachment endpoints
    attachments: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/attachments`,
    attachmentCreate: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/attachments/create`,
    attachmentDelete: (
      projectId: string,
      objectId: string,
      attachmentId: string,
    ) =>
      `${projectId}/-/objects/${objectId}/attachments/${attachmentId}/delete`,

    // Activity endpoint
    activity: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/activity`,

    // Watcher endpoints
    watchers: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/watchers`,
    watcherAdd: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/watchers/add`,
    watcherRemove: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/watchers/remove`,

    // View endpoints
    views: (projectId: string) => `${projectId}/-/views`,
    viewCreate: (projectId: string) => `${projectId}/-/views/create`,
    viewReorder: (projectId: string) => `${projectId}/-/views/reorder`,
    viewUpdate: (projectId: string, viewId: string) =>
      `${projectId}/-/views/${viewId}/update`,
    viewDelete: (projectId: string, viewId: string) =>
      `${projectId}/-/views/${viewId}/delete`,

    // Class endpoints
    classes: (projectId: string) => `${projectId}/-/classes`,
    classCreate: (projectId: string) => `${projectId}/-/classes/create`,
    classUpdate: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/update`,
    classDelete: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/delete`,

    // Hierarchy endpoints
    hierarchy: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/hierarchy`,
    hierarchySet: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/hierarchy/set`,

    // Field endpoints
    fields: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/fields`,
    fieldCreate: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/fields/create`,
    fieldReorder: (projectId: string, classId: string) =>
      `${projectId}/-/classes/${classId}/fields/reorder`,
    fieldUpdate: (projectId: string, classId: string, fieldId: string) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/update`,
    fieldDelete: (projectId: string, classId: string, fieldId: string) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/delete`,

    // Option endpoints
    options: (projectId: string, classId: string, fieldId: string) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/options`,
    optionCreate: (projectId: string, classId: string, fieldId: string) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/options/create`,
    optionReorder: (projectId: string, classId: string, fieldId: string) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/options/reorder`,
    optionUpdate: (
      projectId: string,
      classId: string,
      fieldId: string,
      optionId: string,
    ) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/options/${optionId}/update`,
    optionDelete: (
      projectId: string,
      classId: string,
      fieldId: string,
      optionId: string,
    ) =>
      `${projectId}/-/classes/${classId}/fields/${fieldId}/options/${optionId}/delete`,

    // Repository integration endpoints (for Pull Requests)
    repositories: "-/repositories",
    repositoryBranches: (repoId: string) => `-/repositories/${repoId}/branches`,
    repositoryMergeCheck: (repoId: string) =>
      `-/repositories/${repoId}/merge/check`,
    repositoryDiff: (repoId: string) => `-/repositories/${repoId}/diff`,
    repositoryMerge: (repoId: string) => `-/repositories/${repoId}/merge`,
  },
} as const;

export type Endpoints = typeof endpoints;

export default endpoints;
