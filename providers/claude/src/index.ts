// @tars/provider-claude — the Anthropic adapter + fleet registration. The agents
// themselves live in @tars/agents (shared across providers); this package only
// supplies the LlmProvider and wires the fleet with provider "claude".
import type { AgentRegistry } from "@tars/core";
import { registerAzureFleet, type FleetPrompts } from "@tars/agents";

export { ClaudeProvider } from "./provider.js";
// Re-export the shared interactive agent for convenience.
export { CustomerServiceAgent } from "@tars/agents";

/** Register the Azure fleet on Claude. Pass prompt overrides to tune for Claude. */
export function registerClaudeFleet(registry: AgentRegistry, prompts?: FleetPrompts): AgentRegistry {
  return registerAzureFleet(registry, "claude", prompts);
}
