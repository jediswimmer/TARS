import type { HeadlineMetric, Notification, Role, Severity } from "@tars/contracts";

/** Roles offered in the portal's role switcher (drives RBAC filtering in the UI). */
export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "business_owner", label: "Business Owner", blurb: "Risk, cost & compliance standing — no raw exploit detail" },
  { id: "it_director", label: "VP / IT Director", blurb: "Full technical detail + audit/compliance rigor" },
  { id: "security_analyst", label: "Security Analyst", blurb: "Everything, including raw evidence" },
  { id: "auditor", label: "Auditor", blurb: "Compliance-scoped, read-only" },
];

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--color-crit)",
  high: "var(--color-high)",
  medium: "var(--color-med)",
  low: "var(--color-low)",
  info: "var(--color-info)",
};

export const SEVERITY_COUNTS: Record<Severity, number> = { critical: 2, high: 2, medium: 2, low: 1, info: 0 };

export const RISK_SCORE = 88;

export const EXEC_METRICS: HeadlineMetric[] = [
  { label: "Overall Risk", value: 88, unit: "/100", intent: "negative" },
  { label: "Critical Issues", value: 2, intent: "negative" },
  { label: "Active Data Exposure", value: "Yes", intent: "negative" },
  { label: "Quick Wins ≤7d", value: 3, intent: "positive" },
];

export const TECH_METRICS: HeadlineMetric[] = [
  { label: "Open Criticals", value: 2, intent: "negative" },
  { label: "MCSB Coverage", value: 55, unit: "%", intent: "negative" },
  { label: "SOX Coverage", value: 50, unit: "%", intent: "negative" },
  { label: "MTTR Target", value: "7d", intent: "neutral" },
];

export const EXEC_NARRATIVE =
  "Your Azure environment currently carries critical risk that could lead to a full breach and a reportable exposure of customer data. Three actions this week — enabling MFA for administrators, closing remote desktop from the internet, and locking down a public data store — remove the most serious exposure at low cost.";

export const TECH_NARRATIVE =
  "Two critical findings (public RDP on jumpbox-01 via web-nsg AllowRDP 0.0.0.0/0; Global Admin without MFA) form a compromise chain mapped to MITRE T1133 → T1078. One high finding (contosofinstore01 public 'customer-statements' container) is an active CC6.1 control failure. Remediation runbooks and control mappings below; every item carries an owner for the audit trail.";

export const COMPLIANCE: { framework: string; coverage: number; gaps: string[] }[] = [
  { framework: "MCSB", coverage: 0.55, gaps: ["Network segmentation (NS-1)", "Strong authentication (IM-6)"] },
  { framework: "SOC2", coverage: 0.6, gaps: ["Logical access (CC6.1)"] },
  { framework: "SOX", coverage: 0.5, gaps: ["Privileged access over financial systems"] },
];

const now = "2026-07-11T02:00:00.000Z";
const ALL: Role[] = ["business_owner", "it_director", "security_analyst", "auditor", "msp_admin"];

/**
 * Roles allowed to see raw technical detail (mirrors `DEFAULT_PURVIEWS[role].
 * seeRawEvidence` in @tars/contracts, kept portal-local so no workspace runtime
 * code is bundled). The D3 raw-topology viz (attack-chain, topology map) gate on
 * this — business_owner and auditor get the aggregate BlastRadiusCard instead.
 */
export const TECH: Role[] = ["it_director", "security_analyst", "msp_admin"];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", createdAt: now, severity: "critical", priority: 96, title: "Full tenant-takeover path is live", summary: "Internet-exposed RDP plus an MFA-less Global Admin chain into complete tenant compromise. Fix both this week.", category: "Identity", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: ALL, status: "new" },
  { id: "n2", createdAt: now, severity: "high", priority: 84, title: "Confidential customer data is publicly readable", summary: "The 'customer-statements' container on contosofinstore01 is exposed to the internet. Treat as an active incident.", category: "Data Exposure", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: ALL, status: "new" },
  { id: "n3", createdAt: now, severity: "high", priority: 72, title: "Production SQL Server publicly reachable, TDE disabled", summary: "contoso-sql-prod allows 0.0.0.0/0 and has Transparent Data Encryption disabled.", category: "Data", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: ALL, status: "new" },
  { id: "n4", createdAt: now, severity: "medium", priority: 61, title: "Activity log export not configured", summary: "No diagnostic settings on the subscription — you cannot investigate an incident after the fact.", category: "Logging", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: TECH, status: "new" },
  { id: "n5", createdAt: now, severity: "medium", priority: 58, title: "App Service allows plain HTTP + FTPS", summary: "contoso-portal has httpsOnly=false and ftpsState=AllAllowed.", category: "Configuration", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: TECH, status: "new" },
  { id: "n6", createdAt: now, severity: "low", priority: 40, title: "CI service principal is Owner at subscription scope", summary: "ci-deployer-sp holds Owner where Contributor on a resource group would suffice.", category: "Identity", sourceArtifactId: "reviewed_findings_demo", sourceAgentId: "notification-agent", visibleToRoles: ["security_analyst", "msp_admin"], status: "new" },
];
