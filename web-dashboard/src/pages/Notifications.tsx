import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellRing,
  CheckCheck,
  Check,
  Trash2,
  AlertTriangle,
  WifiOff,
  Wrench,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Heading } from "./ManagementUI";
import { localDate } from "./managementUtils";

export default function Notifications() {
  const { notifications, markRead, deleteNotification, notify } = useApp();
  const [filter, setFilter] = useState("all");
  const unread = notifications.filter((item) => !item.read).length;
  const shown = notifications.filter(
    (item) =>
      filter === "all" ||
      (filter === "unread"
        ? !item.read
        : ["warning", "critical"].includes(item.severity)),
  );
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="IN THE KNOW"
        title="A little peace of mind."
        description="The useful updates, right when you need them."
        action={
          <div className="manage-actions">
            <Link className="button secondary" to="/settings">
              Preferences
            </Link>
            <button
              className="button primary"
              onClick={() => {
                markRead();
                notify("All notifications marked as read");
              }}
              disabled={unread === 0}
            >
              <CheckCheck size={17} />
              Mark all read
            </button>
          </div>
        }
      />
      <section className="card manage-pad">
        <div className="card-header">
          <div className="manage-tabs" aria-label="Filter notifications">
            {[
              { id: "all", label: "All updates" },
              { id: "unread", label: `Unread (${unread})` },
              { id: "attention", label: "Needs attention" },
            ].map((item) => (
              <button
                key={item.id}
                className={filter === item.id ? "is-active" : ""}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Bell size={21} />
        </div>
        {shown.length === 0 ? (
          <div className="empty-state">
            <CheckCheck size={34} />
            <h3>You’re all caught up.</h3>
            <p>
              No{" "}
              {filter === "unread"
                ? "unread updates"
                : filter === "attention"
                  ? "alerts requiring attention"
                  : "notifications"}{" "}
              to show.
            </p>
          </div>
        ) : (
          shown.map((item) => {
            const Icon =
              item.category === "connection"
                ? WifiOff
                : item.category === "maintenance" || item.category === "filter"
                  ? Wrench
                  : item.category === "automation"
                    ? Sparkles
                    : item.severity === "warning" ||
                        item.severity === "critical"
                      ? AlertTriangle
                      : item.severity === "success"
                        ? ShieldCheck
                        : BellRing;
            return (
              <article
                key={item.id}
                className={`manage-notification ${!item.read ? "is-unread" : ""}`}
              >
                <span
                  className={`manage-icon ${item.severity === "warning" || item.severity === "critical" ? "is-warning" : ""}`}
                >
                  <Icon size={21} />
                </span>
                <div className="manage-notification-content">
                  <h3 className="manage-notification-title">{item.title}</h3>
                  <p className="muted">{item.message}</p>
                  <div className="manage-notification-meta">
                    <span
                      className={`badge ${item.severity === "warning" || item.severity === "critical" ? "amber" : "green"}`}
                    >
                      {item.severity}
                    </span>
                    <time dateTime={item.timestamp}>
                      {localDate(item.timestamp)}
                    </time>
                    <span>{item.read ? "Read" : "Unread"}</span>
                  </div>
                </div>
                <div className="manage-notification-actions">
                  {!item.read && (
                    <button
                      className="manage-icon-button"
                      aria-label={`Mark ${item.title} as read`}
                      onClick={() => markRead(item.id)}
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    className="manage-icon-button"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => {
                      deleteNotification(item.id);
                      notify("Notification removed");
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
      <div className="manage-note">
        <ShieldCheck size={19} />
        <p>
          These are simulated product notifications. This research prototype is
          not a certified gas alarm, fire alarm, or medical safety device.
          Browser notifications do not replace dedicated safety equipment.
        </p>
      </div>
    </div>
  );
}
