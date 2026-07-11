import type { Agent, ProviderId } from "@tars/contracts";

/**
 * The registry is how the orchestrator finds "the reviewer agent for provider X".
 * Each provider package registers its fleet on load; a pipeline then asks the
 * registry for a role + provider and gets back the right implementation.
 */
export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  private key(provider: ProviderId, agentId: string): string {
    return `${provider}:${agentId}`;
  }

  register(agent: Agent): this {
    this.agents.set(this.key(agent.definition.provider, agent.definition.id), agent);
    return this;
  }

  get(provider: ProviderId, agentId: string): Agent {
    const agent = this.agents.get(this.key(provider, agentId));
    if (!agent) throw new Error(`No agent registered for ${provider}:${agentId}`);
    return agent;
  }

  has(provider: ProviderId, agentId: string): boolean {
    return this.agents.has(this.key(provider, agentId));
  }

  list(provider?: ProviderId): Agent[] {
    const all = [...this.agents.values()];
    return provider ? all.filter((a) => a.definition.provider === provider) : all;
  }
}

/** Process-wide default registry. */
export const registry = new AgentRegistry();
