import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Severity } from "@tars/contracts";
import type { Baseline } from "./compare.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Load the Contoso Financial golden baseline used by the bake-off and eval tests. */
export function loadContosoGolden(): Baseline {
  const raw = JSON.parse(readFileSync(join(HERE, "fixtures", "contoso-golden.json"), "utf8")) as {
    findings: { title: string; severity: Severity }[];
  };
  return { findings: raw.findings };
}

/** Cached Contoso golden — preferred for callers that just need the fixture. */
export const CONTOSO_GOLDEN: Baseline = loadContosoGolden();
