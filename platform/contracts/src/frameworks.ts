import { z } from "zod";

/**
 * Compliance / security frameworks a finding can map to. The Technical (VP/IT)
 * view leans on these for audit + publicly-traded-company obligations; the
 * report's compliance-coverage rollup is computed from them.
 */
export const Framework = z.enum([
  "MCSB", // Microsoft Cloud Security Benchmark
  "CIS_AZURE", // CIS Microsoft Azure Foundations Benchmark
  "MITRE_ATTACK", // adversarial technique mapping (T####)
  "NIST_CSF", // NIST Cybersecurity Framework
  "ISO_27001",
  "SOC2",
  "PCI_DSS",
  "SOX", // Sarbanes-Oxley (public-company financial controls)
]);
export type Framework = z.infer<typeof Framework>;

/** A pointer from a finding to a specific control in a framework. */
export const FrameworkReference = z.object({
  framework: Framework,
  controlId: z.string().describe("e.g. 'IM-1', '1.1.1', 'T1078'"),
  title: z.string().optional(),
});
export type FrameworkReference = z.infer<typeof FrameworkReference>;
