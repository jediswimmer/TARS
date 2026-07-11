import { z } from "zod";
import { BaseAgent, newId, nowIso } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type NotificationsBody,
  type ReviewedFindingsBody,
  type SecurityReportBody,
  Notification,
} from "@tars/contracts";

// Model proposes the notifications; we stamp id/createdAt/status.
const NotificationOut = Notification.omit({ id: true, createdAt: true, status: true });
const NotificationAgentOutput = z.object({ items: z.array(NotificationOut) });

export const NOTIFICATION_SYSTEM = `You are the notification agent that lives on the customer portal. You continuously evaluate the fleet's latest output and decide what deserves a customer's attention on their main dashboard.

From the report and reviewed findings, emit a prioritized list of notifications:
- 'priority' 0–100 = how much this deserves the hero slot / top of the list. Reserve 80+ for things a customer must act on now.
- Set 'visibleToRoles' by RBAC purview: raw exploit-flavored items → security_analyst/it_director/msp_admin; business-impact/compliance items → include business_owner/auditor. Never surface raw exploit detail to business_owner.
- Keep 'title' scannable and 'summary' to 1–2 sentences.
- 'category' groups the item on the dashboard (e.g. "Identity", "Data Exposure", "Compliance").
Only promote genuinely high-value items — a noisy dashboard is a failed dashboard.`;

export class NotificationAgent extends BaseAgent<NotificationsBody> {
  readonly definition: AgentDefinition = {
    id: "notification-agent",
    name: "Portal Notification Agent",
    description: "Evaluates fleet output and posts high-value items to the main dashboard, RBAC-scoped.",
    version: "0.1.0",
    provider: "claude",
    consumes: ["security_report", "reviewed_findings"],
    produces: "notifications",
    schedule: "*/30 * * * *", // re-evaluate every 30 minutes
  };

  protected async produce(ctx: AgentContext): Promise<{ body: NotificationsBody; usage?: AgentResult["usage"] }> {
    const report = ctx.inputs.find((a) => a.kind === "security_report") as
      | Artifact<"security_report", SecurityReportBody>
      | undefined;
    const reviewed = ctx.inputs.find((a) => a.kind === "reviewed_findings") as
      | Artifact<"reviewed_findings", ReviewedFindingsBody>
      | undefined;
    if (!report && !reviewed) throw new Error("notification-agent requires a security_report or reviewed_findings input");

    const source = report ?? reviewed!;
    const result = await ctx.llm.complete({
      system: NOTIFICATION_SYSTEM,
      schema: NotificationAgentOutput,
      schemaName: "notifications",
      messages: [
        {
          role: "user",
          content:
            "Decide which items to promote to the dashboard from the latest fleet output.\n\n" +
            `REPORT:\n\`\`\`json\n${JSON.stringify(report?.body ?? null, null, 2)}\n\`\`\`\n\n` +
            `REVIEWED FINDINGS:\n\`\`\`json\n${JSON.stringify(reviewed?.body ?? null, null, 2)}\n\`\`\``,
        },
      ],
    });

    const items = (result.parsed?.items ?? []).map((n) => ({
      ...n,
      id: newId("notif"),
      createdAt: nowIso(),
      sourceArtifactId: n.sourceArtifactId || source.id,
      status: "new" as const,
    }));

    return { body: { customerId: ctx.customerId, generatedAt: nowIso(), items }, usage: result.usage };
  }
}
