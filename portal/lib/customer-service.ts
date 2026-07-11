import Anthropic from "@anthropic-ai/sdk";
import type { Role, Severity } from "@tars/contracts";
import { NOTIFICATIONS } from "./sample";

/**
 * Portal-local customer-service handler. It mirrors the shared CustomerServiceAgent
 * (@tars/agents) but stays self-contained so the Next app doesn't bundle the agent
 * runtime — in production this route would proxy to the agent backend over HTTP.
 * The important behavior it preserves: retrieval is RBAC-scoped BEFORE the model
 * sees anything.
 */
const PURVIEWS: Record<Role, { minSeverity: Severity; seeRawEvidence: boolean; seeBusinessImpact: boolean; seeComplianceDetail: boolean }> = {
  business_owner: { minSeverity: "medium", seeRawEvidence: false, seeBusinessImpact: true, seeComplianceDetail: true },
  it_director: { minSeverity: "low", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  security_analyst: { minSeverity: "info", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  auditor: { minSeverity: "low", seeRawEvidence: false, seeBusinessImpact: false, seeComplianceDetail: true },
  msp_admin: { minSeverity: "info", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  read_only: { minSeverity: "high", seeRawEvidence: false, seeBusinessImpact: false, seeComplianceDetail: false },
};

const REPORT = {
  executiveSummary: "Critical, actively-exploitable risk: an internet-exposed RDP jumpbox, a Global Administrator without MFA, and a public storage container leaking confidential customer statements.",
  riskPosture: { score: 88, rating: "critical" },
  keyFindings: [
    { findingId: "finding_rdp", headline: "Internet-exposed RDP on the jumpbox", severity: "critical" },
    { findingId: "finding_admin_mfa", headline: "Global Administrator without MFA", severity: "critical" },
    { findingId: "finding_storage", headline: "Confidential customer data publicly readable", severity: "high" },
  ],
  complianceMapping: [
    { framework: "MCSB", coverage: 0.55, gaps: ["NS-1", "IM-6"] },
    { framework: "SOX", coverage: 0.5, gaps: ["Privileged access over financial systems"] },
  ],
};

// Raw evidence / exploit narratives — only surfaced to roles whose purview allows it.
const REVIEWED = {
  reviews: [
    { findingId: "finding_rdp", riskScore: 95, exploitability: "Trivial — automated RDP brute-forcing scans for this continuously.", evidence: "web-nsg AllowRDP destinationPortRange 3389 sourceAddressPrefix 0.0.0.0/0" },
    { findingId: "finding_admin_mfa", riskScore: 92, exploitability: "Phishing or credential stuffing; no second factor.", evidence: "admin@contoso.com mfaEnabled=false, role Global Administrator" },
  ],
};

function scopedContext(role: Role): Record<string, unknown> {
  const purview = PURVIEWS[role];
  const ctx: Record<string, unknown> = { report: REPORT };
  ctx.notifications = NOTIFICATIONS.filter((n) => n.visibleToRoles.includes(role)).map((n) => ({ title: n.title, severity: n.severity, category: n.category, summary: n.summary }));
  if (purview.seeRawEvidence) ctx.reviewedFindings = REVIEWED;
  return ctx;
}

export async function answer(role: Role, question: string): Promise<string> {
  const purview = PURVIEWS[role];
  const context = scopedContext(role);
  const system =
    `You are the customer service agent for an MSP customer portal, speaking with a user whose role is "${role}". ` +
    `Honor their purview strictly: seeRawEvidence=${purview.seeRawEvidence}, seeBusinessImpact=${purview.seeBusinessImpact}, seeComplianceDetail=${purview.seeComplianceDetail}, minSeverity=${purview.minSeverity}. ` +
    `Answer ONLY from the provided context. If the answer would require data outside this role's purview, say so and offer to escalate. Be concise and cite finding ids where relevant.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return "Demo mode — no ANTHROPIC_API_KEY is set. The retrieval you'd get IS already scoped to your role (RBAC applied before the model sees anything); set a key for live answers.";
  }

  const client = new Anthropic();
  const res = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
    max_tokens: 1024,
    system,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: `Context:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nQuestion: ${question}` }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
