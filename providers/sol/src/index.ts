// @tars/provider-sol — the OpenAI adapter + fleet registration. Agents are shared
// (@tars/agents); this package supplies the LlmProvider and wires the fleet as "sol".
import type { AgentRegistry } from "@tars/core";
import { registerAzureFleet, type FleetPrompts } from "@tars/agents";

export { SolProvider } from "./provider.js";

/** Register the Azure fleet on Sol. Pass prompt overrides to tune for Sol. */
export function registerSolFleet(registry: AgentRegistry, prompts?: FleetPrompts): AgentRegistry {
  return registerAzureFleet(registry, "sol", prompts);
}
