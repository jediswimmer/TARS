"use client";

import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import type { Severity } from "@tars/contracts";
import { SEVERITY_COLOR } from "../lib/sample";

/** Match KPI tile thresholds: ≥75 crit, ≥60 high, ≥40 med, else low. */
function riskColor(score: number): string {
  if (score >= 75) return "var(--color-crit)";
  if (score >= 60) return "var(--color-high)";
  if (score >= 40) return "var(--color-med)";
  return "var(--color-low)";
}

/** Findings-by-severity donut — the environment-overview hero. */
export function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const data = (Object.entries(counts) as [Severity, number][])
    .filter(([, v]) => v > 0)
    .map(([sev, v]) => ({ name: sev, value: v, fill: SEVERITY_COLOR[sev] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const breakdown = data.map((d) => `${d.value} ${d.name}`).join(", ");
  const ariaLabel = `Severity distribution: ${total} findings — ${breakdown}`;

  return (
    <div
      className="relative size-[168px]"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="telemetry text-3xl font-bold leading-none text-(--ink)">{total}</div>
        <div className="mt-1 text-xs text-(--muted)">findings</div>
      </div>
    </div>
  );
}

/** Risk-posture gauge (0–100). */
export function RiskGauge({ score }: { score: number }) {
  const color = riskColor(score);
  const data = [{ name: "risk", value: score, fill: color }];
  return (
    <div
      className="relative size-[168px]"
      role="img"
      aria-label={`Overall risk ${score} of 100`}
    >
      <ResponsiveContainer>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" background={{ fill: "var(--line)" }} cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="telemetry text-3xl font-bold leading-none" style={{ color }}>
          {score}
        </div>
        <div className="mt-1 text-xs text-(--muted)">risk /100</div>
      </div>
    </div>
  );
}
