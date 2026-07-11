// @tars/provider-sol — mirrors @tars/provider-claude. Port the fleet here to
// enter Sol (OpenAI) in the bake-off. Until the agents are ported, the fleet is empty.
import type { AgentRegistry } from "@tars/core";

export { SolProvider } from "./provider.js";

/**
 * Register the Sol fleet. TODO(phase-2): copy providers/claude/src/agents into
 * providers/sol/src/agents, retarget `provider: "sol"`, tune prompts for Sol,
 * and register them here — exactly as the Claude fleet is registered.
 */
export function registerSolFleet(registry: AgentRegistry): AgentRegistry {
  return registry;
}
