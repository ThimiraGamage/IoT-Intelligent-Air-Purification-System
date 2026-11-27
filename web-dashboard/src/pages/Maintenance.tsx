import { useState } from "react";
import {
  Layers3,
  Wind,
  Leaf,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Heading, Progress } from "./ManagementUI";
import { localDate } from "./managementUtils";

interface Replacement {
  date: string;
  type: string;
  device: string;
}
function loadHistory(): Replacement[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem("aeris-filter-history") || "[]",
    );
    return Array.isArray(stored)
      ? stored.filter(
          (item): item is Replacement =>
            item !== null &&
            typeof item === "object" &&
            typeof item.date === "string" &&
            Number.isFinite(new Date(item.date).getTime()) &&
            typeof item.type === "string" &&
            typeof item.device === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export default function Maintenance() {
  const { device, resetFilter, notify, lastUpdated } = useApp();
  const [history, setHistory] = useState<Replacement[]>(loadHistory);
  const [confirm, setConfirm] = useState(false);
  const ownHistory = history.filter((item) => item.device === device.id);
  const remaining = Math.max(1, Math.round(device.filterLife * 1.8));
  const recommended = new Date(
    new Date(lastUpdated).getTime() + remaining * 86400000,
  );
  const last = ownHistory[0];
  function replace() {
    const next = [
      {
        date: new Date().toISOString(),
        type: "HEPA & activated carbon",
        device: device.id,
      },
      ...history,
    ];
    try {
      localStorage.setItem("aeris-filter-history", JSON.stringify(next));
    } catch {
      notify(
        "Replacement recorded for this session; browser storage is unavailable.",
      );
    }
    setHistory(next);
    resetFilter();
    setConfirm(false);
    notify("Replacement recorded. Filter estimate reset.");
  }
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="CARE THAT GOES A LONG WAY"
        title="Keep the good air flowing."
        description={`A little care for ${device.name}. A fresher home for longer.`}
        action={
          <button
            className="button primary"
            onClick={() => setConfirm(!confirm)}
          >
            <Plus size={17} />
            Record replacement
          </button>
        }
      />
      {confirm && (
        <section className="manage-confirm">
          <div className="card-header">
            <h3>Have you replaced the filters?</h3>
            <button
              className="manage-icon-button"
              aria-label="Cancel replacement"
              onClick={() => setConfirm(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            Record a completed HEPA and activated carbon replacement for{" "}
            {device.name}. This resets the local filter-life estimate to 100%;
            it does not verify a physical replacement.
          </p>
          <div className="manage-actions">
            <button className="button primary" onClick={replace}>
              Yes, record replacement
            </button>
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      <div className="grid-3">
        {[
          {
            name: "Pre-filter",
            icon: Wind,
            value: Math.min(100, device.filterLife + 12),
            description: "The first line of care",
            note: "Clean every 2–4 weeks",
          },
          {
            name: "HEPA filter",
            icon: Layers3,
            value: device.filterLife,
            description: "Capturing the little things",
            note: `About ${remaining} days remaining`,
          },
          {
            name: "Activated carbon",
            icon: Leaf,
            value: Math.max(1, device.filterLife - 6),
            description: "A fresher finishing touch",
            note: `About ${Math.max(1, remaining - 12)} days remaining`,
          },
        ].map((item) => (
          <section className="card manage-filter" key={item.name}>
            <div className="manage-filter-top">
              <span className="manage-icon">
                <item.icon size={25} />
              </span>
              <span className="badge green">Estimated</span>
            </div>
            <h2>{item.name}</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              {item.description}
            </p>
            <div className="manage-filter-value">
              {item.value}
              <span>% remaining</span>
            </div>
            <Progress
              value={item.value}
              label={`${item.name} estimated remaining life`}
            />
            <div className="manage-filter-meta">
              <span>{item.note}</span>
              <span>
                {item.value > 30 ? "Looking good" : "Plan a replacement"}
              </span>
            </div>
          </section>
        ))}
      </div>
      <div className="grid-2">
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">A LITTLE FORWARD PLANNING</p>
              <h2>Your maintenance calendar</h2>
            </div>
            <CalendarDays size={23} />
          </div>
          <ul className="manage-compact-list">
            <li>
              <span className="manage-inline">
                <Clock3 size={18} />
                Total operating hours
              </span>
              <strong>
                {Math.floor(device.operatingHours).toLocaleString()} h
              </strong>
            </li>
            <li>
              <span>Last replacement</span>
              <strong>
                {last
                  ? new Date(last.date).toLocaleDateString()
                  : "Not recorded"}
              </strong>
            </li>
            <li>
              <span>Recommended replacement</span>
              <strong>
                {recommended.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </li>
            <li>
              <span>Estimated remaining life</span>
              <strong>~{remaining} days</strong>
            </li>
          </ul>
          <p className="manage-caption">
            Estimates use demo operating hours and assumed filter life. Actual
            conditions depend on use and environment. Validated
            filter-monitoring hardware is not connected.
          </p>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">SIMPLE CARE</p>
              <h2>A five-minute refresh</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <ol className="manage-instructions">
            <li>
              Turn off the purifier, disconnect its power supply, and wait for
              the fan to stop.
            </li>
            <li>
              Open the service door and gently vacuum dust from the removable
              pre-filter.
            </li>
            <li>
              Keep HEPA and activated carbon filters dry. Do not wash or use
              cleaning chemicals.
            </li>
            <li>
              Replace worn filters with compatible parts, close the enclosure
              fully, then reconnect power.
            </li>
            <li>
              After replacement, record it here to restart the estimated
              maintenance timeline.
            </li>
          </ol>
          <p className="manage-caption">
            Prototype care guidance. Final instructions must be validated
            against the manufactured product and supplied filter specifications.
          </p>
        </section>
      </div>
      <section className="card manage-pad">
        <div className="card-header">
          <div>
            <p className="eyebrow">THE CARE LOG</p>
            <h2>Replacement history</h2>
          </div>
          <span className="badge green">{ownHistory.length} records</span>
        </div>
        {ownHistory.length === 0 ? (
          <div className="empty-state">
            <Layers3 size={30} />
            <h3>A fresh beginning.</h3>
            <p>Completed filter replacements will appear here.</p>
          </div>
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Filter</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {ownHistory.map((item, index) => (
                  <tr key={`${item.date}-${index}`}>
                    <td>{localDate(item.date)}</td>
                    <td>{item.type}</td>
                    <td>
                      <span className="badge green">Manually recorded</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
