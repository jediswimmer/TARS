import type { Agent, ProviderId } from "@tars/contracts";
import type { AgentRegistry } from "@tars/core";
import { AzureSecurityScanner } from "./azure-security-scanner.js";
import { AzureSecurityReviewer } from "./azure-security-reviewer.js";
import { ReportAuthor } from "./report-author.js";
import { ExecutiveViewAgent, TechnicalViewAgent } from "./report-views.js";
import { NotificationAgent } from "./notification.js";
import type { FleetPrompts } from "./prompts.js";

/**
 * Build the Azure security fleet for a given provider. The SAME agent logic runs
 * for claude/grok/sol — pass `prompts` to tune per model. This is what makes the
 * bake-off both fair (identical decomposition) and flexible (per-model prompts).
 */
export function createAzureFleet(provider: ProviderId, prompts?: FleetPrompts): Agent[] {
  return [
    new AzureSecurityScanner({ provider, prompts }),
    new AzureSecurityReviewer({ provider, prompts }),
    new ReportAuthor({ provider, prompts }),
    new ExecutiveViewAgent({ provider, prompts }),
    new TechnicalViewAgent({ provider, prompts }),
    new NotificationAgent({ provider, prompts }),
  ];
}

/** Register the whole Azure fleet for a provider into a registry. */
export function registerAzureFleet(registry: AgentRegistry, provider: ProviderId, prompts?: FleetPrompts): AgentRegistry {
  for (const agent of createAzureFleet(provider, prompts)) registry.register(agent);
  return registry;
}

/** The ordered stage list for the Azure security pipeline (also the DAG). */
export const AZURE_SECURITY_PIPELINE: string[] = [
  "azure-security-scanner",
  "azure-security-reviewer",
  "report-author",
  "executive-view",
  "technical-view",
  "notification-agent",
];
