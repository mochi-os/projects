import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@mochi/common";
import { ProjectsLayout } from "@/components/layout/projects-layout";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Initialize auth state from cookies if available
    const store = useAuthStore.getState();

    if (!store.isInitialized) {
      store.initialize();
    }

    // Load identity
    await store.loadIdentity();

    return;
  },
  component: ProjectsLayout,
});
