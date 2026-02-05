import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@mochi/common";
import { ProjectsLayout } from "@/components/layout/projects-layout";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    // Initialize auth state from cookies if available
    const store = useAuthStore.getState();

    if (!store.isInitialized) {
      store.initialize();
    }

    return;
  },
  component: ProjectsLayout,
});
