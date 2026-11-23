"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type SalesChartPoint = {
  day: string;
  total: number;
};

export function SalesChart({ data }: { data: SalesChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B08A49" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#B08A49" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E3D6CC" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6B5A72", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6B5A72", fontSize: 12 }}
          tickFormatter={(value: number) => `R$${value}`}
        />
        <Tooltip
          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Vendas"]}
          contentStyle={{
            borderRadius: 8,
            borderColor: "#E3D6CC",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#B08A49"
          strokeWidth={2}
          fill="url(#salesGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
