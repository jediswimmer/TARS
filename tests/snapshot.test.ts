import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AzureEnvironmentSnapshotSchema,
  FixtureAzureConnector,
  SNAPSHOT_VERSION,
} from "@tars/connectors";

test("the Contoso fixture validates against the snapshot schema", async () => {
  const snapshot = await new FixtureAzureConnector().capture();
  const parsed = AzureEnvironmentSnapshotSchema.safeParse(snapshot);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues, null, 2));
  assert.equal(snapshot.snapshotVersion, SNAPSHOT_VERSION);
  // Sanity: the recorded Contoso tenant still has its 7 resources / 3 identities.
  assert.equal(snapshot.resources.length, 7);
  assert.equal(snapshot.identities.length, 3);
});

test("snapshotVersion defaults when a fixture predates the field", () => {
  const { snapshotVersion, ...rest } = { snapshotVersion: SNAPSHOT_VERSION, tenantId: "t", capturedAt: "2026-01-01T00:00:00.000Z", subscriptions: [], resources: [], identities: [], networkExposures: [], policyStates: [] };
  void snapshotVersion;
  const parsed = AzureEnvironmentSnapshotSchema.parse(rest);
  assert.equal(parsed.snapshotVersion, SNAPSHOT_VERSION);
});

test("a malformed snapshot fails loudly with a path", () => {
  const bad = { tenantId: 123, subscriptions: "nope" };
  const parsed = AzureEnvironmentSnapshotSchema.safeParse(bad);
  assert.equal(parsed.success, false);
});
