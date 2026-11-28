import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FlaskConical,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import type { HistoryPoint, SensorKey } from "../types";
import "./analytics.css";

type Period = "hour" | "day" | "week" | "month" | "custom";
type PlotPoint = HistoryPoint & { time: number };
const metrics: Record<SensorKey, { label: string; unit: string }> = {
  pm1: { label: "PM1.0", unit: "µg/m³" },
  pm25: { label: "PM2.5", unit: "µg/m³" },
  pm10: { label: "PM10", unit: "µg/m³" },
  co2: { label: "CO₂", unit: "ppm" },
  tvoc: { label: "TVOC", unit: "ppb" },
  temperature: { label: "Temperature", unit: "°C" },
  humidity: { label: "Humidity", unit: "%" },
};
const periodOptions: { key: Period; label: string }[] = [
  { key: "hour", label: "Hourly" },
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "custom", label: "Custom" },
];
const dayString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const numericKeys = [
  "pm1",
  "pm25",
  "pm10",
  "co2",
  "tvoc",
  "temperature",
  "humidity",
  "aqi",
  "power",
] as const;

function bucketHistory(rows: HistoryPoint[], interval: number): PlotPoint[] {
  const buckets = new Map<number, HistoryPoint[]>();
  for (const row of rows) {
    const time =
      Math.floor(new Date(row.timestamp).getTime() / interval) * interval;
    buckets.set(time, [...(buckets.get(time) ?? []), row]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, items]) => {
      const entry: PlotPoint = {
        ...items[0],
        time,
        timestamp: new Date(time).toISOString(),
      };
      for (const key of numericKeys)
        entry[key] = Number(
          (
            items.reduce((sum, item) => sum + item[key], 0) / items.length
          ).toFixed(2),
        );
      return entry;
    });
}

