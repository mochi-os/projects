// Tests for FilterBar component
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  createMockProjectDetails,
} from "@/test/test-utils";
import { FilterBar, type FilterState } from "./filter-bar";

describe("FilterBar", () => {
  const mockProject = createMockProjectDetails();
  const defaultFilters: FilterState = {
    search: "",
    status: "",
    priority: "",
    assignee: "",
  };
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search input", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("should render status filter button when status options exist", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByRole("button", { name: /status/i })).toBeInTheDocument();
  });

  it("should render priority filter button when priority options exist", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: /priority/i }),
    ).toBeInTheDocument();
  });

  it("should call onFilterChange when search value changes", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: "test query",
    });
  });

  it("should clear search when Escape is pressed", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{ ...defaultFilters, search: "existing search" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.keyDown(searchInput, { key: "Escape" });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: "",
    });
  });

  it("should show active filter chips when filters are applied", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{ ...defaultFilters, search: "my search" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Search:")).toBeInTheDocument();
    expect(screen.getByText("my search")).toBeInTheDocument();
  });

  it("should show clear filters button when filters are active", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{ ...defaultFilters, status: "todo" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("should not show clear filters button when no filters are active", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("should clear all filters when clear button is clicked", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{
          search: "test",
          status: "todo",
          priority: "high",
          assignee: "",
        }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: "",
      status: "",
      priority: "",
      assignee: "",
    });
  });

  it("should display status filter chip with option name", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{ ...defaultFilters, status: "in_progress" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("should display priority filter chip with option name", () => {
    render(
      <FilterBar
        project={mockProject}
        filters={{ ...defaultFilters, priority: "high" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Priority:")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("should not render filters when project has no task fields", () => {
    const emptyProject = createMockProjectDetails({
      fields: {},
      options: {},
    });

    render(
      <FilterBar
        project={emptyProject}
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    // Search should still be present
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();

    // But no filter buttons
    expect(
      screen.queryByRole("button", { name: /status/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /priority/i }),
    ).not.toBeInTheDocument();
  });
});
