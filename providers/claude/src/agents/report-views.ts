import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ExecutiveViewBody,
  type TechnicalViewBody,
  type SecurityReportBody,
  ExecutiveViewBody as ExecutiveViewBodySchema,
} from "@tars/contracts";

// Exec and technical views share a field set (only `audience` differs), so one
// output schema serves both. We inject audience + reportArtifactId ourselves.
const ViewOutput = ExecutiveViewBodySchema.omit({ audience: true, reportArtifactId: true });

const EXECUTIVE_SYSTEM = `You are producing the EXECUTIVE view of a security report, for the business owner / decision-maker. They care about risk, money, compliance standing, and trend — NOT packet-level detail.

Write a board-ready 'narrative'. Choose 'headlineMetrics' that a CEO would want on one screen (overall risk score, # critical issues, compliance standing, estimated exposure), each with an 'intent' (positive/negative/neutral) so the dashboard colors them correctly. Propose 'visualizations' (data specs, priority 1 = the hero chart) and 'callouts' for the few things that need a decision. Never include raw exploit detail or evidence dumps.`;

const TECHNICAL_SYSTEM = `You are producing the TECHNICAL view of a security report, for a VP / IT Director at a PUBLICLY-TRADED company. They need full technical depth AND the audit/compliance rigor a public company requires.

Write a precise, complete 'narrative' with remediation specifics. Choose 'headlineMetrics' an IT leader tracks (open criticals, MTTR target, control coverage per framework, findings by category). Propose 'visualizations' including a control-coverage/heatmap view and a per-category breakdown (priority 1 = the hero). Use 'callouts' for compliance gaps (SOX/SOC2/ISO) and remediation ownership. Include the technical evidence and control mappings needed to satisfy an auditor.`;

abstract class ReportViewAgent<T extends ExecutiveViewBody | TechnicalViewBody> extends BaseAgent<T> {
  protected abstract readonly system: string;
  protected abstract readonly audience: T["audience"];

  protected async produce(ctx: AgentContext): Promise<{ body: T; usage?: AgentResult["usage"] }> {
    const report = ctx.inputs.find((a) => a.kind === "security_report") as
      | Artifact<"security_report", SecurityReportBody>
      | undefined;
    if (!report) throw new Error(`${this.definition.id} requires a security_report input artifact`);

    const result = await ctx.llm.complete({
      system: this.system,
      schema: ViewOutput,
      schemaName: `${this.audience}_view`,
      messages: [
        {
          role: "user",
          content:
            `Produce the ${this.audience} view from this canonical report.\n\n` +
            "```json\n" +
            JSON.stringify(report.body, null, 2) +
            "\n```",
        },
      ],
    });

    const view = result.parsed;
    if (!view) throw new Error(`${this.definition.id}: no structured output returned`);
    return { body: { ...view, audience: this.audience, reportArtifactId: report.id } as T, usage: result.usage };
  }
}

/** POV: business owner / decision-maker. */
export class ExecutiveViewAgent extends ReportViewAgent<ExecutiveViewBody> {
  protected readonly system = EXECUTIVE_SYSTEM;
  protected readonly audience = "executive" as const;
  readonly definition: AgentDefinition = {
    id: "executive-view",
    name: "Executive Report View",
    description: "Renders the report from the business owner / decision-maker POV.",
    version: "0.1.0",
    provider: "claude",
    consumes: ["security_report"],
    produces: "executive_view",
  };
}

/** POV: VP / IT Director at a publicly-traded company. */
export class TechnicalViewAgent extends ReportViewAgent<TechnicalViewBody> {
  protected readonly system = TECHNICAL_SYSTEM;
  protected readonly audience = "technical" as const;
  readonly definition: AgentDefinition = {
    id: "technical-view",
    name: "Technical Report View",
    description: "Renders the report from the VP/IT-Director POV with full technical + compliance detail.",
    version: "0.1.0",
    provider: "claude",
    consumes: ["security_report"],
    produces: "technical_view",
  };
}
