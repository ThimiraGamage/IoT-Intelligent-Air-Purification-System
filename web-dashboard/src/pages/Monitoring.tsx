import { useState } from "react";
import { Activity, Beaker, ChevronDown, Radio, WifiOff } from "lucide-react";
import { useApp } from "../hooks/useApp";
import SensorCard from "../components/SensorCard";
import AqiRing from "../components/AqiRing";
import TrendChart from "../components/TrendChart";
export default function Monitoring() {
  const app = useApp();
  const [experimental, setExperimental] = useState(false);
  const stale = !app.device.online || app.connection !== "connected";
  const isLive = app.telemetrySource === "live";
  const availableReadings = app.readings.filter((r) => r.available);
  const unavailableReadings = app.readings.filter((r) => !r.available);
  const primaryReadings =
    availableReadings.length > 0 ? availableReadings : app.readings;
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A CLEARER PICTURE</span>
          <h1>Your air, in real time.</h1>
          <p>Small details. A deeper understanding of your space.</p>
        </div>
        <button className="button secondary" onClick={app.simulateConnection}>
          {app.connection === "connected" ? (
            <WifiOff size={16} />
          ) : (
            <Radio size={16} />
          )}{" "}
          {app.connection === "connected"
            ? "Simulate disconnection"
            : "Restore connection"}
        </button>
      </div>
      <div className="monitor-summary card">
        <AqiRing value={app.aqi} compact />
        <div>
          <span className="badge green">
            {stale
              ? "Last known reading"
              : isLive
                ? "Live ESP32 telemetry"
                : "Presentation telemetry"}
          </span>
          <h2>A little insight into every breath.</h2>
          <p>
            {availableReadings.length} active sensor
            {availableReadings.length === 1 ? "" : "s"} reported from{" "}
            {app.device.name} in your {app.device.room.toLowerCase()}
            {isLive ? " via Firebase Realtime Database." : " (simulated)."}
          </p>
          <div className="monitor-meta">
            <span>
              <Activity size={14} />
              Every 5 seconds
            </span>
            <span>
              Updated {new Date(app.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
      <div className="sensor-grid monitor-sensor-grid">
        {primaryReadings.map((reading) => (
          <SensorCard
            key={reading.key}
            reading={reading}
            detailed
            stale={stale}
            live={isLive}
          />
        ))}
      </div>
      {unavailableReadings.length > 0 && availableReadings.length > 0 && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header">
            <div>
              <h2>Sensors not connected</h2>
              <p>
                These parameters are hidden from the live grid until hardware
                sensors are attached to the ESP32.
              </p>
            </div>
            <span className="badge amber">
              {unavailableReadings.length} unavailable
            </span>
          </div>
          <div className="sensor-grid monitor-sensor-grid">
            {unavailableReadings.map((reading) => (
              <SensorCard
                key={reading.key}
                reading={reading}
                detailed
                stale={stale}
                live={isLive}
              />
            ))}
          </div>
        </section>
      )}
      <section className="card monitoring-chart">
        <div className="card-header">
          <div>
            <h2>The last two hours</h2>
            <p>Indoor particulate index over the last two hours. Hover for details.</p>
          </div>
          <span className="badge green">AQI</span>
        </div>
        <TrendChart
          data={app.history.filter(
            (p) =>
              Date.parse(p.timestamp) >
              Date.parse(app.lastUpdated) - 2 * 3600000,
          )}
          height={260}
        />
      </section>
      <section className="card experimental-section">
        <button
          className="experimental-toggle"
          onClick={() => setExperimental(!experimental)}
          aria-expanded={experimental}
        >
          <Beaker size={23} />
          <div>
            <h2>A little further, through research.</h2>
            <p>Experimental sensing · Not available in this prototype</p>
          </div>
          <ChevronDown className={experimental ? "rotate" : ""} size={20} />
        </button>
        {experimental && (
          <div className="experimental-content">
            <p>
              Individual chemical measurements require dedicated, suitable
              sensors and validation. A total VOC sensor cannot identify
              benzene, toluene, LPG, or other individual hazardous substances.
            </p>
            <div className="grid-3">
              {["Benzene", "Toluene", "LPG / other gases"].map((label) => (
                <div className="experimental-sensor" key={label}>
                  <span>{label}</span>
                  <strong>—</strong>
                  <span className="badge amber">
                    Research stage · Unavailable
                  </span>
                </div>
              ))}
            </div>
            <p className="muted">
              This prototype is not a certified gas alarm, fire alarm, or
              medical-grade safety device.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
