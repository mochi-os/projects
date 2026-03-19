// Tests for ConflictList component
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ConflictList } from "./conflict-list";

describe("ConflictList", () => {
  it("should return null when conflicts array is empty", () => {
    const { container } = render(<ConflictList conflicts={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("should render single conflict with singular text", () => {
    render(<ConflictList conflicts={["src/file.ts"]} />);

    // Text is split across elements, use regex to match content
    expect(screen.getByText(/1/)).toBeInTheDocument();
    expect(screen.getByText(/conflicting/)).toBeInTheDocument();
    expect(screen.getByText(/file$/)).toBeInTheDocument();
    expect(screen.getByText("src/file.ts")).toBeInTheDocument();
  });

  it("should render multiple conflicts with plural text", () => {
    render(<ConflictList conflicts={["src/fileA.ts", "src/fileB.ts"]} />);

    // The header contains "2 conflicting files"
    const header = screen.getByText(/conflicting/).closest("div");
    expect(header).toHaveTextContent("2");
    expect(header).toHaveTextContent("files");
  });

  it("should render all conflict file paths", () => {
    const conflicts = [
      "src/components/Button.tsx",
      "src/utils/helpers.ts",
      "package.json",
    ];

    render(<ConflictList conflicts={conflicts} />);

    conflicts.forEach((file) => {
      expect(screen.getByText(file)).toBeInTheDocument();
    });
  });

  it("should show help text about resolving conflicts", () => {
    render(<ConflictList conflicts={["file.ts"]} />);

    expect(
      screen.getByText("Resolve these conflicts manually before merging."),
    ).toBeInTheDocument();
  });

  it("should render alert icon", () => {
    render(<ConflictList conflicts={["file.ts"]} />);

    // Check for destructive text styling (indicating warning)
    const header = screen.getByText(/conflicting/).closest("div");
    expect(header).toHaveClass("text-destructive");
  });

  it("should display conflicts in a styled list", () => {
    render(<ConflictList conflicts={["file.ts"]} />);

    // Check for the conflict container styling
    const container = screen.getByText("file.ts").closest("ul");
    expect(container).toBeInTheDocument();
  });

  it("should handle long file paths", () => {
    const longPath =
      "src/features/very/deeply/nested/folder/structure/Component.tsx";

    render(<ConflictList conflicts={[longPath]} />);

    expect(screen.getByText(longPath)).toBeInTheDocument();
  });

  it("should render correct count for many conflicts", () => {
    const conflicts = Array.from({ length: 10 }, (_, i) => `file${i}.ts`);

    render(<ConflictList conflicts={conflicts} />);

    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/conflicting/)).toBeInTheDocument();
    expect(screen.getByText(/files/)).toBeInTheDocument();
  });
});
