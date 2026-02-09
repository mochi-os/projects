// Tests for FilterBar component (shows active filter chips)
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
    owner: "",
  };
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when no filters are active", () => {
    const { container } = render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should show search filter chip when search is active", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, search: "my search" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Search:")).toBeInTheDocument();
    expect(screen.getByText("my search")).toBeInTheDocument();
  });

  it("should show status filter chip with option name", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, status: "in_progress" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("should show priority filter chip with option name", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, priority: "high" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Priority:")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("should clear individual filter when X button is clicked", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, status: "todo" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    // Click the X button on the status chip
    const clearButtons = screen.getAllByRole("button");
    fireEvent.click(clearButtons[0]);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      status: "",
    });
  });

  it("should show clear all button when multiple filters are active", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{
          search: "test",
          status: "todo",
          priority: "",
          owner: "",
        }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("should not show clear all button when only one filter is active", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, status: "todo" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("should clear all filters when clear all button is clicked", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{
          search: "test",
          status: "todo",
          priority: "high",
          owner: "",
        }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    fireEvent.click(screen.getByText("Clear all"));

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: "",
      status: "",
      priority: "",
      owner: "",
    });
  });

  it("should show raw value when option name not found", () => {
    render(
      <FilterBar
        project={mockProject}
        columnField="status"
        rowField="priority"
        filters={{ ...defaultFilters, status: "unknown_status" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });
});
