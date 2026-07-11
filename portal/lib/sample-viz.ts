// Fixture-derived sample data for the D3 visualizations. Kept portal-local and
// typed with `import type` only (no @tars workspace runtime is bundled — see
// portal/next.config.ts). The values are hand-lifted to stay coherent with the
// offline demo, and must be kept in sync with:
//   • platform/orchestrator/src/fixtures/canned-claude-run.ts  (first 3 reviews)
//   • platform/connectors/src/azure/fixtures/contoso-financial.json  (topology)
// Severity mix mirrors SEVERITY_COUNTS in ./sample.ts: critical 2, high 2,
// medium 2, low 1 = 7 findings.
import type {
  PipelineStage,
  TopoExposureInput,
  TopoIdentityInput,
  TopoResourceInput,
  VizFinding,
} from "./viz-selectors";

/**
 * Seven reviewed findings. The first three are lifted verbatim from
 * canned-claude-run.ts (riskScore 95/92/80; finding_rdp ↔ finding_admin_mfa is
 * the seed mutual correlation). The next four extend the graph into one 5-node
 * attack chain (rdp ↔ admin_mfa ↔ ci_sp ↔ sql ↔ appsvc) plus two isolated nodes
 * (storage, logging).
 */
export const VIZ_FINDINGS: VizFinding[] = [
  {
    id: "finding_rdp",
    title: "Internet-exposed RDP on jumpbox-01",
    severity: "critical",
    category: "network",
    resourceName: "jumpbox-01",
    riskScore: 95,
    businessImpact: "Full production environment compromise; regulatory and reputational fallout for a public company.",
    exploitability: "Trivial — automated RDP brute-forcing tools scan for this continuously.",
    remediationSummary: "Remove the public RDP rule; require Bastion/VPN + Just-In-Time access.",
    correlatedFindingIds: ["finding_admin_mfa"],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_admin_mfa",
    title: "Global Administrator without MFA",
    severity: "critical",
    category: "identity",
    resourceName: "admin@contoso.com",
    riskScore: 92,
    businessImpact: "Single credential compromise yields complete tenant control.",
    exploitability: "Phishing or credential stuffing; no second factor to defeat.",
    remediationSummary: "Enforce phishing-resistant MFA on all privileged roles.",
    correlatedFindingIds: ["finding_rdp", "finding_ci_sp"],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_storage",
    title: "Confidential customer data publicly readable",
    severity: "high",
    category: "data",
    resourceName: "contosofinstore01",
    riskScore: 80,
    businessImpact: "Active confidential-data exposure; likely reportable breach.",
    exploitability: "No exploitation needed — the data is already public.",
    remediationSummary: "Disable public blob access and restrict network ACLs.",
    correlatedFindingIds: [],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_ci_sp",
    title: "CI service principal is Owner at subscription scope",
    severity: "low",
    category: "identity",
    resourceName: "ci-deployer-sp",
    riskScore: 45,
    businessImpact: "Over-privileged automation identity widens the blast radius of any pipeline compromise.",
    exploitability: "An attacker with the admin foothold can mint credentials for this SP and act as Owner.",
    remediationSummary: "Scope the SP to Contributor on the specific resource group it deploys to.",
    correlatedFindingIds: ["finding_admin_mfa", "finding_sql"],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_sql",
    title: "Production SQL Server publicly reachable, TDE disabled",
    severity: "high",
    category: "data",
    resourceName: "contoso-sql-prod",
    riskScore: 78,
    businessImpact: "Direct path to financial records; encryption-at-rest is off.",
    exploitability: "Reachable from 0.0.0.0/0; an Owner-scoped SP can rotate firewall rules at will.",
    remediationSummary: "Disable public network access; require private endpoint; enable TDE.",
    correlatedFindingIds: ["finding_ci_sp", "finding_appsvc"],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_appsvc",
    title: "App Service allows plain HTTP + FTPS",
    severity: "medium",
    category: "configuration",
    resourceName: "contoso-portal",
    riskScore: 55,
    businessImpact: "Credentials and session tokens can be intercepted in transit.",
    exploitability: "A network attacker downgrades to HTTP; the app shares a data path with the exposed SQL server.",
    remediationSummary: "Set httpsOnly=true, disable FTPS, raise minTlsVersion.",
    correlatedFindingIds: ["finding_sql"],
    validated: true,
    falsePositive: false,
  },
  {
    id: "finding_logging",
    title: "Activity-log export not configured",
    severity: "medium",
    category: "logging",
    resourceName: "activity-log",
    riskScore: 40,
    businessImpact: "No forensic trail — an incident cannot be reconstructed after the fact.",
    exploitability: "Not directly exploitable; removes detection and post-incident evidence.",
    remediationSummary: "Configure diagnostic settings to export the activity log to a retained workspace.",
    correlatedFindingIds: [],
    validated: true,
    falsePositive: false,
  },
];

