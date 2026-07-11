// @tars/provider-grok — mirrors @tars/provider-claude. Port the fleet here to
// enter Grok in the bake-off. Until the agents are ported, the fleet is empty.
import type { AgentRegistry } from "@tars/core";

export { GrokProvider } from "./provider.js";

/**
 * Register the Grok fleet. TODO(phase-2): copy providers/claude/src/agents into
 * providers/grok/src/agents, retarget `provider: "grok"`, tune prompts for Grok,
 * and register them here — exactly as the Claude fleet is registered.
 */
export function registerGrokFleet(registry: AgentRegistry): AgentRegistry {
  return registry;
}
