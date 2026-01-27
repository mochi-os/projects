import { createContext, useContext, useState, type ReactNode } from "react";
import { useParams } from "@tanstack/react-router";

interface SidebarContextType {
  projectId: string | undefined;
  createDialogOpen: boolean;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const params = useParams({ strict: false });
  const projectId = (params as { projectId?: string }).projectId;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const openCreateDialog = () => setCreateDialogOpen(true);
  const closeCreateDialog = () => setCreateDialogOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        projectId,
        createDialogOpen,
        openCreateDialog,
        closeCreateDialog,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}