export default function Analytics() {
  const { history, device, notify } = useApp();
  const [period, setPeriod] = useState<Period>("day");
  const [metric, setMetric] = useState<SensorKey>("pm25");
  const [comparison, setComparison] = useState<SensorKey | "">("");
  const [startDate, setStartDate] = useState(() =>
    dayString(new Date(Date.now() - 6 * 86400000)),
  );
  const [endDate, setEndDate] = useState(() => dayString(new Date()));
  const [tablePage, setTablePage] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const now = history.length
    ? Math.max(...history.map((row) => Date.parse(row.timestamp)))
    : startedAt;
  const invalidRange =
    period === "custom" && (!startDate || !endDate || startDate > endDate);
  const filtered = useMemo(() => {
    if (invalidRange) return [];
    const span =
      period === "hour"
        ? 3600000
        : period === "day"
          ? 86400000
          : period === "week"
            ? 604800000
            : 2592000000;
    const start =
      period === "custom"
        ? new Date(`${startDate}T00:00:00`).getTime()
        : now - span;
    const end =
      period === "custom" ? new Date(`${endDate}T23:59:59.999`).getTime() : now;
    return history
      .filter((row) => {
        const time = Date.parse(row.timestamp);
        return time >= start && time <= end;
      })
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }, [history, period, startDate, endDate, invalidRange, now]);
  const plotted = useMemo(
    () =>
      bucketHistory(
        filtered,
        period === "hour" ? 300000 : period === "day" ? 3600000 : 86400000,
      ),
    [filtered, period],
  );
  const values = filtered.map((row) => row[metric]);
  const stats = values.length
    ? {
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        minimum: Math.min(...values),
        maximum: Math.max(...values),
      }
    : null;
  const meta = metrics[metric];
  const compareMeta = comparison ? metrics[comparison] : null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const safePage = Math.min(tablePage, pageCount - 1);
  const tableRows = filtered
    .slice()
    .reverse()
    .slice(safePage * 8, safePage * 8 + 8);
  const tickFormat = (time: number) =>
    new Date(time).toLocaleString(
      undefined,
      period === "hour" || period === "day"
        ? { hour: "2-digit", minute: "2-digit" }
        : { month: "short", day: "numeric" },
    );
  const selectPeriod = (next: Period) => {
    setPeriod(next);
    setTablePage(0);
  };
  const exportData = () => {
    if (!filtered.length) return;
    const columns = [
      "timestamp",
      `${meta.label} (${meta.unit})`,
      ...(comparison
        ? [`${metrics[comparison].label} (${metrics[comparison].unit})`]
        : []),
      "Particulate index (demo)",
      "device_id",
      "source",
    ];
    const rows = filtered.map((row) => [
      row.timestamp,
      row[metric],
      ...(comparison ? [row[comparison]] : []),
      row.aqi,
      device.id,
      "simulated",
    ]);
    const csv = [columns, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `aeris-${metric}-${period}-${dayString(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${filtered.length.toLocaleString()} simulated readings.`);
  };

  return (
    <div className="analytics-page">
      <div className="page-heading analytics-heading">
        <div>
          <p className="eyebrow">YOUR AIR, OVER TIME</p>
          <h1>Analytics</h1>
          <p className="muted">A clearer picture of the air you live in.</p>
        </div>
        <button
          className="button secondary"
          onClick={exportData}
          disabled={!filtered.length}
        >
          <Download size={17} /> Export CSV
        </button>
      </div>
      <div className="analytics-toolbar">
        <div className="segmented" aria-label="History interval">
          {periodOptions.map((option) => (
            <button
              key={option.key}
              className={period === option.key ? "active" : ""}
              onClick={() => selectPeriod(option.key)}
              aria-pressed={period === option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="analytics-source">
          <span className="badge green">Simulated history</span>
          <span className="muted">{device.room}</span>
        </span>
      </div>
      {period === "custom" && (
        <div className="card analytics-dates">
          <CalendarDays size={20} />
          <label className="field">
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setTablePage(0);
              }}
              max={endDate || undefined}
            />
          </label>
          <label className="field">
            To
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setTablePage(0);
              }}
              min={startDate || undefined}
            />
          </label>
          {invalidRange && (
            <p role="alert">Choose an end date on or after the start date.</p>
          )}
        </div>
      )}
      <div className="analytics-stats">
        {[
          { label: "Average reading", value: stats?.average, Icon: Activity },
          {
            label: "Lowest reading",
            value: stats?.minimum,
            Icon: TrendingDown,
          },
          { label: "Highest reading", value: stats?.maximum, Icon: TrendingUp },
        ].map(({ label, value, Icon }) => (
          <div className="card analytics-stat" key={label}>
            <div>
              <p className="muted">{label}</p>
              <p className="analytics-stat-number">
                {value === undefined ? "—" : value.toFixed(1)}
                <span>{meta.unit}</span>
              </p>
              <span className="analytics-stat-caption">
                {meta.label} · selected interval
              </span>
            </div>
            <span className="analytics-icon">
              <Icon size={21} />
            </span>
          </div>
        ))}
      </div>
      <section className="card analytics-main-chart">
        <div className="card-header">
          <div>
            <h2>Air quality trends</h2>
            <p className="muted">
              {filtered.length.toLocaleString()} samples ·{" "}
              {period === "hour"
                ? "5-minute"
                : period === "day"
                  ? "Hourly"
                  : "Daily"}{" "}
              averages
            </p>
          </div>
          <div className="analytics-metric-selectors">
            <label className="field">
              Pollutant
              <select
                value={metric}
                onChange={(event) => {
                  const next = event.target.value as SensorKey;
                  setMetric(next);
                  if (comparison === next) setComparison("");
                }}
              >
                {Object.entries(metrics).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Compare with
              <select
                value={comparison}
                onChange={(event) =>
                  setComparison(event.target.value as SensorKey | "")
                }
              >
                <option value="">No comparison</option>
                {Object.entries(metrics)
                  .filter(([key]) => key !== metric)
                  .map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>
        <div className="analytics-chart-label">
          <span>
            <i style={{ background: "#38795c" }} />
            {meta.label} <span className="muted">({meta.unit})</span>
          </span>
          {comparison && (
            <span>
              <i style={{ background: "#c39861" }} />
              {compareMeta?.label}{" "}
              <span className="muted">({compareMeta?.unit}, right axis)</span>
            </span>
          )}
        </div>
        <div className="analytics-chart">
          {plotted.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={plotted}
                margin={{
                  top: 18,
                  right: comparison ? 12 : 24,
                  left: 0,
                  bottom: 4,
                }}
              >
                <defs>
                  <linearGradient
                    id="analytics-air-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#38795c" stopOpacity={0.17} />
                    <stop
                      offset="100%"
                      stopColor="#38795c"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tickFormatter={tickFormat}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="primary"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  domain={["auto", "auto"]}
                />
                {comparison && (
                  <YAxis
                    yAxisId="secondary"
                    orientation="right"
                    tick={{ fill: "#a07849", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    domain={["auto", "auto"]}
                  />
                )}
                <Tooltip
                  labelFormatter={(label) =>
                    new Date(Number(label)).toLocaleString()
                  }
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} ${name === meta.label ? meta.unit : (compareMeta?.unit ?? "")}`,
                    name,
                  ]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                />
                {stats && (
                  <ReferenceLine
                    yAxisId="primary"
                    y={stats.average}
                    stroke="#8ca997"
                    strokeDasharray="4 5"
                  />
                )}
                <Area
                  yAxisId="primary"
                  type="monotone"
                  dataKey={metric}
                  name={meta.label}
                  stroke="#38795c"
                  strokeWidth={2.5}
                  fill="url(#analytics-air-fill)"
                  activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface)" }}
                  isAnimationActive={false}
                />
                {comparison && (
                  <Area
                    yAxisId="secondary"
                    type="monotone"
                    dataKey={comparison}
                    name={compareMeta?.label}
                    stroke="#c39861"
                    strokeWidth={2}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <Activity size={28} />
              <h3>No readings in this interval</h3>
              <p className="muted">
                Select another interval to explore the simulated dataset.
              </p>
            </div>
          )}
        </div>
        <p className="analytics-chart-note">
          Dashed line shows the interval average. Measurements and historical
          patterns are simulated for demonstration.
        </p>
      </section>
      <div className="analytics-lower-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Particulate air quality index</h2>
              <p className="muted">Your historical indoor air snapshot</p>
            </div>
            <span className="analytics-icon">
              <Activity size={20} />
            </span>
          </div>
          <div className="analytics-aqi-chart">
            {plotted.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={plotted}
                  margin={{ top: 15, right: 10, bottom: 0, left: -12 }}
                >
                  <CartesianGrid
                    stroke="var(--line)"
                    vertical={false}
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="time"
                    tickFormatter={tickFormat}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    minTickGap={40}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    labelFormatter={(label) =>
                      new Date(Number(label)).toLocaleString()
                    }
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend
                    iconType="plainline"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aqi"
                    name="Demo particulate index"
                    stroke="#38795c"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state muted">
                No index data for this interval.
              </div>
            )}
          </div>
          <p className="analytics-chart-note">
            Calculated from instantaneous simulated PM2.5 and PM10 using EPA
            breakpoints. This is an indicative index; official AQI requires
            prescribed averaging.
          </p>
        </section>
        <section className="card analytics-cycle">
          <div className="card-header">
            <div>
              <h2>A little cleaner, every minute</h2>
              <p className="muted">Illustrative purification cycle</p>
            </div>
            <FlaskConical size={21} className="muted" />
          </div>
          <div className="analytics-cycle-bars">
            <div>
              <div>
                <span>Before purification</span>
                <strong>
                  42.8 <small>µg/m³</small>
                </strong>
              </div>
              <span className="analytics-cycle-track">
                <i style={{ width: "86%", background: "#c9ac86" }} />
              </span>
            </div>
            <div>
              <div>
                <span>After purification</span>
                <strong>
                  8.4 <small>µg/m³</small>
                </strong>
              </div>
              <span className="analytics-cycle-track">
                <i style={{ width: "17%", background: "#38795c" }} />
              </span>
            </div>
          </div>
          <div className="analytics-cycle-detail">
            <TrendingDown size={23} />
            <div>
              <strong>80% lower PM2.5</strong>
              <p className="muted">In this simulated 60-minute example</p>
            </div>
          </div>
          <p className="analytics-chart-note">
            Demo comparison, separate from the selected history. This example is
            not measured product performance or evidence of purification
            efficiency.
          </p>
        </section>
      </div>
      <section className="card analytics-data">
        <div className="card-header">
          <div>
            <h2>The details behind your air</h2>
            <p className="muted">
              Individual sensor readings for research and review
            </p>
          </div>
          <button
            className="button secondary small"
            onClick={exportData}
            disabled={!filtered.length}
          >
            <Download size={15} /> Download data
          </button>
        </div>
        <div className="analytics-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date & time</th>
                <th scope="col">
                  {meta.label} ({meta.unit})
                </th>
                {comparison && (
                  <th scope="col">
                    {compareMeta?.label} ({compareMeta?.unit})
                  </th>
                )}
                <th scope="col">Particulate index</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={`${row.timestamp}-${index}`}>
                  <td>
                    {new Date(row.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{row[metric].toFixed(1)}</td>
                  {comparison && <td>{row[comparison].toFixed(1)}</td>}
                  <td>{Math.round(row.aqi)}</td>
                  <td>
                    <span className="analytics-demo-tag">Simulated</span>
                  </td>
                </tr>
              ))}
              {!tableRows.length && (
                <tr>
                  <td colSpan={comparison ? 5 : 4} className="muted">
                    No sensor readings match this interval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="analytics-pagination">
          <p className="muted">
            {filtered.length
              ? `${safePage * 8 + 1}–${Math.min((safePage + 1) * 8, filtered.length)} of ${filtered.length.toLocaleString()} readings`
              : "0 readings"}
          </p>
          <div>
            <button
              className="button secondary small"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setTablePage(safePage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              className="button secondary small"
              aria-label="Next page"
              disabled={safePage + 1 >= pageCount}
              onClick={() => setTablePage(safePage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
