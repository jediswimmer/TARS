import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ExecutiveViewBody,
  type ProviderId,
  type TechnicalViewBody,
  type SecurityReportBody,
  ExecutiveViewBody as ExecutiveViewBodySchema,
} from "@tars/contracts";
import { DEFAULT_PROMPTS, type FleetPrompts } from "./prompts.js";

// Exec and technical views share a field set (only `audience` differs), so one
// output schema serves both. We inject audience + reportArtifactId ourselves.
const ViewOutput = ExecutiveViewBodySchema.omit({ audience: true, reportArtifactId: true });

abstract class ReportViewAgent<T extends ExecutiveViewBody | TechnicalViewBody> extends BaseAgent<T> {
  protected abstract readonly audience: T["audience"];
  protected readonly system: string;
  constructor(system: string) {
    super();
    this.system = system;
  }

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
          content: `Produce the ${this.audience} view from this canonical report.\n\n` + "```json\n" + JSON.stringify(report.body, null, 2) + "\n```",
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
  protected readonly audience = "executive" as const;
  readonly definition: AgentDefinition;
  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super(opts.prompts?.executiveView ?? DEFAULT_PROMPTS.executiveView);
    this.definition = {
      id: "executive-view",
      name: "Executive Report View",
      description: "Renders the report from the business owner / decision-maker POV.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: ["security_report"],
      produces: "executive_view",
    };
  }
}

/** POV: VP / IT Director at a publicly-traded company. */
export class TechnicalViewAgent extends ReportViewAgent<TechnicalViewBody> {
  protected readonly audience = "technical" as const;
  readonly definition: AgentDefinition;
  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super(opts.prompts?.technicalView ?? DEFAULT_PROMPTS.technicalView);
    this.definition = {
      id: "technical-view",
      name: "Technical Report View",
      description: "Renders the report from the VP/IT-Director POV with full technical + compliance detail.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: ["security_report"],
      produces: "technical_view",
    };
  }
}
