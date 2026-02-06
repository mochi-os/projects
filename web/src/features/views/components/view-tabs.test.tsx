// Tests for ViewTabs component
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, createMockView } from "@/test/test-utils";
import { ViewTabs } from "./view-tabs";

describe("ViewTabs", () => {
  const boardView = createMockView({ id: "board", name: "Board", viewtype: "board" });
  const treeView = createMockView({ id: "tree", name: "Tree", viewtype: "tree" });
  const defaultViews = [boardView, treeView];

  it("should render all views", () => {
    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("Tree")).toBeInTheDocument();
  });

  it("should call onViewChange when a view is clicked", () => {
    const onViewChange = vi.fn();

    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={onViewChange}
      />,
    );

    fireEvent.click(screen.getByText("Tree"));

    expect(onViewChange).toHaveBeenCalledWith("tree");
  });

  it("should highlight active view", () => {
    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={vi.fn()}
      />,
    );

    const boardButton = screen.getByText("Board").closest("button");
    const treeButton = screen.getByText("Tree").closest("button");

    expect(boardButton).toHaveClass("border-primary");
    expect(treeButton).not.toHaveClass("border-primary");
  });

  it("should render add view button when onAddView is provided", () => {
    const onAddView = vi.fn();

    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={vi.fn()}
        onAddView={onAddView}
      />,
    );

    const addButton = screen.getByTitle("Add view");
    expect(addButton).toBeInTheDocument();
  });

  it("should not render add view button when onAddView is not provided", () => {
    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={vi.fn()}
      />,
    );

    expect(screen.queryByTitle("Add view")).not.toBeInTheDocument();
  });

  it("should call onAddView when add button is clicked", () => {
    const onAddView = vi.fn();

    render(
      <ViewTabs
        views={defaultViews}
        activeViewId="board"
        onViewChange={vi.fn()}
        onAddView={onAddView}
      />,
    );

    fireEvent.click(screen.getByTitle("Add view"));

    expect(onAddView).toHaveBeenCalledTimes(1);
  });

  it("should render correct icon for board view", () => {
    render(
      <ViewTabs
        views={[boardView]}
        activeViewId="board"
        onViewChange={vi.fn()}
      />,
    );

    // LayoutGrid icon is used for board view
    const button = screen.getByText("Board").closest("button");
    const svg = button?.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render correct icon for tree view", () => {
    render(
      <ViewTabs
        views={[treeView]}
        activeViewId="tree"
        onViewChange={vi.fn()}
      />,
    );

    // ListTree icon is used for tree view
    const button = screen.getByText("Tree").closest("button");
    const svg = button?.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should handle empty views array", () => {
    render(
      <ViewTabs views={[]} activeViewId="" onViewChange={vi.fn()} />,
    );

    // Should not crash and should render empty container
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should handle unknown view types", () => {
    const unknownView = createMockView({
      id: "custom",
      name: "Custom",
      viewtype: "unknown" as "board",
    });

    render(
      <ViewTabs
        views={[unknownView]}
        activeViewId="custom"
        onViewChange={vi.fn()}
      />,
    );

    // Should fall back to board icon (LayoutGrid) for unknown types
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
