"use client";

import { Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import type { Severity } from "@tars/contracts";
import { SEVERITY_COLOR } from "../lib/sample";

/** Findings-by-severity donut — the environment-overview hero. */
export function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const data = (Object.entries(counts) as [Severity, number][])
    .filter(([, v]) => v > 0)
    .map(([sev, v]) => ({ name: sev, value: v, fill: SEVERITY_COLOR[sev] }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative" style={{ width: 168, height: 168 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-bold leading-none">{total}</div>
        <div className="muted text-xs mt-1">findings</div>
      </div>
    </div>
  );
}

/** Risk-posture gauge (0–100). */
export function RiskGauge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--color-crit)" : score >= 60 ? "var(--color-high)" : score >= 40 ? "var(--color-med)" : "var(--color-low)";
  const data = [{ name: "risk", value: score, fill: color }];
  return (
    <div className="relative" style={{ width: 168, height: 168 }}>
      <ResponsiveContainer>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" background={{ fill: "var(--line)" }} cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-bold leading-none">{score}</div>
        <div className="muted text-xs mt-1">risk /100</div>
      </div>
    </div>
  );
}
