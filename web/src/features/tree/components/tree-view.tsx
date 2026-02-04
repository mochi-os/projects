// Mochi Projects: Tree view component
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useEffect, useCallback } from "react";
import { TreeRow } from "./tree-row";
import type { ProjectDetails, ProjectObject } from "@/types";

interface TreeViewProps {
  project: ProjectDetails;
  projectId: string;
  objects: ProjectObject[];
  peopleMap: Record<string, string>;
  viewFields?: string;
  onCardClick: (object: ProjectObject) => void;
  onReparent?: (objectId: string, newParentId: string | null) => void;
}

export interface TreeNode {
  object: ProjectObject;
  children: TreeNode[];
  depth: number;
}

// Build tree structure from flat list of objects
function buildTree(objects: ProjectObject[]): TreeNode[] {
  const objectMap = new Map<string, ProjectObject>();
  const childrenMap = new Map<string, ProjectObject[]>();

  // Index all objects
  for (const obj of objects) {
    objectMap.set(obj.id, obj);
    if (!childrenMap.has(obj.parent || "")) {
      childrenMap.set(obj.parent || "", []);
    }
    childrenMap.get(obj.parent || "")!.push(obj);
  }

  // Recursively build tree nodes
  function buildNodes(parentId: string, depth: number): TreeNode[] {
    const children = childrenMap.get(parentId) || [];
    // Sort by rank, then by number
    children.sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.number - b.number);

    return children.map((obj) => ({
      object: obj,
      children: buildNodes(obj.id, depth + 1),
      depth,
    }));
  }

  return buildNodes("", 0);
}

// Flatten tree for rendering, respecting expanded state
function flattenTree(
  nodes: TreeNode[],
  expanded: Set<string>,
): { node: TreeNode; hasChildren: boolean; isExpanded: boolean }[] {
  const result: { node: TreeNode; hasChildren: boolean; isExpanded: boolean }[] = [];

  function traverse(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.object.id);
      result.push({ node, hasChildren, isExpanded });

      if (hasChildren && isExpanded) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return result;
}

export function TreeView({
  project,
  projectId,
  objects,
  peopleMap,
  viewFields,
  onCardClick,
  onReparent,
}: TreeViewProps) {
  // Storage key for expanded state
  const storageKey = `projects:${projectId}:tree:expanded`;

  // Load expanded state from localStorage
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...expanded]));
  }, [expanded, storageKey]);

  // Build tree structure
  const tree = useMemo(() => buildTree(objects), [objects]);

  // Flatten tree for rendering
  const flatNodes = useMemo(
    () => flattenTree(tree, expanded),
    [tree, expanded],
  );

  // Toggle expand/collapse
  const toggleExpand = useCallback((objectId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  }, []);

  // Get fields and options for the first class (for now)
  // TODO: Support per-class fields when class filtering is implemented
  const firstClass = project.classes[0]?.id || "task";
  const fields = project.fields[firstClass] || [];
  const options = project.options[firstClass] || {};

  // Get visible fields from view's fields setting, or fall back to field's card property
  const viewFieldsList = viewFields?.split(",").filter(Boolean) || [];
  const showClass = viewFieldsList.includes("class");
  const showId = viewFieldsList.includes("id");
  const visibleFields = viewFieldsList.length > 0
    ? fields.filter((f) => viewFieldsList.includes(f.id) || f.id === "title")
    : fields.filter((f) => f.card === 1 || f.id === "title");

  // Build class map for looking up class names
  const classMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of project.classes) {
      map[c.id] = c.name;
    }
    return map;
  }, [project.classes]);

  // Build object map for looking up objects by ID
  const objectMap = useMemo(() => {
    const map: Record<string, ProjectObject> = {};
    for (const obj of objects) {
      map[obj.id] = obj;
    }
    return map;
  }, [objects]);

  // Check if reparenting is allowed by hierarchy rules
  const isReparentAllowed = useCallback((childId: string, parentId: string | null) => {
    const child = objectMap[childId];
    if (!child) return false;

    const allowedParents = project.hierarchy[child.class] || [];
    if (parentId === null) {
      // Check if root is allowed (empty string in hierarchy)
      return allowedParents.includes("");
    }

    const parent = objectMap[parentId];
    if (!parent) return false;

    // Check if parent's class is allowed
    return allowedParents.includes(parent.class);
  }, [objectMap, project.hierarchy]);

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((objectId: string) => {
    setDraggedId(objectId);
  }, []);

  const handleDragOver = useCallback((objectId: string) => {
    if (draggedId && draggedId !== objectId && isReparentAllowed(draggedId, objectId)) {
      setDragOverId(objectId);
    }
  }, [draggedId, isReparentAllowed]);

  const handleDragEnd = useCallback(() => {
    if (draggedId && dragOverId && draggedId !== dragOverId && onReparent && isReparentAllowed(draggedId, dragOverId)) {
      onReparent(draggedId, dragOverId);
    }
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, dragOverId, onReparent, isReparentAllowed]);

  const handleDropOnRoot = useCallback(() => {
    if (draggedId && onReparent && isReparentAllowed(draggedId, null)) {
      onReparent(draggedId, null);
    }
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, onReparent, isReparentAllowed]);

  if (objects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No items found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-[10px] overflow-hidden bg-background">
      {/* Drop zone for making items root-level */}
      {draggedId && isReparentAllowed(draggedId, null) && (
        <div
          className="h-8 border-b border-dashed border-primary/50 bg-primary/5 flex items-center justify-center text-xs text-muted-foreground"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId(null);
          }}
          onDrop={handleDropOnRoot}
        >
          Drop here to make root level
        </div>
      )}

      <table className="w-full border-collapse">
        <tbody className="divide-y divide-border">
          {flatNodes.map(({ node, hasChildren, isExpanded }) => (
            <TreeRow
              key={node.object.id}
              object={node.object}
            depth={node.depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            fields={visibleFields}
            options={options}
            peopleMap={peopleMap}
            classMap={classMap}
            prefix={project.project.prefix}
            showClass={showClass}
            showId={showId}
            isDragOver={dragOverId === node.object.id}
            onToggleExpand={() => toggleExpand(node.object.id)}
            onClick={() => onCardClick(node.object)}
            onDragStart={() => handleDragStart(node.object.id)}
            onDragOver={() => handleDragOver(node.object.id)}
            onDragEnd={handleDragEnd}
          />
          ))}
        </tbody>
      </table>
    </div>
  );
}
