import { test } from "node:test";
import assert from "node:assert/strict";
import { AgentRegistry, InMemoryArtifactStore } from "@tars/core";
import { registerAzureFleet, AZURE_SECURITY_PIPELINE } from "@tars/agents";
import { FixtureAzureConnector } from "@tars/connectors";
import { runPipeline, ReplayProvider, CANNED_CLAUDE_RUN } from "@tars/orchestrator";

test("offline pipeline produces six artifacts with correct lineage", async () => {
  const registry = new AgentRegistry();
  registerAzureFleet(registry, "claude");
  const store = new InMemoryArtifactStore();
  const snapshot = await new FixtureAzureConnector().capture();

  const result = await runPipeline(AZURE_SECURITY_PIPELINE, {
    provider: "claude",
    customerId: "contoso",
    mode: "offline",
    llm: new ReplayProvider(CANNED_CLAUDE_RUN, "claude"),
    store,
    registry,
    config: { snapshot, customer: { id: "contoso", name: "Contoso" }, period: { from: snapshot.capturedAt, to: snapshot.capturedAt } },
  });

  // All six stages ran.
  assert.equal(result.steps.length, 6);
  assert.deepEqual(
    result.steps.map((s) => s.kind),
    ["scan_findings", "reviewed_findings", "security_report", "executive_view", "technical_view", "notifications"],
  );

  // Lineage: the reviewer's artifact records the scan it derived from.
  const scanStep = result.steps.find((s) => s.kind === "scan_findings")!;
  const reviewStep = result.steps.find((s) => s.kind === "reviewed_findings")!;
  const reviewArtifact = await store.get(reviewStep.artifactId);
  assert.ok(reviewArtifact);
  assert.ok(reviewArtifact!.inputs.includes(scanStep.artifactId));

  // Provenance is stamped with the provider.
  assert.equal(reviewArtifact!.producedBy.provider, "claude");

  // The dashboard notifications were produced.
  const notifs = await store.latest("notifications", "contoso");
  assert.ok(notifs);
  const items = (notifs!.body as { items: unknown[] }).items;
  assert.ok(items.length > 0);
});

test("a provider with no registered fleet is rejected", () => {
  const registry = new AgentRegistry();
  assert.throws(() => registry.get("grok", "azure-security-scanner"));
});
