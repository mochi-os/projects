// Tests for DiffStats component
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { DiffStats } from "./diff-stats";
import projectsApi from "@/api/projects";

// Mock the API module
vi.mock("@/api/projects", () => ({
  default: {
    getDiff: vi.fn(),
  },
}));

describe("DiffStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when repoId is empty", () => {
    const { container } = render(
      <DiffStats repoId="" base="main" head="feature" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should return null when base is empty", () => {
    const { container } = render(
      <DiffStats repoId="repo1" base="" head="feature" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should return null when head is empty", () => {
    const { container } = render(
      <DiffStats repoId="repo1" base="main" head="" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should show loading state while fetching", async () => {
    // Create a promise that won't resolve immediately
    vi.mocked(projectsApi.getDiff).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    expect(screen.getByText("Loading diff...")).toBeInTheDocument();
  });

  it("should show no changes message when files array is empty", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: { files: [], additions: 0, deletions: 0, diff: "" },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("No changes detected")).toBeInTheDocument();
    });
  });

  it("should display file count", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "file1.ts", status: "modified", additions: 10, deletions: 5 },
          { path: "file2.ts", status: "added", additions: 20, deletions: 0 },
        ],
        additions: 30,
        deletions: 5,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("2 files changed")).toBeInTheDocument();
    });
  });

  it("should display total additions", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "file1.ts", status: "modified", additions: 30, deletions: 5 },
        ],
        additions: 30,
        deletions: 5,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("30")).toBeInTheDocument();
    });
  });

  it("should display total deletions", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "file1.ts", status: "modified", additions: 10, deletions: 15 },
        ],
        additions: 10,
        deletions: 15,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument();
    });
  });

  it("should display file paths", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          {
            path: "src/utils/helpers.ts",
            status: "modified",
            additions: 5,
            deletions: 2,
          },
          {
            path: "package.json",
            status: "modified",
            additions: 1,
            deletions: 1,
          },
        ],
        additions: 6,
        deletions: 3,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("src/utils/helpers.ts")).toBeInTheDocument();
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });
  });

  it("should display per-file additions", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "file1.ts", status: "added", additions: 50, deletions: 0 },
        ],
        additions: 50,
        deletions: 0,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("+50")).toBeInTheDocument();
    });
  });

  it("should display per-file deletions", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "file1.ts", status: "modified", additions: 0, deletions: 25 },
        ],
        additions: 0,
        deletions: 25,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("-25")).toBeInTheDocument();
    });
  });

  it("should not show per-file additions when 0", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "deleted.ts", status: "deleted", additions: 0, deletions: 100 },
        ],
        additions: 0,
        deletions: 100,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.queryByText("+0")).not.toBeInTheDocument();
    });
  });

  it("should not show per-file deletions when 0", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "new.ts", status: "added", additions: 100, deletions: 0 },
        ],
        additions: 100,
        deletions: 0,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.queryByText("-0")).not.toBeInTheDocument();
    });
  });

  it("should render status indicators for different file statuses", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: {
        files: [
          { path: "added.ts", status: "added", additions: 10, deletions: 0 },
          { path: "modified.ts", status: "modified", additions: 5, deletions: 3 },
          { path: "deleted.ts", status: "deleted", additions: 0, deletions: 20 },
          { path: "renamed.ts", status: "renamed", additions: 0, deletions: 0 },
        ],
        additions: 15,
        deletions: 23,
        diff: "",
      },
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("added.ts")).toBeInTheDocument();
      expect(screen.getByText("modified.ts")).toBeInTheDocument();
      expect(screen.getByText("deleted.ts")).toBeInTheDocument();
      expect(screen.getByText("renamed.ts")).toBeInTheDocument();
    });
  });
});
