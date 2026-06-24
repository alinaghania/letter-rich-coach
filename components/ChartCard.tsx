"use client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export type Chart = {
  title: string;
  type: "bar" | "line" | "pie" | "donut" | "kpi";
  labels: string[];
  values: number[];
  unit?: string;
  insight: string;
};

const PALETTE = ["#b0503a", "#3f7d54", "#caa23e", "#4f7a9e", "#8a5fa0", "#c2683f"];

function fmtNum(v: number, unit?: string) {
  let u = (unit || "").trim();
  const isCur = u === "$" || u === "€" || u === "£";
  const isPct = u === "%";
  if (!isCur && !isPct) u = ""; // drop mixed/garbage units (e.g. "$%%")
  const n = v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (isCur) return `${u}${n}`;
  if (isPct) return `${n}%`;
  return n;
}

export default function ChartCard({ chart }: { chart: Chart }) {
  const data = chart.labels.map((l, i) => ({ name: l, value: chart.values[i] ?? 0 }));
  const tip = (v: number) => fmtNum(v, chart.unit);
  // a line with <3 points looks empty — render it as bars instead
  const kind = chart.type === "line" && data.length < 3 ? "bar" : chart.type;

  // --- BIG KPI tiles ---------------------------------------------------------
  if (chart.type === "kpi") {
    return (
      <div className="chart">
        <h4>{chart.title}</h4>
        <div className="kpis" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 3)}, 1fr)` }}>
          {data.map((d, i) => (
            <div className="kpi" key={i}>
              <span className="kpi-val" style={{ color: PALETTE[i % PALETTE.length] }}>{fmtNum(d.value, chart.unit)}</span>
              <span className="kpi-lab">{d.name}</span>
            </div>
          ))}
        </div>
        <p className="insight">“{chart.insight}”</p>
      </div>
    );
  }

  return (
    <div className="chart">
      <h4>{chart.title}</h4>
      <p className="insight">“{chart.insight}”</p>
      <ResponsiveContainer width="100%" height={210}>
        {kind === "line" ? (
          <LineChart data={data} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b665b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b665b" }} />
            <Tooltip formatter={(v: number) => tip(v)} />
            <Line type="monotone" dataKey="value" stroke="#b0503a" strokeWidth={3} dot={{ r: 4, fill: "#b0503a" }} />
          </LineChart>
        ) : kind === "pie" || kind === "donut" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={kind === "donut" ? 52 : 0} outerRadius={84} paddingAngle={2} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => tip(v)} />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b665b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b665b" }} />
            <Tooltip formatter={(v: number) => tip(v)} cursor={{ fill: "#f1ede5" }} />
            <Bar dataKey="value" radius={[7, 7, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
