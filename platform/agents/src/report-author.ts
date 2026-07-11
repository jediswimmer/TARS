import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ProviderId,
  type ReviewedFindingsBody,
  type ScanFindingsBody,
  type SecurityReportBody,
  SecurityReportBody as SecurityReportBodySchema,
} from "@tars/contracts";
import { DEFAULT_PROMPTS, type FleetPrompts } from "./prompts.js";

// The LLM authors everything except customer/period, which we inject from config.
const ReportAuthorOutput = SecurityReportBodySchema.omit({ customer: true, period: true });

export class ReportAuthor extends BaseAgent<SecurityReportBody> {
  readonly definition: AgentDefinition;
  private readonly system: string;

  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super();
    this.system = opts.prompts?.reportAuthor ?? DEFAULT_PROMPTS.reportAuthor;
    this.definition = {
      id: "report-author",
      name: "Security Report Author",
      description: "Technical-documentation specialist. Turns reviewed findings into the canonical security report.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: ["reviewed_findings", "scan_findings"],
      produces: "security_report",
      schedule: "0 4 * * *",
    };
  }

  protected async produce(ctx: AgentContext): Promise<{ body: SecurityReportBody; usage?: AgentResult["usage"] }> {
    const reviewed = ctx.inputs.find((a) => a.kind === "reviewed_findings") as
      | Artifact<"reviewed_findings", ReviewedFindingsBody>
      | undefined;
    const scan = ctx.inputs.find((a) => a.kind === "scan_findings") as
      | Artifact<"scan_findings", ScanFindingsBody>
      | undefined;
    if (!reviewed) throw new Error("report-author requires a reviewed_findings input artifact");

    const customer = (ctx.config.customer as { id: string; name: string } | undefined) ?? { id: ctx.customerId, name: ctx.customerId };
    const period = (ctx.config.period as { from: string; to: string } | undefined) ?? { from: reviewed.createdAt, to: reviewed.createdAt };

    const result = await ctx.llm.complete({
      system: this.system,
      schema: ReportAuthorOutput,
      schemaName: "security_report",
      messages: [
        {
          role: "user",
          content:
            `Author the security report for ${customer.name}.\n\n` +
            `REVIEWED FINDINGS:\n\`\`\`json\n${JSON.stringify(reviewed.body, null, 2)}\n\`\`\`\n\n` +
            `RAW SCAN FINDINGS (for technical detail):\n\`\`\`json\n${JSON.stringify(scan?.body.findings ?? [], null, 2)}\n\`\`\``,
        },
      ],
    });

    const authored = result.parsed;
    if (!authored) throw new Error("report-author: no structured output returned");
    return { body: { ...authored, customer, period }, usage: result.usage };
  }
}
