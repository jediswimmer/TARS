import type { Logger, ProviderId } from "@tars/contracts";
import { type AgentRegistry, createLogger } from "@tars/core";

export interface ScheduleEntry {
  provider: ProviderId;
  agentId: string;
  cron: string;
}

/**
 * Collect the cron schedules declared by the registered agents. In the MVP this
 * just surfaces "what runs when" — a thin adapter (node-cron locally, or Azure
 * Container Apps Jobs / a durable engine in production) turns each entry into a
 * real trigger that invokes runPipeline for the affected customer(s).
 */
export function collectSchedules(registry: AgentRegistry, provider: ProviderId): ScheduleEntry[] {
  return registry
    .list(provider)
    .filter((a) => a.definition.schedule)
    .map((a) => ({ provider, agentId: a.definition.id, cron: a.definition.schedule! }));
}

/** Print the schedule table — a placeholder for wiring a real cron/queue runtime. */
export function describeSchedules(registry: AgentRegistry, provider: ProviderId, logger: Logger = createLogger("scheduler")): void {
  for (const s of collectSchedules(registry, provider)) {
    logger.info(`schedule ${s.cron}`, { provider: s.provider, agent: s.agentId });
  }
}
