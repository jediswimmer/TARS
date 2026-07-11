import { z } from "zod";
import { Severity } from "./severity.js";

/**
 * RBAC is a first-class contract, not an afterthought bolted onto the portal.
 * The Customer Service agent scopes its retrieval by the asker's role, and the
 * Notification agent stamps every item with the roles allowed to see it. Both
 * read from THIS definition so "who can see what" is defined in exactly one place.
 */
export const Role = z.enum([
  "business_owner", // CEO / owner — decisions, risk, cost, compliance status
  "it_director", // VP / IT Director — full technical detail, audit evidence
  "security_analyst", // MSP-side analyst — raw findings, exploit detail
  "auditor", // external / compliance auditor — read-only, compliance-scoped
  "msp_admin", // MSP operator — everything
  "read_only", // least privilege default
]);
export type Role = z.infer<typeof Role>;

/** What a role is allowed to see. The retrieval/notification layers enforce this. */
export const Purview = z.object({
  role: Role,
  /** Minimum severity this role is shown (e.g. an owner may not want 'info' noise). */
  minSeverity: Severity,
  /** May see raw evidence / adversarial exploit narratives. */
  seeRawEvidence: z.boolean(),
  /** May see financial / business-impact framing. */
  seeBusinessImpact: z.boolean(),
  /** May see compliance-control mappings. */
  seeComplianceDetail: z.boolean(),
});
export type Purview = z.infer<typeof Purview>;

/** Default purviews. Tunable per-customer later, but these are sane starting points. */
export const DEFAULT_PURVIEWS: Record<Role, Purview> = {
  business_owner: { role: "business_owner", minSeverity: "medium", seeRawEvidence: false, seeBusinessImpact: true, seeComplianceDetail: true },
  it_director: { role: "it_director", minSeverity: "low", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  security_analyst: { role: "security_analyst", minSeverity: "info", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  auditor: { role: "auditor", minSeverity: "low", seeRawEvidence: false, seeBusinessImpact: false, seeComplianceDetail: true },
  msp_admin: { role: "msp_admin", minSeverity: "info", seeRawEvidence: true, seeBusinessImpact: true, seeComplianceDetail: true },
  read_only: { role: "read_only", minSeverity: "high", seeRawEvidence: false, seeBusinessImpact: false, seeComplianceDetail: false },
};
