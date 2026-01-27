// Tests for BoardCard component
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { BoardCard } from "./board-card";
import {
  createMockObject,
  createMockField,
  createMockOption,
} from "@/test/test-utils";

describe("BoardCard", () => {
  const defaultProps = {
    object: createMockObject(),
    fields: [],
    options: {},
    prefix: "TEST",
  };

  it("should render object readable ID", () => {
    render(<BoardCard {...defaultProps} />);

    expect(screen.getByText("TEST-1")).toBeInTheDocument();
  });

  it("should render object title", () => {
    render(<BoardCard {...defaultProps} />);

    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("should use prefix-number as title when title is missing", () => {
    const objectWithoutTitle = createMockObject({
      values: { status: "todo" },
    });

    render(<BoardCard {...defaultProps} object={objectWithoutTitle} />);

    // The title should fall back to prefix-number
    const elements = screen.getAllByText("TEST-1");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("should call onClick when card is clicked", () => {
    const onClick = vi.fn();

    render(<BoardCard {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByText("Test Task"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should be draggable", () => {
    render(<BoardCard {...defaultProps} />);

    const card = screen.getByText("Test Task").closest("div[draggable]");
    expect(card).toHaveAttribute("draggable", "true");
  });

  it("should set drag data on drag start", () => {
    render(<BoardCard {...defaultProps} />);

    const card = screen.getByText("Test Task").closest("div[draggable]");
    const setData = vi.fn();
    const dataTransfer = {
      setData,
      effectAllowed: "",
    };

    fireEvent.dragStart(card!, { dataTransfer });

    expect(setData).toHaveBeenCalledWith("text/plain", "obj-1");
  });

  it("should render card fields when marked as card=1", () => {
    const priorityField = createMockField({
      id: "priority",
      name: "Priority",
      fieldtype: "enum",
      card: 1,
    });

    const priorityOptions = [
      createMockOption({ id: "high", name: "High", colour: "#ef4444" }),
      createMockOption({ id: "medium", name: "Medium", colour: "#f59e0b" }),
    ];

    render(
      <BoardCard
        {...defaultProps}
        fields={[priorityField]}
        options={{ priority: priorityOptions }}
      />,
    );

    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("should not render fields when card=0", () => {
    const descField = createMockField({
      id: "description",
      name: "Description",
      fieldtype: "textarea",
      card: 0,
    });

    const objectWithDesc = createMockObject({
      values: {
        title: "Test Task",
        description: "This is a description",
        status: "todo",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithDesc}
        fields={[descField]}
      />,
    );

    expect(screen.queryByText("This is a description")).not.toBeInTheDocument();
  });

  it("should render non-enum field values as text", () => {
    const textField = createMockField({
      id: "custom",
      name: "Custom Field",
      fieldtype: "text",
      card: 1,
    });

    const objectWithCustom = createMockObject({
      values: {
        title: "Test Task",
        custom: "Custom Value",
        status: "todo",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithCustom}
        fields={[textField]}
      />,
    );

    expect(screen.getByText("Custom Value")).toBeInTheDocument();
  });

  it("should not render card field if value is empty", () => {
    const priorityField = createMockField({
      id: "priority",
      name: "Priority",
      fieldtype: "enum",
      card: 1,
    });

    const priorityOptions = [
      createMockOption({ id: "high", name: "High", colour: "#ef4444" }),
    ];

    const objectWithoutPriority = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithoutPriority}
        fields={[priorityField]}
        options={{ priority: priorityOptions }}
      />,
    );

    expect(screen.queryByText("High")).not.toBeInTheDocument();
  });

  it("should apply option colour to badge", () => {
    const statusField = createMockField({
      id: "status",
      name: "Status",
      fieldtype: "enum",
      card: 1,
    });

    const statusOptions = [
      createMockOption({ id: "todo", name: "To Do", colour: "#6b7280" }),
    ];

    const objectWithTodo = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithTodo}
        fields={[statusField]}
        options={{ status: statusOptions }}
      />,
    );

    const badge = screen.getByText("To Do");
    expect(badge).toHaveStyle({ color: "#6b7280" });
  });

  it("should render multiple card fields", () => {
    const statusField = createMockField({
      id: "status",
      name: "Status",
      fieldtype: "enum",
      card: 1,
    });

    const priorityField = createMockField({
      id: "priority",
      name: "Priority",
      fieldtype: "enum",
      card: 1,
    });

    const statusOptions = [
      createMockOption({ id: "todo", name: "To Do", colour: "#6b7280" }),
    ];

    const priorityOptions = [
      createMockOption({ id: "high", name: "High", colour: "#ef4444" }),
    ];

    const object = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
        priority: "high",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={object}
        fields={[statusField, priorityField]}
        options={{
          status: statusOptions,
          priority: priorityOptions,
        }}
      />,
    );

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
