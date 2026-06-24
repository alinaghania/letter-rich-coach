"use client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export type Chart = {
  title: string;
  type: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
  unit?: string;
  insight: string;
};

const PALETTE = ["#9a4a32", "#3f7d54", "#c79a3c", "#5a7d9a", "#8a6d9a", "#b05c5c"];

export default function ChartCard({ chart }: { chart: Chart }) {
  const data = chart.labels.map((l, i) => ({ name: l, value: chart.values[i] ?? 0 }));
  const unit = chart.unit ? ` ${chart.unit}` : "";
  const fmt = (v: number) => `${v.toLocaleString("fr-FR")}${unit}`;

  return (
    <div className="chart">
      <h4>{chart.title}</h4>
      <p className="insight">“{chart.insight}”</p>
      <ResponsiveContainer width="100%" height={210}>
        {chart.type === "line" ? (
          <LineChart data={data} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6a665d" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6a665d" }} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Line type="monotone" dataKey="value" stroke="#9a4a32" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        ) : chart.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6a665d" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6a665d" }} />
            <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: "#f1efe9" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
