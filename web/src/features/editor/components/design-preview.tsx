// Mochi Projects: Design preview component
// Copyright Alistair Cunningham 2026

import { useMemo, useState, useEffect } from "react";
import { ViewTabs } from "@mochi/web";
import type { ProjectDetails, ProjectObject } from "@/types";
import { BoardContainer } from "@/features/board/components/board-container";
import { TreeView } from "@/features/tree/components/tree-view";

interface DesignPreviewProps {
  project: ProjectDetails;
  projectId: string;
  objects: ProjectObject[];
  selectedClassId: string | null;
}

export function DesignPreview({
  project,
  projectId,
  objects,
  selectedClassId: _selectedClassId,
}: DesignPreviewProps) {
  const [selectedViewId, setSelectedViewId] = useState<string | null>(
    project.views[0]?.id || null,
  );

  // Sync to editor's class selection: pick the first view for that class
  useEffect(() => {
    if (!_selectedClassId) return;
    const match = project.views.find(
      (v) => v.classes.length === 0 || v.classes.includes(_selectedClassId),
    );
    if (match) setSelectedViewId(match.id);
  }, [_selectedClassId, project.views]);

  const selectedView = project.views.find((v) => v.id === selectedViewId);

  // Filter objects to the view's classes (or show all if view has no class filter)
  const viewClasses = selectedView?.classes || [];
  const classObjects = useMemo(
    () => viewClasses.length > 0
      ? objects.filter((obj) => viewClasses.includes(obj.class))
      : objects,
    [objects, viewClasses],
  );

  const noop = () => {};

  return (
    <div className="h-full flex flex-col">
      <ViewTabs
        views={project.views}
        activeViewId={selectedViewId || ""}
        onViewChange={setSelectedViewId}
      />
      <div className="flex-1 p-4 overflow-auto">
        {selectedView ? (
          selectedView.viewtype === "board"
            ? <BoardContainer
                project={project}
                objects={classObjects}
                statusField={selectedView.columns || ""}
                rowField={selectedView.rows || undefined}
                borderField={selectedView.border || undefined}
                viewFields={selectedView.fields}
                viewClasses={selectedView.classes}
                preview
              />
            : <TreeView
                project={project}
                projectId={projectId}
                objects={classObjects}
                peopleMap={{}}
                viewFields={selectedView.fields}
                viewClasses={selectedView.classes}
                onCardClick={noop}
                preview
              />
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            No views
          </div>
        )}
      </div>
    </div>
  );
}
