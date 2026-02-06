import { createContext, useContext, useState, type ReactNode } from "react";
import { useParams } from "@tanstack/react-router";

interface SidebarContextType {
  projectId: string | undefined;
  createDialogOpen: boolean;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  searchDialogOpen: boolean;
  openSearchDialog: () => void;
  closeSearchDialog: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const params = useParams({ strict: false });
  const projectId = (params as { projectId?: string }).projectId;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const openCreateDialog = () => setCreateDialogOpen(true);
  const closeCreateDialog = () => setCreateDialogOpen(false);
  const openSearchDialog = () => setSearchDialogOpen(true);
  const closeSearchDialog = () => setSearchDialogOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        projectId,
        createDialogOpen,
        openCreateDialog,
        closeCreateDialog,
        searchDialogOpen,
        openSearchDialog,
        closeSearchDialog,
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
