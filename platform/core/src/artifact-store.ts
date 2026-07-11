import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact, ArtifactKind, ArtifactStore } from "@tars/contracts";

/** In-memory store — used by the offline demo + unit tests. */
export class InMemoryArtifactStore implements ArtifactStore {
  private readonly items = new Map<string, Artifact>();

  async put(artifact: Artifact): Promise<void> {
    this.items.set(artifact.id, artifact);
  }
  async get(id: string): Promise<Artifact | null> {
    return this.items.get(id) ?? null;
  }
  async latest(kind: ArtifactKind, customerId: string): Promise<Artifact | null> {
    const matches = [...this.items.values()]
      .filter((a) => a.kind === kind && a.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }
  async list(filter: { customerId?: string; kind?: ArtifactKind; runId?: string }): Promise<Artifact[]> {
    return [...this.items.values()].filter(
      (a) =>
        (!filter.customerId || a.customerId === filter.customerId) &&
        (!filter.kind || a.kind === filter.kind) &&
        (!filter.runId || a.runId === filter.runId),
    );
  }
}

/**
 * Filesystem store — one JSON file per artifact under `<root>/artifacts/`.
 * Good enough for the MVP + auditability (git-diffable runs). Production swaps
 * this class for a Postgres/Blob implementation; NO agent changes required.
 */
export class FileArtifactStore implements ArtifactStore {
  constructor(private readonly root: string) {}

  private dir(): string {
    return join(this.root, "artifacts");
  }
  private path(id: string): string {
    return join(this.dir(), `${id}.json`);
  }

  async put(artifact: Artifact): Promise<void> {
    await mkdir(this.dir(), { recursive: true });
    await writeFile(this.path(artifact.id), JSON.stringify(artifact, null, 2), "utf8");
  }

  async get(id: string): Promise<Artifact | null> {
    try {
      return JSON.parse(await readFile(this.path(id), "utf8")) as Artifact;
    } catch {
      return null;
    }
  }

  private async all(): Promise<Artifact[]> {
    try {
      const files = (await readdir(this.dir())).filter((f) => f.endsWith(".json"));
      return await Promise.all(
        files.map(async (f) => JSON.parse(await readFile(join(this.dir(), f), "utf8")) as Artifact),
      );
    } catch {
      return [];
    }
  }

  async latest(kind: ArtifactKind, customerId: string): Promise<Artifact | null> {
    const matches = (await this.all())
      .filter((a) => a.kind === kind && a.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }

  async list(filter: { customerId?: string; kind?: ArtifactKind; runId?: string }): Promise<Artifact[]> {
    return (await this.all()).filter(
      (a) =>
        (!filter.customerId || a.customerId === filter.customerId) &&
        (!filter.kind || a.kind === filter.kind) &&
        (!filter.runId || a.runId === filter.runId),
    );
  }
}
