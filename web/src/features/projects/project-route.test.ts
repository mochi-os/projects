// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings -- vitest names and fixtures are not user-facing */
// Not colocated under src/routes: the TanStack route generator has no
// routeFileIgnorePattern configured, so any file there becomes a route.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRedirect } from "@tanstack/react-router";

const toastError = vi.fn();

vi.mock("@/api/projects", () => ({ default: { get: vi.fn() } }));

vi.mock("@mochi/web", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mochi/web")>();
  return { ...actual, toast: { ...actual.toast, error: toastError } };
});

const { Route } = await import("@/routes/_authenticated/$projectId/index");
const projectsApi = (await import("@/api/projects")).default;

const api = vi.mocked(projectsApi);
const loader = Route.options.loader as (context: {
  params: { projectId: string };
}) => Promise<{ project: unknown; loaderError: string | null }>;

function httpError(status: number) {
  return { response: { status } };
}

async function runLoader(projectId = "p1") {
  return loader({ params: { projectId } });
}

describe("project route loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a forbidden project from the loader, not the component", async () => {
    // The component instance is reused across a project-to-project navigation,
    // so a redirect that lives in a mount effect never runs and the page is
    // left blank. Only a loader throw survives that.
    api.get.mockRejectedValue(httpError(403));
    const thrown = await runLoader().then(
      () => null,
      (e: unknown) => e,
    );
    expect(thrown).not.toBeNull();
    expect(isRedirect(thrown)).toBe(true);
    // redirect() builds a Response and hangs the original options off it.
    expect((thrown as { options?: { to?: string } }).options?.to).toBe("/");
  });

  it("says why, rather than bouncing the user silently", async () => {
    api.get.mockRejectedValue(httpError(403));
    await runLoader().catch(() => {});
    expect(toastError).toHaveBeenCalledWith("You don't have access to this project.");
  });

  it("still redirects a missing project", async () => {
    api.get.mockRejectedValue(httpError(404));
    const thrown = await runLoader().then(
      () => null,
      (e: unknown) => e,
    );
    expect(isRedirect(thrown)).toBe(true);
  });

  it("keeps other failures on the page as a retryable error", async () => {
    // 500 must NOT redirect: EntityLoadError offers a retry, and bouncing the
    // user home would throw away a transient failure they could recover from.
    api.get.mockRejectedValue(httpError(500));
    const data = await runLoader();
    expect(data.project).toBeNull();
    expect(data.loaderError).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("returns the project when it loads", async () => {
    api.get.mockResolvedValue({ data: { project: { id: "p1" } } } as never);
    const data = await runLoader();
    expect(data.project).toEqual({ project: { id: "p1" } });
    expect(data.loaderError).toBeNull();
  });
});
