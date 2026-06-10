"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const BRAND = "#1b9e8f";
const SLATE = "#94a3b8";
const COLORS = ["#1b9e8f", "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#0ea5e9"];

export function MonthlyChart({
  data,
}: {
  data: { label: string; ingresos: number; ganancia: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aún no hay datos de ventas.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={SLATE} />
        <YAxis
          tickFormatter={(v) => formatCurrency(Number(v)).replace(/\s?COP/, "")}
          tick={{ fontSize: 11 }}
          width={70}
          stroke={SLATE}
        />
        <Tooltip
          formatter={(v: number | string) => formatCurrency(Number(v))}
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ingresos" name="Ingresos" fill={BRAND} radius={[4, 4, 0, 0]} />
        <Bar dataKey="ganancia" name="Ganancia empresa" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AllocationPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sin datos para mostrar.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number | string) => formatCurrency(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
