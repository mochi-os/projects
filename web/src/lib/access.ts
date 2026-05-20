import type { ProjectAccess } from "@/types";

export const canDesign = (a: ProjectAccess) => a === "owner" || a === "design";
export const canCreate = (a: ProjectAccess) => canDesign(a);
export const canWrite = (a: ProjectAccess) => canCreate(a) || a === "write";
export const canComment = (a: ProjectAccess) => canWrite(a) || a === "comment";
