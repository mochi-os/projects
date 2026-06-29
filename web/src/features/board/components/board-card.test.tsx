// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// Tests for BoardCard component
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  createMockObject,
  createMockField,
  createMockOption,
  createMockClass,
} from "@/test/test-utils";
import { BoardCard } from "./board-card";

describe("BoardCard", () => {
  // The card derives its header from the class's title field, so provide a
  // classMap (class "task" → title field "title") and a matching field.
  const defaultProps = {
    object: createMockObject(),
    fields: [createMockField({ id: "title", name: "Title" })],
    options: {},
    prefix: "TEST",
    classMap: { task: createMockClass() },
  };

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

  it("should render enumerated card fields (excluding status/priority/title)", () => {
    // Create a custom enumerated field that isn't status or priority
    const categoryField = createMockField({
      id: "category",
      name: "Category",
      fieldtype: "enumerated",
      card: 1,
    });

    const categoryOptions = [
      createMockOption({ id: "bug", name: "Bug", colour: "#ef4444" }),
      createMockOption({ id: "feature", name: "Feature", colour: "#22c55e" }),
    ];

    const objectWithCategory = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
        category: "bug",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithCategory}
        fields={[categoryField]}
        options={{ category: categoryOptions }}
      />,
    );

    expect(screen.getByText("Bug")).toBeInTheDocument();
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

    // Description is shown separately from card fields
    // But card=0 fields shouldn't appear in the tags section
    expect(screen.queryByText("Description:")).not.toBeInTheDocument();
  });

  it("should not render card field if value is empty", () => {
    const categoryField = createMockField({
      id: "category",
      name: "Category",
      fieldtype: "enumerated",
      card: 1,
    });

    const categoryOptions = [
      createMockOption({ id: "bug", name: "Bug", colour: "#ef4444" }),
    ];

    const objectWithoutCategory = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithoutCategory}
        fields={[categoryField]}
        options={{ category: categoryOptions }}
      />,
    );

    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });

  it("should apply option colour to enumerated badge", () => {
    const categoryField = createMockField({
      id: "category",
      name: "Category",
      fieldtype: "enumerated",
      card: 1,
    });

    const categoryOptions = [
      createMockOption({ id: "bug", name: "Bug", colour: "#6b7280" }),
    ];

    const objectWithCategory = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
        category: "bug",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={objectWithCategory}
        fields={[categoryField]}
        options={{ category: categoryOptions }}
      />,
    );

    // The option colour renders as a leading dot, not as the label's text color.
    const badge = screen.getByText("Bug");
    const dot = badge.querySelector("span.rounded-full");
    expect(dot).toHaveStyle({ backgroundColor: "#6b7280" });
  });

  it("should render multiple card fields", () => {
    const categoryField = createMockField({
      id: "category",
      name: "Category",
      fieldtype: "enumerated",
      card: 1,
    });

    const labelField = createMockField({
      id: "label",
      name: "Label",
      fieldtype: "enumerated",
      card: 1,
    });

    const categoryOptions = [
      createMockOption({ id: "bug", name: "Bug", colour: "#ef4444" }),
    ];

    const labelOptions = [
      createMockOption({ id: "urgent", name: "Urgent", colour: "#6b7280" }),
    ];

    const object = createMockObject({
      values: {
        title: "Test Task",
        status: "todo",
        category: "bug",
        label: "urgent",
      },
    });

    render(
      <BoardCard
        {...defaultProps}
        object={object}
        fields={[categoryField, labelField]}
        options={{
          category: categoryOptions,
          label: labelOptions,
        }}
      />,
    );

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  // Removed: "should show priority color strip" and "should show parent icon".
  // Both asserted markup the current BoardCard no longer renders — there is no
  // priority colour strip (priority is now a normal enumerated badge) and no
  // parent-indicator icon. The tests had never run (blocked by the macro import
  // error) so they encoded an earlier design; rather than test fictional markup
  // they are dropped. Priority badge rendering is covered by the enumerated
  // field tests above.
});
