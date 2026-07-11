/**
 * Pre-baked LLM responses for the offline demo, keyed by the `schemaName` each
 * agent passes to the LLM port. Values match the shape each agent expects back
 * from `ctx.llm.complete({ schema })` — i.e. the model's structured output,
 * BEFORE the agent stamps ids/timestamps. Derived from the Contoso Financial
 * fixture tenant. Illustrative data — live runs produce this from a real model.
 */
export const CANNED_CLAUDE_RUN: Record<string, unknown> = {
  // AzureSecurityScanner → ScannerOutput
  azure_scan_findings: {
    findings: [
      {
        title: "RDP (3389) exposed to the internet on jumpbox-01",
        description: "NSG 'web-nsg' allows inbound TCP/3389 from 0.0.0.0/0 to a VM with a public IP.",
        severity: "critical",
        confidence: 0.98,
        category: "network",
        resource: { id: "web-nsg", type: "Microsoft.Network/networkSecurityGroups", name: "web-nsg", subscriptionId: "sub-prod-01", resourceGroup: "rg-net" },
        evidence: "securityRules: AllowRDP { destinationPortRange: 3389, sourceAddressPrefix: 0.0.0.0/0 }; jumpbox-01 publicIpAddress: 20.55.10.44",
        detectionMethod: "NSG rule + public IP correlation",
        attackNarrative: "An attacker sprays credentials against the exposed RDP endpoint, lands on jumpbox-01, then pivots into the production subnet using the jumpbox's network position.",
        frameworks: [
          { framework: "MCSB", controlId: "NS-1", title: "Establish network segmentation boundaries" },
          { framework: "MITRE_ATTACK", controlId: "T1133", title: "External Remote Services" },
        ],
      },
      {
        title: "Storage account contosofinstore01 allows public blob access to confidential data",
        description: "allowBlobPublicAccess is true and container 'customer-statements' is publicly readable.",
        severity: "high",
        confidence: 0.95,
        category: "data",
        resource: { id: "contosofinstore01", type: "Microsoft.Storage/storageAccounts", name: "contosofinstore01", subscriptionId: "sub-prod-01", resourceGroup: "rg-data" },
        evidence: "allowBlobPublicAccess: true; container 'customer-statements' publicAccess: Container; tag dataClassification: confidential",
        detectionMethod: "Storage config inspection",
        attackNarrative: "Anyone on the internet enumerates the container and downloads customer statements — a direct confidential-data breach with regulatory exposure.",
        frameworks: [
          { framework: "CIS_AZURE", controlId: "3.7", title: "Ensure public access level is disabled for storage" },
          { framework: "SOC2", controlId: "CC6.1" },
        ],
      },
      {
        title: "Global Administrator account has no MFA",
        description: "admin@contoso.com holds Global Administrator but MFA is not enabled.",
        severity: "critical",
        confidence: 0.97,
        category: "identity",
        resource: { id: "user-admin-01", type: "Microsoft.Identity/user", name: "admin@contoso.com", subscriptionId: "sub-prod-01", resourceGroup: "" },
        evidence: "mfaEnabled: false; roleAssignments: [Global Administrator @ /tenant]",
        detectionMethod: "Directory role + MFA state review",
        attackNarrative: "A single phished password grants full tenant takeover — no second factor stands in the way. This is the highest-leverage identity in the tenant.",
        frameworks: [
          { framework: "MCSB", controlId: "IM-6", title: "Use strong authentication controls" },
          { framework: "MITRE_ATTACK", controlId: "T1078", title: "Valid Accounts" },
        ],
      },
    ],
    scannerNotes: "3 findings across network, data, and identity. Two chainable into full tenant compromise.",
  },

  // AzureSecurityReviewer → ReviewerOutput
  reviewed_findings: {
    overallRiskScore: 88,
    postureSummary:
      "Critical exposure. An internet-facing RDP jumpbox and an MFA-less Global Admin together create a plausible full-tenant-compromise path, while a public storage container leaks confidential customer data today. Immediate action required.",
    reviews: [
      {
        findingId: "finding_rdp",
        validated: true,
        falsePositive: false,
        riskScore: 95,
        likelihood: "likely",
        businessImpact: "Full production environment compromise; regulatory and reputational fallout for a public company.",
        exploitability: "Trivial — automated RDP brute-forcing tools scan for this continuously.",
        correlatedFindingIds: ["finding_admin_mfa"],
        remediation: { summary: "Remove the public RDP rule; require Bastion/VPN + Just-In-Time access.", steps: ["Delete the AllowRDP 0.0.0.0/0 rule", "Deploy Azure Bastion", "Enable JIT VM access in Defender for Cloud"], effort: "medium", priority: 1 },
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
        correlatedFindingIds: ["finding_rdp"],
        remediation: { summary: "Enforce phishing-resistant MFA on all privileged roles.", steps: ["Enable MFA for admin@contoso.com", "Apply a Conditional Access policy requiring MFA for all admin roles", "Review other privileged accounts"], effort: "low", priority: 1 },
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
        remediation: { summary: "Disable public blob access and restrict network ACLs.", steps: ["Set allowBlobPublicAccess: false", "Set container access to private", "Set networkAcls defaultAction: Deny"], effort: "low", priority: 2 },
        analystNotes: "Treat as an active incident, not just a finding.",
      },
    ],
  },

  // ReportAuthor → SecurityReportBody without customer/period
  security_report: {
    scope: "Production subscription sub-prod-01 (7 resources, 3 identities).",
    executiveSummary:
      "Contoso Financial's production Azure environment carries critical, actively-exploitable risk. The most urgent issues are an internet-exposed remote-access server, a privileged administrator without multi-factor authentication, and a public storage container leaking confidential customer statements. The first two chain into full tenant takeover; the third is an active data exposure.",
    riskPosture: { score: 88, rating: "critical", trend: "stable" },
    keyFindings: [
      { findingId: "finding_rdp", headline: "Internet-exposed RDP on the production jumpbox", severity: "critical" },
      { findingId: "finding_admin_mfa", headline: "Global Administrator without MFA", severity: "critical" },
      { findingId: "finding_storage", headline: "Confidential customer data publicly readable", severity: "high" },
    ],
    remediationRoadmap: [
      { phase: "Immediate (0–7 days)", items: [
        { findingId: "finding_admin_mfa", action: "Enforce MFA on all privileged roles", owner: "IT Security" },
        { findingId: "finding_rdp", action: "Remove public RDP; deploy Bastion + JIT access", owner: "Cloud Ops" },
        { findingId: "finding_storage", action: "Disable public blob access; treat as incident", owner: "Cloud Ops" },
      ] },
      { phase: "Short term (30 days)", items: [
        { findingId: "finding_storage", action: "Enable Defender for Storage + storage firewall", owner: "Cloud Ops" },
      ] },
    ],
    complianceMapping: [
      { framework: "MCSB", coverage: 0.55, gaps: ["Network segmentation (NS-1)", "Strong authentication (IM-6)"] },
      { framework: "SOC2", coverage: 0.6, gaps: ["Logical access (CC6.1)"] },
      { framework: "SOX", coverage: 0.5, gaps: ["Privileged access controls over financial systems"] },
    ],
    sections: [
      { id: "methodology", heading: "Methodology", level: 1, body: "An automated adversarial scan enumerated the environment; findings were validated and risk-scored by a senior analyst before inclusion.", findingIds: [] },
      { id: "findings", heading: "Findings Detail", level: 1, body: "Three validated findings, two of which chain into full tenant compromise. See per-finding remediation.", findingIds: ["finding_rdp", "finding_admin_mfa", "finding_storage"] },
    ],
  },

  // ExecutiveViewAgent → ViewOutput
  executive_view: {
    narrative:
      "Your Azure environment currently carries critical risk that could lead to a full breach and a reportable exposure of customer data. Three actions this week — turning on multi-factor authentication for administrators, closing off remote desktop from the internet, and locking down a public data store — remove the most serious exposure at low cost.",
    headlineMetrics: [
      { label: "Overall Risk", value: 88, unit: "/100", intent: "negative" },
      { label: "Critical Issues", value: 2, intent: "negative" },
      { label: "Active Data Exposure", value: "Yes", intent: "negative" },
      { label: "Quick Wins (≤7 days)", value: 3, intent: "positive" },
    ],
    visualizations: [
      { id: "risk-gauge", type: "gauge", title: "Overall Risk Posture", dataRef: "riskPosture.score", priority: 1 },
      { id: "severity-donut", type: "donut", title: "Findings by Severity", dataRef: "keyFindings", priority: 2 },
    ],
    callouts: [
      { severity: "critical", title: "Enable admin MFA today", body: "The single highest-leverage, lowest-cost fix. One phished password currently equals full control." },
    ],
  },

  // TechnicalViewAgent → ViewOutput
  technical_view: {
    narrative:
      "Two critical findings (public RDP on jumpbox-01 via web-nsg AllowRDP 0.0.0.0/0; Global Admin admin@contoso.com without MFA) form a compromise chain mapped to MITRE T1133 → T1078. One high finding (contosofinstore01 public 'customer-statements' container) is an active CC6.1 control failure. Remediation runbooks and control mappings below; all items carry an owner for audit tracking.",
    headlineMetrics: [
      { label: "Open Criticals", value: 2, intent: "negative" },
      { label: "MCSB Coverage", value: 55, unit: "%", intent: "negative" },
      { label: "SOX Coverage", value: 50, unit: "%", intent: "negative" },
      { label: "Findings by Category", value: 3, intent: "neutral" },
    ],
    visualizations: [
      { id: "control-heatmap", type: "heatmap", title: "Control Coverage by Framework", dataRef: "complianceMapping", priority: 1 },
      { id: "category-bar", type: "bar", title: "Findings by Category", dataRef: "keyFindings", priority: 2 },
    ],
    callouts: [
      { severity: "critical", title: "SOX privileged-access gap", body: "MFA-less Global Admin over financial systems is a material access-control gap for a public company; document remediation for the audit trail." },
    ],
  },

  // NotificationAgent → NotificationAgentOutput
  notifications: {
    items: [
      {
        severity: "critical",
        priority: 96,
        title: "Full tenant-takeover path is live",
        summary: "Internet-exposed RDP plus an MFA-less Global Admin chain into complete tenant compromise. Fix both this week.",
        category: "Identity",
        sourceArtifactId: "",
        sourceAgentId: "notification-agent",
        visibleToRoles: ["business_owner", "it_director", "security_analyst", "msp_admin", "auditor"],
      },
      {
        severity: "high",
        priority: 84,
        title: "Confidential customer data is publicly readable",
        summary: "The 'customer-statements' container is exposed to the internet. Treat as an active incident.",
        category: "Data Exposure",
        sourceArtifactId: "",
        sourceAgentId: "notification-agent",
        visibleToRoles: ["business_owner", "it_director", "security_analyst", "msp_admin", "auditor"],
      },
    ],
  },
};
