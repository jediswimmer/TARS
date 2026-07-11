import { z } from "zod";
import { BaseAgent, newId, nowIso } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type NotificationsBody,
  type ProviderId,
  type ReviewedFindingsBody,
  type SecurityReportBody,
  Notification,
} from "@tars/contracts";
import { DEFAULT_PROMPTS, type FleetPrompts } from "./prompts.js";

// Model proposes the notifications; we stamp id/createdAt/status.
const NotificationOut = Notification.omit({ id: true, createdAt: true, status: true });
const NotificationAgentOutput = z.object({ items: z.array(NotificationOut) });

export class NotificationAgent extends BaseAgent<NotificationsBody> {
  readonly definition: AgentDefinition;
  private readonly system: string;

  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super();
    this.system = opts.prompts?.notification ?? DEFAULT_PROMPTS.notification;
    this.definition = {
      id: "notification-agent",
      name: "Portal Notification Agent",
      description: "Evaluates fleet output and posts high-value items to the main dashboard, RBAC-scoped.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: ["security_report", "reviewed_findings"],
      produces: "notifications",
      schedule: "*/30 * * * *",
    };
  }

  protected async produce(ctx: AgentContext): Promise<{ body: NotificationsBody; usage?: AgentResult["usage"] }> {
    const report = ctx.inputs.find((a) => a.kind === "security_report") as Artifact<"security_report", SecurityReportBody> | undefined;
    const reviewed = ctx.inputs.find((a) => a.kind === "reviewed_findings") as Artifact<"reviewed_findings", ReviewedFindingsBody> | undefined;
    if (!report && !reviewed) throw new Error("notification-agent requires a security_report or reviewed_findings input");

    const source = report ?? reviewed!;
    const result = await ctx.llm.complete({
      system: this.system,
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