/** The six agent stages, ids identical to AZURE_SECURITY_PIPELINE (fleet.ts). */
export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "azure-security-scanner", name: "Azure Security Scanner", consumes: [], produces: "scan_findings" },
  { id: "azure-security-reviewer", name: "Azure Security Reviewer", consumes: ["scan_findings"], produces: "reviewed_findings" },
  { id: "report-author", name: "Report Author", consumes: ["reviewed_findings", "scan_findings"], produces: "security_report" },
  { id: "executive-view", name: "Executive View", consumes: ["security_report"], produces: "executive_view" },
  { id: "technical-view", name: "Technical View", consumes: ["security_report"], produces: "technical_view" },
  { id: "notification-agent", name: "Notification Agent", consumes: ["security_report", "reviewed_findings"], produces: "notifications" },
];

// --- Topology inputs, lifted from contoso-financial.json (join on short name) ---

export const TOPO_SUBSCRIPTION = { id: "sub-prod-01", name: "Contoso-Financial-Production" };

export const TOPO_RESOURCES: TopoResourceInput[] = [
  { name: "jumpbox-01", resourceType: "Microsoft.Compute/virtualMachines", findingSeverity: "critical" },
  { name: "web-nsg", resourceType: "Microsoft.Network/networkSecurityGroups" },
  { name: "contosofinstore01", resourceType: "Microsoft.Storage/storageAccounts", findingSeverity: "high" },
  { name: "contoso-sql-prod", resourceType: "Microsoft.Sql/servers", findingSeverity: "high" },
  { name: "contoso-portal", resourceType: "Microsoft.Web/sites", findingSeverity: "medium" },
  { name: "activity-log", resourceType: "Microsoft.Insights/diagnosticSettings", findingSeverity: "medium" },
  { name: "contoso-kv", resourceType: "Microsoft.KeyVault/vaults" },
];

export const TOPO_IDENTITIES: TopoIdentityInput[] = [
  { name: "admin@contoso.com", label: "admin@contoso.com · Global Admin", roleTargets: [{ target: "sub-prod-01", roleName: "Global Administrator" }] },
  { name: "ci-deployer-sp", label: "ci-deployer-sp · Owner", roleTargets: [{ target: "sub-prod-01", roleName: "Owner" }] },
  { name: "j.reyes@contoso.com", label: "j.reyes@contoso.com · Reader", roleTargets: [{ target: "sub-prod-01", roleName: "Reader" }] },
];

export const TOPO_EXPOSURES: TopoExposureInput[] = [
  { target: "jumpbox-01", protocol: "Tcp", port: 3389, source: "0.0.0.0/0" },
  { target: "jumpbox-01", protocol: "Tcp", port: 22, source: "0.0.0.0/0" },
  { target: "contoso-sql-prod", protocol: "Tcp", port: 1433, source: "0.0.0.0/0" },
];
