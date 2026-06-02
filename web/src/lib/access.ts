import type { ProjectAccess } from "@/types";

export const canDesign = (a: ProjectAccess) => a === "owner" || a === "design";
export const canWrite = (a: ProjectAccess) => canDesign(a) || a === "write";
export const canCreate = canWrite;
export const canComment = (a: ProjectAccess) => canWrite(a) || a === "comment";
