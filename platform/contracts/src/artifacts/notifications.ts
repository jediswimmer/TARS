import { z } from "zod";
import { artifact } from "../artifact.js";
import { Severity } from "../severity.js";
import { Role } from "../rbac.js";

/**
 * The Notification agent watches the whole fleet's output and emits these. Each
 * one is a candidate row in the dashboard's notification list (the checkbox
 * rows the user selects to build a live drill-down). `visibleToRoles` is set
 * from RBAC so the portal never shows a row to someone outside its purview.
 */
export const Notification = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  severity: Severity,
  /** 0–100 ranking used to order the list + decide what gets promoted to the hero slot. */
  priority: z.number().min(0).max(100),
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  sourceArtifactId: z.string(),
  sourceAgentId: z.string(),
  /** Deep-link into the portal for drill-down. */
  actionRef: z.string().optional(),
  visibleToRoles: z.array(Role),
  status: z.enum(["new", "acknowledged", "dismissed"]).default("new"),
});
export type Notification = z.infer<typeof Notification>;

export const NotificationsBody = z.object({
  customerId: z.string(),
  generatedAt: z.iso.datetime(),
  items: z.array(Notification),
});
export type NotificationsBody = z.infer<typeof NotificationsBody>;

export const Notifications = artifact("notifications", NotificationsBody);
