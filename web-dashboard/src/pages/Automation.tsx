import { useState, type FormEvent } from "react";
import {
  Plus,
  Sparkles,
  Wind,
  Moon,
  Bell,
  Pencil,
  Trash2,
  X,
  Clock3,
  Leaf,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import type { AutomationRule } from "../types";
import { Heading, Toggle } from "./ManagementUI";

const initial: Omit<AutomationRule, "id"> = {
  name: "",
  sensor: "pm25",
  threshold: 15,
  time: "22:00",
  action: "turbo",
  enabled: true,
};
function describe(rule: AutomationRule) {
  return `${rule.sensor === "time" ? `At ${rule.time} (your local time)` : rule.sensor === "filter" ? `When filter life falls below ${rule.threshold}%` : `When ${rule.sensor === "pm25" ? "PM2.5" : "demo AQI"} exceeds ${rule.threshold}${rule.sensor === "pm25" ? " µg/m³" : ""}`} · ${rule.action === "turbo" ? "Activate turbo mode" : rule.action === "sleep" ? "Activate sleep mode" : "Send a notification"}`;
}
export default function Automation() {
  const { rules, addRule, updateRule, deleteRule, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(initial);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      notify("Give this routine a name before saving.");
      return;
    }
    if (editing) updateRule(editing, { ...draft, name: draft.name.trim() });
    else addRule({ ...draft, name: draft.name.trim() });
    setOpen(false);
    setEditing(null);
    setDraft(initial);
    notify(editing ? "Automation updated" : "Automation created");
  }
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="THOUGHTFULLY AUTOMATIC"
        title="Fresh air, on autopilot."
        description="Build small routines that make a big difference."
        action={
          <button
            className="button primary"
            onClick={() => {
              setDraft(initial);
              setEditing(null);
              setOpen(!open);
            }}
          >
            <Plus size={17} />
            Create rule
          </button>
        }
      />
      <div className="grid-3">
        <div className="card manage-energy-stat">
          <Wind size={23} />
          <p className="muted">Your routines</p>
          <div className="stat-value">{rules.length}</div>
          <p className="muted">Made for your home</p>
        </div>
        <div className="card manage-energy-stat">
          <Clock3 size={23} />
          <p className="muted">Active automations</p>
          <div className="stat-value">
            {rules.filter((rule) => rule.enabled).length}
          </div>
          <p className="muted">Evaluated by the demo service</p>
        </div>
        <div className="card manage-energy-stat">
          <Leaf size={23} />
          <p className="muted">A considered approach</p>
          <div className="stat-value">Less effort.</div>
          <p className="muted">Airflow that follows your day</p>
        </div>
      </div>
      {open && (
        <section className="card manage-pad">
          <div className="card-header">
            <h2>{editing ? "Edit your routine" : "A new little routine"}</h2>
            <button
              className="manage-icon-button"
              aria-label="Close rule editor"
              onClick={() => setOpen(false)}
            >
              <X size={19} />
            </button>
          </div>
          <form className="manage-form" onSubmit={submit}>
            <label>
              Rule name
              <input
                required
                maxLength={60}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder="Evening wind-down"
              />
            </label>
            <div className="manage-form-grid">
              <label>
                When
                <select
                  value={draft.sensor}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sensor: event.target.value as AutomationRule["sensor"],
                    })
                  }
                >
                  <option value="pm25">PM2.5 exceeds a threshold</option>
                  <option value="aqi">Demo AQI exceeds a threshold</option>
                  <option value="time">At a scheduled time</option>
                  <option value="filter">
                    Filter life falls below a threshold
                  </option>
                </select>
              </label>
              {draft.sensor === "time" ? (
                <label>
                  Local time
                  <input
                    required
                    type="time"
                    value={draft.time}
                    onChange={(event) =>
                      setDraft({ ...draft, time: event.target.value })
                    }
                  />
                </label>
              ) : (
                <label>
                  {draft.sensor === "pm25"
                    ? "Threshold (µg/m³)"
                    : draft.sensor === "filter"
                      ? "Filter life (%)"
                      : "Demo AQI threshold"}
                  <input
                    required
                    type="number"
                    min="1"
                    max={
                      draft.sensor === "filter"
                        ? 100
                        : draft.sensor === "pm25"
                          ? 500
                          : 500
                    }
                    value={draft.threshold}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        threshold: Number(event.target.value),
                      })
                    }
                  />
                </label>
              )}
            </div>
            <label>
              Then
              <select
                value={draft.action}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    action: event.target.value as AutomationRule["action"],
                  })
                }
              >
                <option value="turbo">Activate turbo mode</option>
                <option value="sleep">Activate sleep mode</option>
                <option value="notify">Send a notification</option>
              </select>
            </label>
            <p className="manage-field-note">
              Rules run while this demo is open and apply to the selected
              purifier. Production schedules will run on the backend. Device
              safety protections always take priority.
            </p>
            <div className="manage-actions">
              <button className="button primary" type="submit">
                {editing ? "Save changes" : "Create routine"}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="grid-2">
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">YOUR ROUTINES</p>
              <h2>A home that responds</h2>
            </div>
            <span className="badge green">{rules.length} rules</span>
          </div>
          {rules.length === 0 ? (
            <div className="empty-state">
              <Wind size={34} />
              <h3>Make room for a routine</h3>
              <p>
                Create your first rule to let the demo respond automatically.
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="manage-rule">
                <div className="manage-rule-head">
                  <div className="manage-rule-main">
                    <span className="manage-icon">
                      {rule.action === "turbo" ? (
                        <Wind size={22} />
                      ) : rule.action === "sleep" ? (
                        <Moon size={22} />
                      ) : (
                        <Bell size={22} />
                      )}
                    </span>
                    <div>
                      <h3>{rule.name}</h3>
                      <p className="muted">{describe(rule)}</p>
                    </div>
                  </div>
                  <div className="manage-rule-actions">
                    <button
                      className="manage-icon-button"
                      aria-label={`Edit ${rule.name}`}
                      onClick={() => {
                        setDraft({ ...rule });
                        setEditing(rule.id);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="manage-icon-button"
                      aria-label={`Delete ${rule.name}`}
                      onClick={() => {
                        deleteRule(rule.id);
                        notify("Routine removed");
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <Toggle
                      label={`Enable ${rule.name}`}
                      checked={rule.enabled}
                      onChange={() =>
                        updateRule(rule.id, { enabled: !rule.enabled })
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">A LITTLE FORESIGHT</p>
              <h2>AI insights</h2>
            </div>
            <Sparkles size={23} />
          </div>
          <div className="manage-insight">
            <span className="badge green">Demo insight · illustrative</span>
            <h3>Let your evening slow down.</h3>
            <p>
              A sleep routine at your usual bedtime can help keep airflow
              gentle. Try a scheduled sleep-mode rule for your bedroom.
            </p>
          </div>
          <div className="manage-insight">
            <span className="badge green">Demo insight · illustrative</span>
            <h3>A thoughtful response to particles.</h3>
            <p>
              Consider an automatic fan-speed rule when PM2.5 rises. This
              demonstration uses configured thresholds, rather than a machine
              learning model.
            </p>
          </div>
          <p className="manage-caption">
            Prediction models, unusual pollution detection, and personalized
            recommendations are awaiting validated training data and backend
            integration. These examples are editorial demo suggestions.
          </p>
        </section>
      </div>
    </div>
  );
}
