/**
 * Fixture-derived viz constants for the portal D3 charts.
 *
 * Sources (kept narrative-coherent with portal/lib/sample.ts):
 * - platform/orchestrator/src/fixtures/canned-claude-run.ts (first 3 reviews)
 * - platform/connectors/src/azure/fixtures/contoso-financial.json (topology names)
 *
 * Severity roll-up must match SEVERITY_COUNTS: { critical: 2, high: 2, medium: 2, low: 1 }.
 */
import type { FindingReview, Severity } from "@tars/contracts";

/** Portal-local finding meta — titles/resources for viz labels (not a full ScanFindingsBody). */
export interface FindingMeta {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  resourceName: string;
}

export const SAMPLE_FINDING_META: FindingMeta[] = [
  {
    id: "finding_rdp",
    title: "RDP (3389) exposed to the internet",
    severity: "critical",
    category: "Network",
    resourceName: "jumpbox-01",
  },
  {
    id: "finding_admin_mfa",
    title: "Global Administrator account has no MFA",
    severity: "critical",
    category: "Identity",
    resourceName: "admin@contoso.com",
  },
  {
    id: "finding_storage",
    title: "Storage account allows public blob access",
    severity: "high",
    category: "Data Exposure",
    resourceName: "contosofinstore01",
  },
  {
    id: "finding_sql",
    title: "Production SQL Server publicly reachable, TDE disabled",
    severity: "high",
    category: "Data",
    resourceName: "contoso-sql-prod",
  },
  {
    id: "finding_logging",
    title: "Activity log export not configured",
    severity: "medium",
    category: "Logging",
    resourceName: "sub-prod-01",
  },
  {
    id: "finding_appsvc",
    title: "App Service allows plain HTTP + FTPS",
    severity: "medium",
    category: "Configuration",
    resourceName: "contoso-portal",
  },
  {
    id: "finding_ci_sp",
    title: "CI service principal is Owner at subscription scope",
    severity: "low",
    category: "Identity",
    resourceName: "ci-deployer-sp",
  },
];

/**
 * Seven reviews: first three verbatim from canned-claude-run; four narrative-
 * consistent additions forming one 5-node chain (rdp↔mfa→sql→storage + rdp→appsvc)
 * plus two isolated nodes (logging, ci_sp).
 */
export const SAMPLE_REVIEWS: FindingReview[] = [
  {
    findingId: "finding_rdp",
    validated: true,
    falsePositive: false,
    riskScore: 95,
    likelihood: "likely",
    businessImpact:
      "Full production environment compromise; regulatory and reputational fallout for a public company.",
    exploitability: "Trivial — automated RDP brute-forcing tools scan for this continuously.",
    correlatedFindingIds: ["finding_admin_mfa", "finding_appsvc"],
    remediation: {
      summary: "Remove the public RDP rule; require Bastion/VPN + Just-In-Time access.",
      steps: [
        "Delete the AllowRDP 0.0.0.0/0 rule",
        "Deploy Azure Bastion",
        "Enable JIT VM access in Defender for Cloud",
      ],
      effort: "medium",
      priority: 1,
    },
    analystNotes: "Chains with the MFA gap: RDP foothold + admin takeover = game over.",
  },
  {
    findingId: "finding_admin_mfa",
    validated: true,
    falsePositive: false,
    riskScore: 92,
    likelihood: "possible",
    businessImpact: "Single credential compromise yields complete tenant control.",
    exploitability: "Phishing or credential stuffing; no second factor to defeat.",
    correlatedFindingIds: ["finding_rdp", "finding_sql"],
    remediation: {
      summary: "Enforce phishing-resistant MFA on all privileged roles.",
      steps: [
        "Enable MFA for admin@contoso.com",
        "Apply a Conditional Access policy requiring MFA for all admin roles",
        "Review other privileged accounts",
      ],
      effort: "low",
      priority: 1,
    },
    analystNotes: "Lowest-effort, highest-leverage fix in the environment.",
  },
  {
    findingId: "finding_storage",
    validated: true,
    falsePositive: false,
    riskScore: 80,
    likelihood: "almost_certain",
    businessImpact: "Active confidential-data exposure; likely reportable breach.",
    exploitability: "No exploitation needed — the data is already public.",
    correlatedFindingIds: [],
    remediation: {
      summary: "Disable public blob access and restrict network ACLs.",
      steps: [
        "Set allowBlobPublicAccess: false",
        "Set container access to private",
        "Set networkAcls defaultAction: Deny",
      ],
      effort: "low",
      priority: 2,
    },
    analystNotes: "Treat as an active incident, not just a finding.",
  },
  {
    findingId: "finding_sql",
    validated: true,
    falsePositive: false,
    riskScore: 78,
    likelihood: "likely",
    businessImpact:
      "Public SQL plus disabled TDE exposes financial records once an attacker pivots from a privileged session.",
    exploitability: "Requires network reachability; trivial after admin foothold.",
    correlatedFindingIds: ["finding_storage"],
    remediation: {
      summary: "Lock down SQL firewall and enable Transparent Data Encryption.",
      steps: [
        "Remove 0.0.0.0/0 firewall rule",
        "Enable TDE",
        "Prefer private endpoint for contoso-sql-prod",
      ],
      effort: "medium",
      priority: 2,
    },
    analystNotes: "Downstream of MFA-less Global Admin — treat as chain continuation.",
  },
  {
    findingId: "finding_logging",
    validated: true,
    falsePositive: false,
    riskScore: 55,
    likelihood: "possible",
    businessImpact: "Cannot investigate or prove what happened after an incident.",
    exploitability: "Not an entry point — amplifies impact of every other finding.",
    correlatedFindingIds: [],
    remediation: {
      summary: "Enable diagnostic settings with export to a locked Log Analytics workspace.",
      steps: ["Create central Log Analytics workspace", "Enable subscription activity-log export"],
      effort: "low",
      priority: 3,
    },
    analystNotes: "Isolated control gap — still blocks post-incident forensics.",
  },
  {
    findingId: "finding_appsvc",
    validated: true,
    falsePositive: false,
    riskScore: 52,
    likelihood: "possible",
    businessImpact: "Customer portal traffic and credentials can be intercepted in transit.",
    exploitability: "Requires MitM on the path; worsened by shared jumpbox exposure.",
    correlatedFindingIds: [],
    remediation: {
      summary: "Force HTTPS-only and disable FTPS on contoso-portal.",
      steps: ["Set httpsOnly=true", "Set ftpsState=Disabled"],
      effort: "low",
      priority: 3,
    },
    analystNotes: "Linked from the RDP jumpbox as a secondary landing zone.",
  },
  {
    findingId: "finding_ci_sp",
    validated: true,
    falsePositive: false,
    riskScore: 38,
    likelihood: "unlikely",
    businessImpact: "Over-privileged CI identity expands blast radius if the pipeline is compromised.",
    exploitability: "Requires pipeline or secret compromise first.",
    correlatedFindingIds: [],
    remediation: {
      summary: "Scope ci-deployer-sp to Contributor on the deployment resource group.",
      steps: ["Remove subscription Owner", "Assign Contributor at RG scope"],
      effort: "low",
      priority: 4,
    },
    analystNotes: "Isolated privilege-hygiene finding — not on the live takeover path.",
  },
];
