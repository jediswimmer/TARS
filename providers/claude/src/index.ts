// @tars/provider-claude — the reference fleet. Every agent implements the shared
// Agent contract; only the prompts + the injected ClaudeProvider are Claude-specific.
import type { AgentRegistry } from "@tars/core";
import { AzureSecurityScanner } from "./agents/azure-security-scanner.js";
import { AzureSecurityReviewer } from "./agents/azure-security-reviewer.js";
import { ReportAuthor } from "./agents/report-author.js";
import { ExecutiveViewAgent, TechnicalViewAgent } from "./agents/report-views.js";
import { NotificationAgent } from "./agents/notification.js";

export { ClaudeProvider } from "./provider.js";
export { CustomerServiceAgent } from "./agents/customer-service.js";
export * from "./agents/azure-security-scanner.js";
export * from "./agents/azure-security-reviewer.js";
export * from "./agents/report-author.js";
export * from "./agents/report-views.js";
export * from "./agents/notification.js";

/** Instantiate the full Claude fleet and register it. The orchestrator injects the LLM at run time. */
export function registerClaudeFleet(registry: AgentRegistry): AgentRegistry {
  return registry
    .register(new AzureSecurityScanner())
    .register(new AzureSecurityReviewer())
    .register(new ReportAuthor())
    .register(new ExecutiveViewAgent())
    .register(new TechnicalViewAgent())
    .register(new NotificationAgent());
}
