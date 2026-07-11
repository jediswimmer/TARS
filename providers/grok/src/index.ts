// @tars/provider-grok — the xAI adapter + fleet registration. Agents are shared
// (@tars/agents); this package supplies the LlmProvider and wires the fleet as "grok".
import type { AgentRegistry } from "@tars/core";
import { registerAzureFleet, type FleetPrompts } from "@tars/agents";

export { GrokProvider } from "./provider.js";

/** Register the Azure fleet on Grok. Pass prompt overrides to tune for Grok. */
export function registerGrokFleet(registry: AgentRegistry, prompts?: FleetPrompts): AgentRegistry {
  return registerAzureFleet(registry, "grok", prompts);
}
