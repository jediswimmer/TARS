import type { ArtifactStore, LlmProvider, Role } from "@tars/contracts";
import { DEFAULT_PURVIEWS } from "@tars/contracts";

/**
 * The customer-service agent is INTERACTIVE, not a scheduled pipeline stage — it
 * answers questions on the portal. Its retrieval is scoped by the asker's RBAC
 * purview, so a business owner and a security analyst asking the same question
 * get answers drawn from different slices of the same data. Provider-agnostic:
 * inject any LlmProvider.
 */
export class CustomerServiceAgent {
  constructor(
    private readonly llm: LlmProvider,
    private readonly store: ArtifactStore,
  ) {}

  async answer(input: { customerId: string; role: Role; question: string }): Promise<{ answer: string }> {
    const purview = DEFAULT_PURVIEWS[input.role];

    const [report, reviewed, notifications] = await Promise.all([
      this.store.latest("security_report", input.customerId),
      this.store.latest("reviewed_findings", input.customerId),
      this.store.latest("notifications", input.customerId),
    ]);

    const context: Record<string, unknown> = {};
    if (report) context.report = report.body;
    if (notifications) {
      const items = (notifications.body as { items: { visibleToRoles: Role[] }[] }).items.filter((n) => n.visibleToRoles.includes(input.role));
      context.notifications = items;
    }
    // Raw evidence / exploit detail only for roles whose purview allows it.
    if (reviewed && purview.seeRawEvidence) context.reviewedFindings = reviewed.body;

    const system =
      `You are the customer service agent for an MSP customer portal, speaking with a user whose role is "${input.role}". ` +
      `Honor their purview strictly: seeRawEvidence=${purview.seeRawEvidence}, seeBusinessImpact=${purview.seeBusinessImpact}, ` +
      `seeComplianceDetail=${purview.seeComplianceDetail}, minSeverity=${purview.minSeverity}. ` +
      `Answer ONLY from the provided context. If the answer would require data outside this role's purview, say so and offer to escalate. ` +
      `Be concise, accurate, and cite finding ids where relevant.`;

    const result = await this.llm.complete({
      system,
      messages: [{ role: "user", content: `Context:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nQuestion: ${input.question}` }],
    });

    return { answer: result.text };
  }
}
