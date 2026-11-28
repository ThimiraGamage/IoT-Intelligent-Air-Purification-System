import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../types";
export default function TrendChart({
  data,
  dataKey = "aqi",
  height = 215,
}: {
  data: HistoryPoint[];
  dataKey?: "aqi" | "pm25" | "co2";
  height?: number;
}) {
  return (
    <div className="trend-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: -27, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4c8a68" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#4c8a68" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            axisLine={false}
            tickLine={false}
            minTickGap={45}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            domain={[0, "auto"]}
            tickCount={4}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              color: "var(--text)",
            }}
            labelFormatter={(v) => new Date(String(v)).toLocaleString()}
            formatter={(v) => [
              `${Number(v).toFixed(dataKey === "pm25" ? 1 : 0)}${dataKey === "pm25" ? " µg/m³" : dataKey === "co2" ? " ppm" : ""}`,
              dataKey === "aqi"
                ? "Demo AQI"
                : dataKey === "pm25"
                  ? "PM2.5"
                  : "CO₂",
            ]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#478363"
            strokeWidth={2.5}
            fill={`url(#fill-${dataKey})`}
            activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
