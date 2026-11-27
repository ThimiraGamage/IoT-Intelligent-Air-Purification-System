import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Droplets,
  Thermometer,
  Wind,
  Cloud,
  Activity,
} from "lucide-react";
import type { SensorReading } from "../types";
const icons = {
  pm1: Wind,
  pm25: Wind,
  pm10: Wind,
  co2: Cloud,
  tvoc: Activity,
  temperature: Thermometer,
  humidity: Droplets,
};
export default function SensorCard({
  reading,
  detailed = false,
  stale = false,
}: {
  reading: SensorReading;
  detailed?: boolean;
  stale?: boolean;
}) {
  const Icon = icons[reading.key];
  return (
    <article className={`card sensor-card ${detailed ? "detailed" : ""}`}>
      <div className="sensor-top">
        <span className="sensor-label">
          <Icon size={16} />
          {reading.label}
        </span>
        <span className={`sensor-state ${stale ? "amber" : ""}`}>
          {stale
            ? "Stale"
            : !reading.available
              ? "Unavailable"
              : reading.status}
        </span>
      </div>
      <div className="sensor-body">
        <div>
          <strong>
            {reading.available
              ? reading.value.toFixed(
                  reading.key === "co2" || reading.key === "humidity" ? 0 : 1,
                )
              : "—"}
          </strong>
          <span>{reading.unit}</span>
        </div>
        <div className="sparkline" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={reading.history.map((value) => ({ value }))}>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#719c80"
                strokeWidth={1.8}
                fill="#719c80"
                fillOpacity={0.07}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="sensor-bottom">
        <span className="sensor-trend">
          {reading.trend <= 0 ? (
            <ArrowDownRight size={13} />
          ) : (
            <ArrowUpRight size={13} />
          )}{" "}
          {Math.abs(reading.trend).toFixed(1)}% <span>vs. last hour</span>
        </span>
        {detailed && (
          <time dateTime={reading.updatedAt}>
            {new Date(reading.updatedAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        )}
      </div>
      {detailed && (
        <div className="sensor-availability">
          <span className={`status-dot ${stale ? "offline" : ""}`} />
          {stale
            ? "Disconnected · last reading retained"
            : reading.available
              ? "Simulated sensor connected"
              : "Sensor not integrated"}
        </div>
      )}
    </article>
  );
}
