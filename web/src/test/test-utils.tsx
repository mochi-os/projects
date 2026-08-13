// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// The render wrapper and every fixture over the shared object model live in
// @mochi/web — see components/entity/entity-test-utils. What stays here is what projects adds
// on top of it: the container's prefix, the per-class requests setting, and the
// human-readable issue identifier crm has no equivalent for.
import {
  createMockEntityClass,
  createMockEntityDesign,
  createMockEntityObject,
  createMockEntityOption,
  createMockEntityField,
  createMockEntityView,
} from "@mochi/web/components/entity/entity-test-utils";
import type {
  Project,
  ProjectClass,
  ProjectDetails,
  ProjectObject,
} from "@/types";

export * from "@mochi/web/components/entity/entity-test-utils";

export {
  createMockEntityField as createMockField,
  createMockEntityOption as createMockOption,
  createMockEntityView as createMockView,
};

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: "proj-1",
    fingerprint: "abc123def",
    name: "Test Project",
    description: "A test project",
    prefix: "TEST",
    owner: 1,
    ownername: "testuser",
    server: "local",
    created: Date.now(),
    updated: Date.now(),
    populated: 1,
    access: "owner",
    ...overrides,
  };
}

export function createMockClass(
  overrides?: Partial<ProjectClass>,
): ProjectClass {
  return { ...createMockEntityClass(), requests: "", ...overrides };
}

export function createMockObject(
  overrides?: Partial<ProjectObject>,
): ProjectObject {
  return {
    ...createMockEntityObject(),
    project: "proj-1",
    number: 1,
    readable: "TEST-1",
    ...overrides,
  };
}

export function createMockObjects(count: number): ProjectObject[] {
  return Array.from({ length: count }, (_, i) =>
    createMockObject({
      id: `obj-${i + 1}`,
      number: i + 1,
      readable: `TEST-${i + 1}`,
      values: {
        title: `Task ${i + 1}`,
        status: ["todo", "in_progress", "done"][i % 3],
        priority: ["high", "medium", "low"][i % 3],
      },
    }),
  );
}

export function createMockProjectDetails(
  overrides?: Partial<ProjectDetails>,
): ProjectDetails {
  return {
    project: createMockProject(),
    ...createMockEntityDesign(),
    classes: [createMockClass()],
    ...overrides,
  };
}
