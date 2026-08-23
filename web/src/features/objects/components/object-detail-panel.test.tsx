// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings -- vitest names and fixtures are not user-facing */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  createMockProjectDetails,
  createMockClass,
  createMockField,
  createMockObject,
} from "@/test/test-utils";
import { ObjectDetailPanel } from "./object-detail-panel";
import projectsApi from "@/api/projects";

// vi.mock is hoisted above the file's own consts, so the spy has to be too.
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("@/api/projects", () => ({
  default: {
    getObject: vi.fn(),
    listPeople: vi.fn(),
    listObjects: vi.fn(),
    setValue: vi.fn(),
    addWatcher: vi.fn(),
    removeWatcher: vi.fn(),
    deleteObject: vi.fn(),
    updateObject: vi.fn(),
  },
}));

vi.mock("@mochi/web", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mochi/web")>();
  return { ...actual, toast: { ...actual.toast, error: toastError } };
});

const api = vi.mocked(projectsApi);

const titleField = createMockField({ id: "title", name: "Title", fieldtype: "text" });
// Fields hang off the design keyed by class id, not off the class itself.
const projectClass = createMockClass({ id: "task", name: "Task", title: "title" });
// A task may parent a task, so the Parent select has something to offer.
const project = createMockProjectDetails({
  classes: [projectClass],
  fields: { task: [titleField] },
  hierarchy: { task: ["task"] },
});
const object = createMockObject({
  id: "obj-1",
  class: "task",
  values: { title: "Original" },
});

const sibling = createMockObject({
  id: "obj-2",
  class: "task",
  values: { title: "Sibling" },
});

// Radix Select drives these, and jsdom implements neither.
beforeEach(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

function renderPanel() {
  return render(
    <ObjectDetailPanel
      projectId="proj-1"
      objectId="obj-1"
      project={project}
      access="owner"
      onClose={() => {}}
    />,
  );
}

describe("ObjectDetailPanel failure reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getObject wraps: the panel reads data.object, data.values and data.watching.
    api.getObject.mockResolvedValue({
      data: {
        object,
        values: { title: "Original" },
        watching: false,
        people: [],
        requests: [],
        incoming: [],
        outgoing: [],
        comment_count: 0,
      },
    } as never);
    api.listPeople.mockResolvedValue({ data: { people: [] } } as never);
    api.listObjects.mockResolvedValue({ data: { objects: [object, sibling] } } as never);
  });

  it("says so when a field edit is rejected", async () => {
    // EntityFieldEditor commits fire-and-forget and keeps the typed text, so
    // without onError a refused save is indistinguishable from a saved one.
    api.setValue.mockRejectedValue({ response: { status: 403 } });
    renderPanel();

    const input = await screen.findByDisplayValue("Original");
    fireEvent.change(input, { target: { value: "Edited" } });
    fireEvent.blur(input);

    await waitFor(() => expect(api.setValue).toHaveBeenCalled());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Failed to save"));
  });

  it("stays silent when the field edit succeeds", async () => {
    api.setValue.mockResolvedValue({ data: {} } as never);
    renderPanel();

    const input = await screen.findByDisplayValue("Original");
    fireEvent.change(input, { target: { value: "Edited" } });
    fireEvent.blur(input);

    await waitFor(() => expect(api.setValue).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });

  it("says so when watching cannot be changed", async () => {
    api.addWatcher.mockRejectedValue({ response: { status: 500 } });
    renderPanel();

    fireEvent.click(await screen.findByLabelText("Watch"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Failed to update watching"));
  });

  it("says so when the delete is refused", async () => {
    api.deleteObject.mockRejectedValue({ response: { status: 403 } });
    renderPanel();

    fireEvent.click(await screen.findByLabelText("Delete item"));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Failed to delete"));
  });

  it("says so when the reparent is refused", async () => {
    api.updateObject.mockRejectedValue({ response: { status: 409 } });
    renderPanel();

    fireEvent.click(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Sibling" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Failed to move"));
  });
});
