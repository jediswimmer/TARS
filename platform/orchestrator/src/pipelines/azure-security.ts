/**
 * The sample workflow — the Azure security pipeline. An ordered list of agent
 * ids; the runner wires the handoffs by artifact kind:
 *
 *   scan → review → report → (executive view ∥ technical view) → notifications
 *
 * Scanner (documents findings) → Reviewer (analyzes) → Report Author (technical
 * docs) → the two POV views (owner + VP/IT) → Notification agent (promotes to
 * the dashboard). Every later stage reads the newest artifact of the kind it
 * consumes, so this list IS the DAG.
 */
export const AZURE_SECURITY_PIPELINE: string[] = [
  "azure-security-scanner",
  "azure-security-reviewer",
  "report-author",
  "executive-view",
  "technical-view",
  "notification-agent",
];
