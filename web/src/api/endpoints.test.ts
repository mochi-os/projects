// Tests for API endpoint URL generation
import { describe, it, expect } from "vitest";
import endpoints from "./endpoints";

describe("endpoints.projects", () => {
  describe("class-level endpoints (static strings)", () => {
    it("should have list endpoint", () => {
      expect(endpoints.projects.list).toBe("-/list");
    });

    it("should have create endpoint", () => {
      expect(endpoints.projects.create).toBe("-/create");
    });

    it("should have templates endpoint", () => {
      expect(endpoints.projects.templates).toBe("-/templates");
    });

    it("should have repositories endpoint", () => {
      expect(endpoints.projects.repositories).toBe("-/repositories");
    });
  });

  describe("entity-level project endpoints", () => {
    it("should generate info endpoint with project ID", () => {
      expect(endpoints.projects.info("abc123")).toBe("abc123/-/info");
    });

    it("should generate update endpoint with project ID", () => {
      expect(endpoints.projects.update("abc123")).toBe("abc123/-/update");
    });

    it("should generate delete endpoint with project ID", () => {
      expect(endpoints.projects.delete("abc123")).toBe("abc123/-/delete");
    });
  });

  describe("object endpoints", () => {
    it("should generate objects list endpoint", () => {
      expect(endpoints.projects.objects("proj1")).toBe("proj1/-/objects");
    });

    it("should generate object create endpoint", () => {
      expect(endpoints.projects.objectCreate("proj1")).toBe(
        "proj1/-/objects/create",
      );
    });

    it("should generate object get endpoint", () => {
      expect(endpoints.projects.object("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1",
      );
    });

    it("should generate object update endpoint", () => {
      expect(endpoints.projects.objectUpdate("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/update",
      );
    });

    it("should generate object delete endpoint", () => {
      expect(endpoints.projects.objectDelete("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/delete",
      );
    });

    it("should generate object move endpoint", () => {
      expect(endpoints.projects.objectMove("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/move",
      );
    });
  });

  describe("value endpoints", () => {
    it("should generate values set endpoint", () => {
      expect(endpoints.projects.valuesSet("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/values",
      );
    });

    it("should generate single value set endpoint", () => {
      expect(endpoints.projects.valueSet("proj1", "obj1", "status")).toBe(
        "proj1/-/objects/obj1/values/status",
      );
    });
  });

  describe("view endpoints", () => {
    it("should generate views list endpoint", () => {
      expect(endpoints.projects.views("proj1")).toBe("proj1/-/views");
    });

    it("should generate view create endpoint", () => {
      expect(endpoints.projects.viewCreate("proj1")).toBe(
        "proj1/-/views/create",
      );
    });

    it("should generate view update endpoint", () => {
      expect(endpoints.projects.viewUpdate("proj1", "view1")).toBe(
        "proj1/-/views/view1/update",
      );
    });

    it("should generate view delete endpoint", () => {
      expect(endpoints.projects.viewDelete("proj1", "view1")).toBe(
        "proj1/-/views/view1/delete",
      );
    });
  });

  describe("type endpoints", () => {
    it("should generate types list endpoint", () => {
      expect(endpoints.projects.types("proj1")).toBe("proj1/-/types");
    });

    it("should generate type create endpoint", () => {
      expect(endpoints.projects.typeCreate("proj1")).toBe(
        "proj1/-/types/create",
      );
    });

    it("should generate type update endpoint", () => {
      expect(endpoints.projects.typeUpdate("proj1", "task")).toBe(
        "proj1/-/types/task/update",
      );
    });

    it("should generate type delete endpoint", () => {
      expect(endpoints.projects.typeDelete("proj1", "task")).toBe(
        "proj1/-/types/task/delete",
      );
    });
  });

  describe("field endpoints", () => {
    it("should generate fields list endpoint", () => {
      expect(endpoints.projects.fields("proj1", "task")).toBe(
        "proj1/-/types/task/fields",
      );
    });

    it("should generate field create endpoint", () => {
      expect(endpoints.projects.fieldCreate("proj1", "task")).toBe(
        "proj1/-/types/task/fields/create",
      );
    });

    it("should generate field reorder endpoint", () => {
      expect(endpoints.projects.fieldReorder("proj1", "task")).toBe(
        "proj1/-/types/task/fields/reorder",
      );
    });

    it("should generate field update endpoint", () => {
      expect(endpoints.projects.fieldUpdate("proj1", "task", "field1")).toBe(
        "proj1/-/types/task/fields/field1/update",
      );
    });

    it("should generate field delete endpoint", () => {
      expect(endpoints.projects.fieldDelete("proj1", "task", "field1")).toBe(
        "proj1/-/types/task/fields/field1/delete",
      );
    });
  });

  describe("option endpoints", () => {
    it("should generate options list endpoint", () => {
      expect(endpoints.projects.options("proj1", "task", "status")).toBe(
        "proj1/-/types/task/fields/status/options",
      );
    });

    it("should generate option create endpoint", () => {
      expect(endpoints.projects.optionCreate("proj1", "task", "status")).toBe(
        "proj1/-/types/task/fields/status/options/create",
      );
    });

    it("should generate option update endpoint", () => {
      expect(
        endpoints.projects.optionUpdate("proj1", "task", "status", "opt1"),
      ).toBe("proj1/-/types/task/fields/status/options/opt1/update");
    });

    it("should generate option delete endpoint", () => {
      expect(
        endpoints.projects.optionDelete("proj1", "task", "status", "opt1"),
      ).toBe("proj1/-/types/task/fields/status/options/opt1/delete");
    });
  });

  describe("comment endpoints", () => {
    it("should generate comments list endpoint", () => {
      expect(endpoints.projects.comments("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/comments",
      );
    });

    it("should generate comment create endpoint", () => {
      expect(endpoints.projects.commentCreate("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/comments/create",
      );
    });

    it("should generate comment update endpoint", () => {
      expect(endpoints.projects.commentUpdate("proj1", "obj1", "comment1")).toBe(
        "proj1/-/objects/obj1/comments/comment1/update",
      );
    });

    it("should generate comment delete endpoint", () => {
      expect(endpoints.projects.commentDelete("proj1", "obj1", "comment1")).toBe(
        "proj1/-/objects/obj1/comments/comment1/delete",
      );
    });
  });

  describe("repository integration endpoints", () => {
    it("should generate repository branches endpoint", () => {
      expect(endpoints.projects.repositoryBranches("repo1")).toBe(
        "-/repositories/repo1/branches",
      );
    });

    it("should generate repository merge check endpoint", () => {
      expect(endpoints.projects.repositoryMergeCheck("repo1")).toBe(
        "-/repositories/repo1/merge/check",
      );
    });

    it("should generate repository diff endpoint", () => {
      expect(endpoints.projects.repositoryDiff("repo1")).toBe(
        "-/repositories/repo1/diff",
      );
    });

    it("should generate repository merge endpoint", () => {
      expect(endpoints.projects.repositoryMerge("repo1")).toBe(
        "-/repositories/repo1/merge",
      );
    });
  });

  describe("watcher endpoints", () => {
    it("should generate watchers list endpoint", () => {
      expect(endpoints.projects.watchers("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/watchers",
      );
    });

    it("should generate watcher add endpoint", () => {
      expect(endpoints.projects.watcherAdd("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/watchers/add",
      );
    });

    it("should generate watcher remove endpoint", () => {
      expect(endpoints.projects.watcherRemove("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/watchers/remove",
      );
    });
  });

  describe("activity endpoint", () => {
    it("should generate activity endpoint", () => {
      expect(endpoints.projects.activity("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/activity",
      );
    });
  });
});
