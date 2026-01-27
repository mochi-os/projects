// Comprehensive tests for the Projects API
import { describe, it, expect, vi, beforeEach } from "vitest";
import projectsApi from "./projects";
import { projectsRequest } from "./request";

// Mock the request module
vi.mock("./request", () => ({
  projectsRequest: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("projectsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============= Project Methods =============

  describe("list", () => {
    it("should fetch projects list", async () => {
      const mockResponse = {
        data: {
          projects: [
            { id: "1", fingerprint: "abc", name: "Project 1" },
            { id: "2", fingerprint: "def", name: "Project 2" },
          ],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.list();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/list");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("templates", () => {
    it("should fetch available templates", async () => {
      const mockResponse = {
        data: {
          templates: [
            { id: "simple", name: "Simple", description: "Basic project" },
          ],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.templates();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/templates");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("objectTemplates", () => {
    it("should fetch object templates", async () => {
      const mockResponse = {
        data: {
          templates: [{ id: "task", name: "Task", description: "A task item" }],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.objectTemplates();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/templates/object");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("create", () => {
    it("should create a new project", async () => {
      const mockResponse = {
        data: { id: "123", fingerprint: "abc123" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.create({
        name: "New Project",
        template: "simple",
        privacy: "private",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith("-/create", {
        name: "New Project",
        template: "simple",
        privacy: "private",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should create project with optional fields", async () => {
      const mockResponse = { data: { id: "123", fingerprint: "abc123" } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.create({
        name: "New Project",
        template: "software",
        description: "A test project",
        prefix: "TEST",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith("-/create", {
        name: "New Project",
        template: "software",
        description: "A test project",
        prefix: "TEST",
      });
    });
  });

  describe("get", () => {
    it("should fetch project details", async () => {
      const mockResponse = {
        data: {
          project: { id: "1", name: "Test Project" },
          types: [],
          fields: {},
          options: {},
          views: [],
          hierarchy: {},
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.get("proj123");

      expect(projectsRequest.get).toHaveBeenCalledWith("proj123/-/info");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("update", () => {
    it("should update project", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.update("proj123", {
        name: "Updated Name",
        description: "New description",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith("proj123/-/update", {
        name: "Updated Name",
        description: "New description",
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("delete", () => {
    it("should delete project", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.delete("proj123");

      expect(projectsRequest.post).toHaveBeenCalledWith("proj123/-/delete");
      expect(result).toEqual(mockResponse);
    });
  });

  // ============= Object Methods =============

  describe("listObjects", () => {
    it("should fetch objects without params", async () => {
      const mockResponse = { data: { objects: [] } };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      await projectsApi.listObjects("proj123");

      expect(projectsRequest.get).toHaveBeenCalledWith("proj123/-/objects");
    });

    it("should fetch objects with type filter", async () => {
      const mockResponse = { data: { objects: [] } };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      await projectsApi.listObjects("proj123", { type: "task" });

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects?type=task",
      );
    });

    it("should fetch objects with multiple filters", async () => {
      const mockResponse = { data: { objects: [] } };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      await projectsApi.listObjects("proj123", {
        type: "task",
        status: "in_progress",
      });

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects?type=task&status=in_progress",
      );
    });

    it("should handle empty parent filter", async () => {
      const mockResponse = { data: { objects: [] } };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      await projectsApi.listObjects("proj123", { parent: "" });

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects?parent=",
      );
    });
  });

  describe("createObject", () => {
    it("should create an object", async () => {
      const mockResponse = {
        data: { id: "obj1", number: 1, readable: "PROJ-1" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.createObject("proj123", {
        type: "task",
        title: "New Task",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/create",
        { type: "task", title: "New Task" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should create object with parent", async () => {
      const mockResponse = { data: { id: "obj2", number: 2 } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createObject("proj123", {
        type: "subtask",
        parent: "obj1",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/create",
        { type: "subtask", parent: "obj1" },
      );
    });
  });

  describe("getObject", () => {
    it("should fetch object details", async () => {
      const mockResponse = {
        data: {
          object: { id: "obj1", type: "task" },
          values: { title: "Test Task" },
          watching: false,
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.getObject("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateObject", () => {
    it("should update object", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateObject("proj123", "obj1", { type: "bug" });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/update",
        { type: "bug" },
      );
    });
  });

  describe("deleteObject", () => {
    it("should delete object", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteObject("proj123", "obj1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/delete",
      );
    });
  });

  describe("moveObject", () => {
    it("should move object to new status", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.moveObject("proj123", "obj1", { status: "done" });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/move",
        { status: "done" },
      );
    });
  });

  describe("setValues", () => {
    it("should set multiple values at once", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.setValues("proj123", "obj1", {
        title: "Updated Title",
        priority: "high",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/values",
        { title: "Updated Title", priority: "high" },
      );
    });
  });

  describe("setValue", () => {
    it("should set a single field value", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.setValue("proj123", "obj1", "status", "in_progress");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/values/status",
        { value: "in_progress" },
      );
    });
  });

  // ============= Comment Methods =============

  describe("listComments", () => {
    it("should fetch comments for an object", async () => {
      const mockResponse = {
        data: {
          comments: [
            { id: "c1", content: "First comment", author: "user1" },
          ],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listComments("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/comments",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createComment", () => {
    it("should create a comment", async () => {
      const mockResponse = {
        data: { id: "c1", content: "New comment", author: "user1" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createComment("proj123", "obj1", "New comment");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/comments/create",
        { content: "New comment", parent: undefined },
      );
    });

    it("should create a reply comment", async () => {
      const mockResponse = { data: { id: "c2" } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createComment("proj123", "obj1", "Reply", "c1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/comments/create",
        { content: "Reply", parent: "c1" },
      );
    });
  });

  describe("updateComment", () => {
    it("should update a comment", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateComment(
        "proj123",
        "obj1",
        "c1",
        "Updated content",
      );

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/comments/c1/update",
        { content: "Updated content" },
      );
    });
  });

  describe("deleteComment", () => {
    it("should delete a comment", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteComment("proj123", "obj1", "c1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/comments/c1/delete",
      );
    });
  });

  // ============= View Methods =============

  describe("listViews", () => {
    it("should fetch project views", async () => {
      const mockResponse = {
        data: {
          views: [{ id: "v1", name: "Board", viewtype: "board" }],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listViews("proj123");

      expect(projectsRequest.get).toHaveBeenCalledWith("proj123/-/views");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createView", () => {
    it("should create a view", async () => {
      const mockResponse = {
        data: { id: "v2", name: "List View", viewtype: "list" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createView("proj123", {
        name: "List View",
        viewtype: "list",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/views/create",
        { name: "List View", viewtype: "list" },
      );
    });
  });

  describe("updateView", () => {
    it("should update a view", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateView("proj123", "v1", {
        name: "Updated Board",
        sort: "priority",
        direction: "desc",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/views/v1/update",
        { name: "Updated Board", sort: "priority", direction: "desc" },
      );
    });
  });

  describe("deleteView", () => {
    it("should delete a view", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteView("proj123", "v1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/views/v1/delete",
      );
    });
  });

  // ============= Type Methods =============

  describe("listTypes", () => {
    it("should fetch project types", async () => {
      const mockResponse = {
        data: { types: [{ id: "task", name: "Task", sort: 0 }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listTypes("proj123");

      expect(projectsRequest.get).toHaveBeenCalledWith("proj123/-/types");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createType", () => {
    it("should create a type", async () => {
      const mockResponse = { data: { id: "bug", name: "Bug", sort: 1 } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createType("proj123", { name: "Bug" });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/create",
        { name: "Bug" },
      );
    });
  });

  describe("updateType", () => {
    it("should update a type", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateType("proj123", "task", { name: "Issue" });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/update",
        { name: "Issue" },
      );
    });
  });

  describe("deleteType", () => {
    it("should delete a type", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteType("proj123", "bug");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/bug/delete",
      );
    });
  });

  // ============= Field Methods =============

  describe("listFields", () => {
    it("should fetch fields for a type", async () => {
      const mockResponse = {
        data: {
          fields: [{ id: "title", name: "Title", fieldtype: "text" }],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listFields("proj123", "task");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/types/task/fields",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createField", () => {
    it("should create a field", async () => {
      const mockResponse = {
        data: { id: "priority", name: "Priority", fieldtype: "select", sort: 3 },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createField("proj123", "task", {
        name: "Priority",
        fieldtype: "select",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/create",
        { name: "Priority", fieldtype: "select" },
      );
    });
  });

  describe("updateField", () => {
    it("should update a field", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateField("proj123", "task", "priority", {
        required: "1",
        position: "card",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/update",
        { required: "1", position: "card" },
      );
    });
  });

  describe("deleteField", () => {
    it("should delete a field", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteField("proj123", "task", "priority");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/delete",
      );
    });
  });

  describe("reorderFields", () => {
    it("should reorder fields", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.reorderFields("proj123", "task", [
        "title",
        "status",
        "priority",
      ]);

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/reorder",
        { order: "title,status,priority" },
      );
    });
  });

  // ============= Option Methods =============

  describe("listOptions", () => {
    it("should fetch options for a field", async () => {
      const mockResponse = {
        data: {
          options: [{ id: "high", name: "High", colour: "#ff0000" }],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listOptions(
        "proj123",
        "task",
        "priority",
      );

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/options",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createOption", () => {
    it("should create an option", async () => {
      const mockResponse = {
        data: { id: "critical", name: "Critical", colour: "#ff0000", sort: 0 },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createOption("proj123", "task", "priority", {
        name: "Critical",
        colour: "#ff0000",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/options/create",
        { name: "Critical", colour: "#ff0000" },
      );
    });
  });

  describe("updateOption", () => {
    it("should update an option", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.updateOption("proj123", "task", "priority", "high", {
        colour: "#ff5500",
      });

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/options/high/update",
        { colour: "#ff5500" },
      );
    });
  });

  describe("deleteOption", () => {
    it("should delete an option", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteOption("proj123", "task", "priority", "low");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/options/low/delete",
      );
    });
  });

  describe("reorderOptions", () => {
    it("should reorder options", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.reorderOptions("proj123", "task", "priority", [
        "critical",
        "high",
        "medium",
        "low",
      ]);

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/fields/priority/options/reorder",
        { order: "critical,high,medium,low" },
      );
    });
  });

  // ============= Watcher Methods =============

  describe("listWatchers", () => {
    it("should fetch watchers for an object", async () => {
      const mockResponse = {
        data: { watchers: [{ id: "user1", name: "User 1" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listWatchers("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/watchers",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("addWatcher", () => {
    it("should add current user as watcher", async () => {
      const mockResponse = { data: { success: true, watching: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.addWatcher("proj123", "obj1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/watchers/add",
      );
      expect(result.data.watching).toBe(true);
    });
  });

  describe("removeWatcher", () => {
    it("should remove current user as watcher", async () => {
      const mockResponse = { data: { success: true, watching: false } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.removeWatcher("proj123", "obj1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/watchers/remove",
      );
      expect(result.data.watching).toBe(false);
    });
  });

  // ============= Link Methods =============

  describe("listLinks", () => {
    it("should fetch links for an object", async () => {
      const mockResponse = {
        data: { links: [{ target: "obj2", linktype: "blocks" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listLinks("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/links",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createLink", () => {
    it("should create a link between objects", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.createLink("proj123", "obj1", "obj2", "blocks");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/links/create",
        { target: "obj2", linktype: "blocks" },
      );
    });
  });

  describe("deleteLink", () => {
    it("should delete a link", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteLink("proj123", "obj1", "obj2", "blocks");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/links/delete",
        { target: "obj2", linktype: "blocks" },
      );
    });
  });

  // ============= Hierarchy Methods =============

  describe("getHierarchy", () => {
    it("should fetch hierarchy for a type", async () => {
      const mockResponse = { data: { parents: ["epic", "story"] } };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.getHierarchy("proj123", "task");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/types/task/hierarchy",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("setHierarchy", () => {
    it("should set hierarchy for a type", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.setHierarchy("proj123", "subtask", ["task", "bug"]);

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/subtask/hierarchy/set",
        { parents: "task,bug" },
      );
    });

    it("should handle empty hierarchy", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.setHierarchy("proj123", "task", []);

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/types/task/hierarchy/set",
        { parents: "" },
      );
    });
  });

  // ============= Activity Methods =============

  describe("listActivity", () => {
    it("should fetch activity for an object", async () => {
      const mockResponse = {
        data: {
          activities: [
            { id: "a1", action: "created", created: Date.now() },
          ],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listActivity("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/activity",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ============= Repository Methods =============

  describe("listRepositories", () => {
    it("should fetch available repositories", async () => {
      const mockResponse = {
        data: { repositories: [{ id: "repo1", name: "main-repo" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listRepositories();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/repositories");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getRepositoryBranches", () => {
    it("should fetch branches for a repository", async () => {
      const mockResponse = {
        data: { branches: ["main", "develop", "feature/test"] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.getRepositoryBranches("repo1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "-/repositories/repo1/branches",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("checkMerge", () => {
    it("should check merge compatibility", async () => {
      const mockResponse = {
        data: { can_merge: true, conflicts: [] },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.checkMerge(
        "repo1",
        "feature/test",
        "main",
      );

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/merge/check",
        { source: "feature/test", target: "main" },
      );
      expect(result.data.can_merge).toBe(true);
    });

    it("should return conflicts when merge is not possible", async () => {
      const mockResponse = {
        data: { can_merge: false, conflicts: ["file1.ts", "file2.ts"] },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.checkMerge(
        "repo1",
        "feature/conflict",
        "main",
      );

      expect(result.data.can_merge).toBe(false);
      expect(result.data.conflicts).toHaveLength(2);
    });
  });

  describe("getDiff", () => {
    it("should fetch diff between branches", async () => {
      const mockResponse = {
        data: {
          files: [
            { path: "file1.ts", status: "modified", additions: 50, deletions: 20 },
          ],
          additions: 100,
          deletions: 20,
          diff: "diff content",
        },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.getDiff("repo1", "main", "feature/test");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/diff",
        { base: "main", head: "feature/test" },
      );
      expect(result.data.files).toHaveLength(1);
    });
  });

  describe("merge", () => {
    it("should perform merge", async () => {
      const mockResponse = {
        data: { success: true, commit: "abc123" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.merge(
        "repo1",
        "feature/test",
        "main",
        "Merge feature/test into main",
      );

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/merge",
        {
          source: "feature/test",
          target: "main",
          message: "Merge feature/test into main",
        },
      );
      expect(result.data.success).toBe(true);
    });
  });

  // ============= Attachment Methods =============

  describe("listAttachments", () => {
    it("should fetch attachments for an object", async () => {
      const mockResponse = {
        data: { attachments: [{ id: "att1", filename: "file.pdf" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listAttachments("proj123", "obj1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/attachments",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteAttachment", () => {
    it("should delete an attachment", async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      await projectsApi.deleteAttachment("proj123", "obj1", "att1");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "proj123/-/objects/obj1/attachments/att1/delete",
      );
    });
  });
});
