import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Fan,
  Power,
  Leaf,
  Moon,
  Wind,
  SlidersHorizontal,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
  Droplets,
  LockKeyhole,
  Sun,
  Radio,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import type { Mode } from "../types";
import { Heading, SettingRow, Toggle } from "./ManagementUI";

const modes = [
  {
    value: "auto",
    icon: Wind,
    detail: "The purifier responds to simulated particle readings.",
  },
  {
    value: "manual",
    icon: SlidersHorizontal,
    detail: "Choose your own fan speed.",
  },
  {
    value: "sleep",
    icon: Moon,
    detail: "A quieter fan and a dimmed display for rest.",
  },
  { value: "turbo", icon: Fan, detail: "Maximum airflow for a focused clean." },
  {
    value: "eco",
    icon: Leaf,
    detail: "Gentle airflow with lower estimated energy use.",
  },
] as const;

export default function DeviceControl() {
  const { device, sendCommand, command } = useApp();
  const [fan, setFan] = useState<number | null>(null);
  const pending =
    command?.deviceId === device.id && command.status === "pending";
  const disabled = !device.online || pending;
  const locked = disabled || device.childLock;
  const mode = modes.find((item) => item.value === device.mode)!;
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="MAKE YOURSELF COMFORTABLE"
        title="Your air, your way."
        description={`Fine-tune ${device.name} in your ${device.room.toLowerCase()}.`}
        action={
          <span className={`badge ${device.online ? "green" : "amber"}`}>
            {device.online ? "Device online" : "Device offline"}
          </span>
        }
      />
      {command?.deviceId === device.id && (
        <div className={`manage-command ${command.status}`} role="status">
          {command.status === "pending" ? (
            <LoaderCircle size={20} className="spin" />
          ) : command.status === "confirmed" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <div>
            <strong>
              {command.status === "pending"
                ? "Command requested"
                : command.status === "confirmed"
                  ? "Confirmed by demo device"
                  : "Command rejected"}
            </strong>
            <p>
              {command.message} ·{" "}
              {new Date(command.requestedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
      {!device.online && (
        <div className="manage-note">
          <Radio size={19} />
          <p>
            This device is offline. Controls become available when its
            connection is restored. Last confirmed settings remain visible.
          </p>
        </div>
      )}
      <div className="grid-2">
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">PURIFICATION</p>
              <h2>Find your flow</h2>
            </div>
            <button
              className={`button ${device.power ? "primary" : "secondary"}`}
              disabled={locked}
              onClick={() => sendCommand({ power: !device.power })}
              aria-label={
                device.power ? "Turn purifier off" : "Turn purifier on"
              }
            >
              <Power size={17} />
              {device.power ? "Power on" : "Power off"}
            </button>
          </div>
          <div className="manage-modes" aria-label="Purification mode">
            {modes.map(({ value, icon: Icon }) => (
              <button
                key={value}
                className={`manage-mode ${device.mode === value ? "is-selected" : ""}`}
                aria-pressed={device.mode === value}
                disabled={locked}
                onClick={() =>
                  sendCommand({ mode: value as Mode, power: true })
                }
              >
                <Icon size={23} />
                <span>{value}</span>
              </button>
            ))}
          </div>
          <p
            className="muted"
            style={{ fontSize: 14, minHeight: 42, lineHeight: 1.7 }}
          >
            {mode.detail}
          </p>
          <div className="manage-fan-display">
            <div className={`manage-fan ${device.power ? "is-spinning" : ""}`}>
              <Fan strokeWidth={1.3} />
            </div>
            <h2>{device.power ? `${device.fanSpeed} / 5` : "Standing by"}</h2>
            <p className="muted">Confirmed fan speed</p>
          </div>
          <label className="manage-label" htmlFor="fan-speed">
            Fan speed
            {fan !== null && (
              <span className="muted">Requested: level {fan}</span>
            )}
          </label>
          <input
            id="fan-speed"
            className="manage-slider"
            type="range"
            min="1"
            max="5"
            step="1"
            value={fan ?? device.fanSpeed}
            disabled={locked || !device.power}
            onChange={(event) => setFan(Number(event.target.value))}
            onPointerUp={(event) => {
              sendCommand({
                fanSpeed: Number(event.currentTarget.value),
                mode: "manual",
              });
              setFan(null);
            }}
            onKeyUp={(event) => {
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(event.key)
              ) {
                sendCommand({
                  fanSpeed: Number(event.currentTarget.value),
                  mode: "manual",
                });
                setFan(null);
              }
            }}
          />
          <div className="manage-slider-labels">
            <span>Quiet · 1</span>
            <span>Balanced · 3</span>
            <span>Powerful · 5</span>
          </div>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">THE FINISHING TOUCHES</p>
              <h2>Comfort & protection</h2>
            </div>
            <SlidersHorizontal size={21} />
          </div>
          <SettingRow
            title="UV-C system"
            description={
              device.interlockClosed
                ? "Enclosure interlock closed. Simulated status only."
                : "Enclosure open. Hardware safety interlock prevents UV-C operation."
            }
          >
            <Toggle
              label="UV-C system"
              checked={device.uv}
              disabled={locked || !device.power || !device.interlockClosed}
              onChange={() => sendCommand({ uv: !device.uv })}
            />
          </SettingRow>
          <SettingRow
            title="Aroma diffusion"
            description="A gentle scent, whenever you choose."
          >
            <Toggle
              label="Aroma diffusion"
              checked={device.aroma}
              disabled={locked || !device.power}
              onChange={() => sendCommand({ aroma: !device.aroma })}
            />
          </SettingRow>
          <SettingRow
            title="Child lock"
            description="Locks device adjustments until you turn it off here."
          >
            <Toggle
              label="Child lock"
              checked={device.childLock}
              disabled={disabled}
              onChange={() => sendCommand({ childLock: !device.childLock })}
            />
          </SettingRow>
          <div style={{ padding: "20px 0" }}>
            <div
              className="manage-inline"
              style={{ justifyContent: "space-between", marginBottom: 17 }}
            >
              <label className="manage-label" htmlFor="brightness">
                Display brightness
              </label>
              <span className="muted" style={{ fontSize: 13 }}>
                {device.brightness}%
              </span>
            </div>
            <div className="manage-inline">
              <Sun size={16} />
              <input
                id="brightness"
                type="range"
                min="0"
                max="100"
                step="10"
                className="manage-slider"
                defaultValue={device.brightness}
                key={`${device.id}-${device.brightness}`}
                disabled={locked}
                onPointerUp={(event) =>
                  sendCommand({ brightness: Number(event.currentTarget.value) })
                }
                onKeyUp={(event) => {
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ].includes(event.key)
                  )
                    sendCommand({
                      brightness: Number(event.currentTarget.value),
                    });
                }}
              />
              <Sun size={22} />
            </div>
          </div>
          <div className="manage-note">
            <ShieldCheck size={20} />
            <p>
              UV-C requires a sealed enclosure and physical safety interlocks.
              Software cannot bypass those protections. Hardware validation is
              required before real operation.
            </p>
          </div>
        </section>
      </div>
      <section className="card manage-pad">
        <div className="manage-setting-row">
          <div className="manage-inline">
            <span className="manage-icon">
              <Clock3 size={22} />
            </span>
            <div>
              <strong>A little routine. A lot of fresh air.</strong>
              <p className="muted">
                Create a sleep schedule or let air quality trigger purification.
              </p>
            </div>
          </div>
          <Link className="button secondary" to="/automation">
            Manage schedules
          </Link>
        </div>
        <div className="manage-meta">
          <span className="manage-inline">
            <ShieldCheck size={16} /> Interlock{" "}
            {device.interlockClosed ? "closed" : "open"}
          </span>
          <span className="manage-inline">
            <Droplets size={16} /> Aroma {device.aroma ? "enabled" : "off"}
          </span>
          <span className="manage-inline">
            <LockKeyhole size={16} /> Child lock{" "}
            {device.childLock ? "enabled" : "off"}
          </span>
        </div>
      </section>
    </div>
  );
}
