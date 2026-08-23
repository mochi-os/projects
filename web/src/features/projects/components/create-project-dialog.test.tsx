// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings -- vitest names and fixtures are not user-facing */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@/test/test-utils";
import { CreateProjectDialog } from "./create-project-dialog";
import projectsApi from "@/api/projects";

vi.mock("@/api/projects", () => ({
  default: {
    templates: vi.fn(),
    create: vi.fn(),
    importData: vi.fn(),
    importDesign: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/stores/projects-store", () => ({
  useProjectsStore: (select: (s: { refresh: () => Promise<void> }) => unknown) =>
    select({ refresh: async () => {} }),
}));

const api = vi.mocked(projectsApi);

// The chip's remove control is icon-only, so reach it through the attachment
// it belongs to rather than by an accessible name it does not have.
function removeButton(fileName: string): HTMLElement {
  const chip = screen.getByText(fileName).closest('[data-slot="attachment"]');
  if (!chip) throw new Error(`no attachment chip for ${fileName}`);
  return within(chip as HTMLElement).getByRole("button");
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("CreateProjectDialog import selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.templates.mockResolvedValue({ data: { templates: [
      { id: "blank", name: "Blank", description: "", classes: [] },
    ] } } as never);
    api.create.mockResolvedValue({ data: { fingerprint: "fp1" } } as never);
    api.importData.mockResolvedValue({ data: { objects: 0, comments: 0, links: 0 } } as never);
  });

  it("does not upload an archive the user removed", async () => {
    render(<CreateProjectDialog open onOpenChange={() => {}} hideTrigger />);

    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: "Fresh" } });
    selectFile(new File(["PK"], "backup.zip", { type: "application/zip" }));
    expect(await screen.findByText("backup.zip")).toBeInTheDocument();

    fireEvent.click(removeButton("backup.zip"));
    await waitFor(() => expect(screen.queryByText("backup.zip")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByText("Blank"));
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => expect(api.create).toHaveBeenCalled());
    // The archive branch is `importArchive && importFile`; leaving either set
    // uploads a file the user took off, and its failure path then deletes the
    // project that was just created.
    expect(api.importData).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("still uploads an archive the user kept", async () => {
    render(<CreateProjectDialog open onOpenChange={() => {}} hideTrigger />);

    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: "Restored" } });
    selectFile(new File(["PK"], "backup.zip", { type: "application/zip" }));
    expect(await screen.findByText("backup.zip")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByText("Blank"));
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    // Guards the other direction: the fix must not disarm a live selection.
    await waitFor(() => expect(api.importData).toHaveBeenCalled());
  });
});
