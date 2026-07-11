"use client";

import type { Severity } from "@tars/contracts";
import type { BlastRadiusSummary } from "../../lib/viz-selectors";
import { SEVERITY_COLOR, SEVERITY_TEXT_COLOR } from "../../lib/sample";

interface BlastRadiusCardProps {
  summary: BlastRadiusSummary;
}

/**
 * Executive blast-radius surface: concentric impact rings + a severity-colored
 * path diagram. No exploitability / raw evidence — visual only.
 */
export function BlastRadiusCard({ summary }: BlastRadiusCardProps) {
  const primaryPath = summary.chainSteps[0] ?? [];

  return (
    <section data-viz="blast-radius" className="card rounded-2xl">
      <div className="border-b border-(--line) px-4 py-3">
        <h3 className="telemetry text-[11px] font-medium tracking-[0.05em] text-(--muted) uppercase">
          Blast radius
        </h3>
        <p className="mt-0.5 text-[13px] text-(--muted)">
          How findings chain into compromise paths — without raw exploit detail.
        </p>
      </div>

      <div className="grid items-start gap-6 p-4 md:grid-cols-[220px_1fr]">
        {/* Concentric impact rings + compact stats */}
        <div className="flex flex-col items-center gap-3">
          <BlastRings summary={summary} />
          <div className="grid w-full grid-cols-2 gap-2">
            <Stat label="Live paths" value={String(summary.chainCount)} />
            <Stat label="In a chain" value={String(summary.findingsInChains)} />
            <Stat
              label="Largest path"
              value={summary.largestChainSize ? String(summary.largestChainSize) : "—"}
            />
            <Stat label="Standalone" value={String(summary.isolatedFindings)} />
          </div>
        </div>

        {/* Path diagram + copy */}
        <div className="min-w-0">
          {summary.topSeverity ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-(--muted)">Highest severity on a path</span>
              <SeverityPill severity={summary.topSeverity} />
            </div>
          ) : null}

          <p className="mb-4 max-w-[65ch] text-[15px] leading-[1.7] text-(--ink)">
            {summary.businessImpactBlurb}
          </p>

          {primaryPath.length > 0 ? (
            <div>
              <div className="telemetry mb-2 text-[11px] tracking-[0.05em] text-(--muted) uppercase">
                Primary compromise path
              </div>
              <PathDiagram steps={primaryPath} />
            </div>
          ) : (
            <p className="text-sm text-(--muted)">No multi-finding paths in this scan.</p>
          )}

          {summary.chainSteps.length > 1
            ? summary.chainSteps.slice(1).map((steps, i) => (
                <div key={i} className="mt-4">
                  <div className="telemetry mb-2 text-[11px] tracking-[0.05em] text-(--muted) uppercase">
                    Path {i + 2}
                  </div>
                  <PathDiagram steps={steps} />
                </div>
              ))
            : null}
        </div>
      </div>
    </section>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] uppercase"
      style={{
        color: SEVERITY_TEXT_COLOR[severity],
        background: `color-mix(in srgb, ${SEVERITY_COLOR[severity]} 14%, transparent)`,
      }}
    >
      {severity}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-(--line) px-3 py-2">
      <div className="telemetry text-[10px] tracking-[0.05em] text-(--muted) uppercase">{label}</div>
      <div className="telemetry mt-0.5 text-base font-bold tabular-nums text-(--ink)">{value}</div>
    </div>
  );
}

/** Concentric rings — epicenter = chained findings; outer band = standalone. */
function BlastRings({ summary }: { summary: BlastRadiusSummary }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 86;
  const total = Math.max(1, summary.findingsInChains + summary.isolatedFindings);
  const chainFrac = summary.findingsInChains / total;
  const critColor = SEVERITY_COLOR.critical;
  const highColor = SEVERITY_COLOR.high;
  const accent = "var(--accent)";
  const chainR = maxR * (0.32 + chainFrac * 0.32);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Blast radius diagram: ${summary.findingsInChains} findings in chains, ${summary.isolatedFindings} standalone`}
      className="shrink-0"
    >
      <circle
        cx={cx}
        cy={cy}
        r={maxR * 0.72}
        fill={`color-mix(in srgb, ${highColor} 10%, transparent)`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={chainR}
        fill={`color-mix(in srgb, ${critColor} 16%, transparent)`}
      />

      <circle
        cx={cx}
        cy={cy}
        r={maxR}
        fill="none"
        stroke="var(--line)"
        strokeWidth={1}
        strokeDasharray="4 6"
        opacity={0.9}
      />
      <circle
        cx={cx}
        cy={cy}
        r={maxR * 0.72}
        fill="none"
        stroke={highColor}
        strokeWidth={2}
        opacity={0.4}
      />
      <circle
        cx={cx}
        cy={cy}
        r={chainR}
        fill="none"
        stroke={critColor}
        strokeWidth={3}
        opacity={0.75}
      />

      <circle cx={cx} cy={cy} r={26} fill="var(--panel)" stroke={accent} strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="telemetry"
        style={{ fill: "var(--ink)", fontSize: 20, fontWeight: 700 }}
      >
        {summary.findingsInChains}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        style={{ fill: "var(--muted)", fontSize: 9, letterSpacing: "0.08em" }}
      >
        CHAINED
      </text>

      <text
        x={cx}
        y={cy + maxR - 2}
        textAnchor="middle"
        className="telemetry"
        style={{ fill: "var(--muted)", fontSize: 10 }}
      >
        {summary.isolatedFindings} standalone
      </text>
    </svg>
  );
}

function PathDiagram({
  steps,
}: {
  steps: { id: string; shortLabel: string; severity: Severity; riskScore: number }[];
}) {
  if (steps.length === 0) return null;

  return (
    <ol
      className="flex flex-wrap items-stretch gap-y-3"
      aria-label={`Compromise path with ${steps.length} steps`}
    >
      {steps.map((step, i) => (
        <li key={step.id} className="flex min-w-0 items-center">
          <div
            className="box-border flex h-full w-[148px] shrink-0 flex-col overflow-hidden rounded-[12px] border px-3 py-2.5"
            style={{
              borderColor: SEVERITY_COLOR[step.severity],
              background: `color-mix(in srgb, ${SEVERITY_COLOR[step.severity]} 14%, var(--panel))`,
              boxShadow: step.severity === "critical" ? "var(--glow-crit)" : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <SeverityPill severity={step.severity} />
              <span className="telemetry shrink-0 text-[11px] font-bold tabular-nums text-(--ink)">
                {step.riskScore}
              </span>
            </div>
            <div
              className="mt-1.5 min-w-0 truncate text-[13px] leading-snug font-semibold text-(--ink)"
              title={step.shortLabel}
            >
              {step.shortLabel}
            </div>
            <div className="telemetry mt-1 text-[10px] text-(--muted)">Step {i + 1}</div>
          </div>
          {i < steps.length - 1 ? (
            <span className="mx-1.5 flex shrink-0 items-center text-(--muted)" aria-hidden>
              <svg width="20" height="12" viewBox="0 0 20 12">
                <path
                  d="M0 6 H14 M10 1 L16 6 L10 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
