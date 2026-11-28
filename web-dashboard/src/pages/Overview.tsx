import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  ChevronRight,
  Clock3,
  Fan,
  Leaf,
  MapPin,
  Moon,
  Power,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wifi,
  Zap,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import AqiRing from "../components/AqiRing";
import ProductVisual from "../components/ProductVisual";
import SensorCard from "../components/SensorCard";
import TrendChart from "../components/TrendChart";
import type { Mode } from "../types";

export default function Overview() {
  const app = useApp();
  const [range, setRange] = useState("24h");
  const [metric, setMetric] = useState<"aqi" | "pm25" | "co2">("aqi");
  const [showMethod, setShowMethod] = useState(false);
  const d = app.device;
  const currentHour = new Date(app.lastUpdated).getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";
  const chartData = app.history
    .filter(
      (p) =>
        Date.parse(p.timestamp) >=
        Date.parse(app.lastUpdated) -
          (range === "24h" ? 24 : range === "7d" ? 168 : 720) * 3600000,
    )
    .filter(
      (_, index, array) =>
        index % Math.max(1, Math.floor(array.length / 70)) === 0,
    );
  const availableSensors = app.readings.filter((r) => r.available);
  const preferredOrder = [
    "pm25",
    "pm10",
    "temperature",
    "humidity",
    "pm1",
    "co2",
    "tvoc",
  ];
  const selectedSensors = (
    availableSensors.length > 0
      ? [...availableSensors].sort(
          (a, b) =>
            preferredOrder.indexOf(a.key) - preferredOrder.indexOf(b.key),
        )
      : app.readings.filter((r) =>
          ["pm25", "co2", "temperature", "humidity"].includes(r.key),
        )
  ).slice(0, 4);
  const modes: { value: Mode; label: string; icon: typeof Leaf }[] = [
    { value: "auto", label: "Auto", icon: Sparkles },
    { value: "sleep", label: "Sleep", icon: Moon },
    { value: "turbo", label: "Turbo", icon: Zap },
    { value: "eco", label: "Eco", icon: Leaf },
  ];
  return (
    <motion.div
      className="overview-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-heading overview-heading">
        <div>
          <div className="welcome-kicker">
            <Sun size={15} />
            <span>YOUR EVERYDAY, A LITTLE FRESHER</span>
          </div>
          <h1>
            {greeting}, {app.settings.name}
            <span className="greeting-period">.</span>
          </h1>
          <p>Good air. A clear mind. Welcome to your healthier home.</p>
        </div>
        <div className="overview-heading-right">
          <label className="room-select">
            <MapPin size={16} />
            <select
              aria-label="Select room"
              value={app.selectedDeviceId}
              onChange={(e) => app.selectDevice(e.target.value)}
            >
              {app.devices.map((device) => (
                <option value={device.id} key={device.id}>
                  {device.room}
                </option>
              ))}
            </select>
          </label>
          <span className="updated-label">
            <span className={`status-dot ${d.online ? "" : "offline"}`} />
            {d.online ? "Live updates" : "Offline"}
            <span>·</span>
            <Clock3 size={12} />
            {new Date(app.lastUpdated).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
      <div className="overview-hero-grid">
        <section className="hero-product">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span />A LITTLE MORE BREATHING ROOM
            </span>
            <h2>
              A fresh start,
              <br />
              with every breath.
            </h2>
            <p>
              A calmer space begins with cleaner air.
              <br />
              Let your home take care of you.
            </p>
            <div className="hero-device-info">
              <div className="device-name-row">
                <h3>{d.name}</h3>
                <span className="badge green">
                  {d.online ? "Connected" : "Offline"}
                </span>
              </div>
              <span>
                <Wifi size={13} /> {d.room}{" "}
                <span className="inline-dot">·</span> Wi-Fi connected
              </span>
            </div>
            <div className="hero-bottom">
              <button
                className={`power-button ${d.power ? "on" : ""}`}
                aria-label={`Turn purifier ${d.power ? "off" : "on"}`}
                disabled={
                  app.command?.status === "pending" || !d.online || d.childLock
                }
                onClick={() => app.sendCommand({ power: !d.power })}
              >
                <Power size={21} />
              </button>
              <div>
                <strong>
                  {app.command?.status === "pending"
                    ? "Sending request…"
                    : d.power
                      ? "Purifier is on"
                      : "Purifier is off"}
                </strong>
                <span>
                  {app.command?.status === "pending"
                    ? "Awaiting confirmation"
                    : `${d.mode.charAt(0).toUpperCase() + d.mode.slice(1)} mode · Fan speed ${d.fanSpeed}`}
                </span>
              </div>
              <Link
                className="hero-device-link"
                to="/control"
                aria-label="Open device controls"
              >
                <SlidersHorizontal size={18} />
              </Link>
            </div>
          </div>
          <ProductVisual />
          <span className="hero-model-caption">
            AERIS ONE <span>DESIGNED TO CARE.</span>
          </span>
        </section>
        <section className="card air-quality-card">
          <div className="card-header">
            <h2>Air quality, at a glance</h2>
            <span className="live-pill">
              <span />
              {d.online ? "Live" : "Stale"}
            </span>
          </div>
          <AqiRing value={app.aqi} />
          <h3>
            {app.aqi <= 50
              ? "Your air feels good."
              : app.aqi <= 100
                ? "A little room to improve."
                : "Time for some fresh air."}
          </h3>
          <p>
            {app.aqi <= 50
              ? "Low particle levels. A comfortable space to breathe, focus, and unwind."
              : "Your purifier is keeping an eye on particle levels in your space."}
          </p>
          <div className="aqi-scale">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="aqi-scale-labels">
            <span>Good</span>
            <span>Hazardous</span>
          </div>
          <button
            className="method-button"
            onClick={() => setShowMethod(!showMethod)}
          >
            <ShieldCheck size={12} />
            Particulate index
            <span>{showMethod ? "Hide method" : "How it works"}</span>
          </button>
          {showMethod && (
            <div className="method-explanation">
              EPA 2024 particulate breakpoints applied to simulated
              instantaneous PM2.5 and PM10; the higher sub-index is shown.
              Official AQI needs validated 24-hour averages or NowCast. CO₂ and
              TVOC are separate readings.
            </div>
          )}
        </section>
      </div>
      <div className="overview-section-heading">
        <h2>A little closer to your air</h2>
        <Link to="/monitoring">
          View all sensors
          <ChevronRight size={14} />
        </Link>
      </div>
      <div className="sensor-grid overview-sensors">
        {selectedSensors.map((reading) => (
          <SensorCard key={reading.key} reading={reading} stale={!d.online} />
        ))}
      </div>
      <div className="overview-lower-grid">
        <section className="card overview-trends">
          <div className="card-header">
            <div>
              <h2>Your air, over time</h2>
              <p>A clearer picture of your everyday environment.</p>
            </div>
            <div className="segmented" aria-label="Trend time range">
              {["24h", "7d", "30d"].map((v) => (
                <button
                  key={v}
                  className={range === v ? "active" : ""}
                  onClick={() => setRange(v)}
                >
                  {v === "24h" ? "24 hours" : v === "7d" ? "7 days" : "30 days"}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-toolbar">
            <div className="chart-series-label">
              <span />{" "}
              {metric === "aqi"
                ? "Air quality index"
                : metric === "pm25"
                  ? "Fine particles (µg/m³)"
                  : "Carbon dioxide (ppm)"}
            </div>
            <select
              className="compact-select"
              aria-label="Chart pollutant"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="aqi">AQI</option>
              <option value="pm25">PM2.5</option>
              <option value="co2">CO₂</option>
            </select>
          </div>
          <TrendChart data={chartData} dataKey={metric} />
          <div className="chart-note">
            <Leaf size={13} />
            <span>
              {metric === "aqi"
                ? "Every reading tells a story. Your purifier helps keep it a good one."
                : app.telemetrySource === "live"
                  ? "Live ESP32 readings update every 5 seconds."
                  : "Waiting for live ESP32 readings."}
            </span>
            <Link to="/analytics">
              Explore analytics
              <ChevronRight size={13} />
            </Link>
          </div>
        </section>
        <section className="card quick-control">
          <div className="card-header">
            <h2>Make yourself comfortable</h2>
            <SlidersHorizontal size={16} />
          </div>
          <div className="quick-mode-header">
            <span>Purification mode</span>
            <span className="badge green">{d.mode}</span>
          </div>
          <div className="mode-grid">
            {modes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`mode-button ${d.mode === value ? "active" : ""}`}
                aria-pressed={d.mode === value}
                disabled={
                  !d.online || app.command?.status === "pending" || d.childLock
                }
                onClick={() => app.sendCommand({ mode: value })}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="fan-speed-label">
            <span>
              <Fan size={15} />
              Fan speed
            </span>
            <strong>
              {d.fanSpeed}
              <span> / 5</span>
            </strong>
          </div>
          <input
            className="fan-slider"
            type="range"
            aria-label="Quick fan speed"
            min="1"
            max="5"
            step="1"
            value={d.fanSpeed}
            disabled={
              !d.online || app.command?.status === "pending" || d.childLock
            }
            onChange={(e) =>
              app.sendCommand({
                fanSpeed: Number(e.target.value),
                mode: "manual",
              })
            }
          />
          <div className="range-labels">
            <span>Quiet</span>
            <span>Powerful</span>
          </div>
          <div className="filter-summary">
            <div className="filter-icon">
              <Fan size={20} />
            </div>
            <div>
              <strong>Your filter is in good shape</strong>
              <span>Estimated life remaining</span>
            </div>
            <strong>{d.filterLife}%</strong>
          </div>
          <div className="filter-progress">
            <span style={{ width: `${d.filterLife}%` }} />
          </div>
          <Link className="filter-link" to="/maintenance">
            A little care goes a long way
            <ChevronRight size={14} />
          </Link>
          {app.command && (
            <p
              className={`command-feedback ${app.command.status}`}
              role="status"
            >
              {app.command.message}
            </p>
          )}
        </section>
      </div>
      <div className="overview-bottom-grid">
        <section className="card recent-activity">
          <div className="card-header">
            <h2>Around your home</h2>
            <Link to="/notifications">
              View all
              <ChevronRight size={14} />
            </Link>
          </div>
          {app.notifications.slice(0, 2).map((n) => (
            <Link to="/notifications" className="activity-row" key={n.id}>
              <span
                className={`activity-icon ${n.severity === "success" ? "success" : ""}`}
              >
                {n.severity === "success" ? (
                  <Leaf size={17} />
                ) : (
                  <Bell size={17} />
                )}
              </span>
              <div>
                <strong>{n.title}</strong>
                <span>{n.message}</span>
              </div>
              <span className="activity-time">
                {new Date(n.timestamp).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </Link>
          ))}
          {app.notifications.length === 0 && (
            <p className="muted">You're all caught up. Your home is quiet.</p>
          )}
        </section>
        <section className="daily-insight">
          <span className="insight-icon">
            <Sparkles size={21} />
          </span>
          <div>
            <span className="eyebrow">A THOUGHT FOR YOUR SPACE</span>
            <h3>A quieter night. A brighter morning.</h3>
            <p>
              Try Sleep mode for a gentle airflow and a dimmed display when it's
              time to wind down.
            </p>
            <Link to="/automation">
              Find your rhythm
              <ChevronRight size={14} />
            </Link>
          </div>
          <span className="insight-demo">Air quality insight</span>
        </section>
      </div>
      <div className="overview-data-note">
        <Activity size={13} />
        <span>
          You're exploring a simulation. Readings, connectivity, and commands
          are for demonstration.
        </span>
      </div>
    </motion.div>
  );
}
