import { useState, type FormEvent } from "react";
import {
  Plus,
  Wifi,
  WifiOff,
  Radio,
  CheckCircle2,
  Pencil,
  X,
  House,
  Cpu,
  Clock3,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Heading } from "./ManagementUI";

export default function Devices() {
  const {
    devices,
    device,
    selectDevice,
    addDevice,
    updateDevice,
    simulateConnection,
    connection,
    notify,
  } = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("Aeris One");
  const [room, setRoom] = useState("Bedroom");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !room.trim()) {
      setError("Give your purifier a name and a room.");
      return;
    }
    if (!editing && !/^DEMO-\d{4}$/i.test(code.trim())) {
      setError(
        "For demo pairing, enter DEMO-1234. No physical device will connect.",
      );
      return;
    }
    if (editing)
      updateDevice(editing, { name: name.trim(), room: room.trim() });
    else addDevice(name.trim(), room.trim());
    setAdding(false);
    setEditing(null);
    setError("");
    notify(editing ? "Device details saved" : "Demo purifier paired");
  }
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="A LITTLE FRESH AIR, EVERYWHERE"
        title="Meet your devices."
        description="One calm place for every purifier in your home."
        action={
          <button
            className="button primary"
            onClick={() => {
              setAdding(!adding);
              setEditing(null);
              setName("Aeris One");
              setRoom("Bedroom");
              setCode("");
              setError("");
            }}
          >
            <Plus size={17} />
            Add device
          </button>
        }
      />
      {(adding || editing) && (
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">
                {editing ? "MAKE IT YOURS" : "DEMONSTRATION PAIRING"}
              </p>
              <h2>{editing ? "Device details" : "Welcome another Aeris"}</h2>
            </div>
            <button
              className="manage-icon-button"
              aria-label="Close device form"
              onClick={() => {
                setAdding(false);
                setEditing(null);
              }}
            >
              <X size={19} />
            </button>
          </div>
          <form className="manage-form" onSubmit={submit}>
            <div className="manage-form-grid">
              <label>
                Device name
                <input
                  required
                  maxLength={40}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Room
                <input
                  required
                  maxLength={40}
                  value={room}
                  onChange={(event) => setRoom(event.target.value)}
                  list="room-options"
                />
                <datalist id="room-options">
                  <option>Living room</option>
                  <option>Bedroom</option>
                  <option>Home office</option>
                  <option>Nursery</option>
                  <option>Study</option>
                </datalist>
              </label>
            </div>
            {!editing && (
              <>
                <label>
                  Demo pairing code
                  <input
                    required
                    placeholder="DEMO-1234"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <p className="manage-field-note">
                  Use DEMO-1234 to add a simulated purifier. Physical pairing
                  will require a secure, authenticated provisioning flow. Never
                  enter a Wi-Fi password here.
                </p>
              </>
            )}
            {error && (
              <p className="manage-error" role="alert">
                {error}
              </p>
            )}
            <div className="manage-actions">
              <button className="button primary" type="submit">
                {editing ? "Save device" : "Pair demo device"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="grid-2">
        {devices.map((item) => (
          <section
            className={`card manage-device ${device.id === item.id ? "is-selected" : ""}`}
            key={item.id}
          >
            <div className="manage-device-title">
              <span className={`badge ${item.online ? "green" : "amber"}`}>
                {item.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                {item.online ? "Online" : "Offline"}
              </span>
              <button
                className="manage-icon-button"
                aria-label={`Edit ${item.name}`}
                onClick={() => {
                  setEditing(item.id);
                  setAdding(false);
                  setName(item.name);
                  setRoom(item.room);
                  setError("");
                }}
              >
                <Pencil size={17} />
              </button>
            </div>
            <div className="manage-inline">
              <span className="manage-icon">
                <House size={25} />
              </span>
              <div>
                <h2>{item.name}</h2>
                <p className="muted">{item.room}</p>
              </div>
            </div>
            <div className="manage-meta">
              <span>
                <Cpu size={16} /> Firmware<strong>{item.firmware}</strong>
              </span>
              <span>
                <Clock3 size={16} /> Runtime
                <strong>
                  {Math.floor(item.operatingHours).toLocaleString()} hours
                </strong>
              </span>
              <span>
                Filter estimate<strong>{item.filterLife}% remaining</strong>
              </span>
            </div>
            <div className="manage-meta">
              <span>
                Device ID<strong className="manage-device-id">{item.id}</strong>
              </span>
              <span>
                Mode
                <strong style={{ textTransform: "capitalize" }}>
                  {item.mode}
                </strong>
              </span>
            </div>
            <button
              className={`button ${device.id === item.id ? "secondary" : "primary"}`}
              onClick={() => {
                selectDevice(item.id);
                notify(`${item.name} selected`);
              }}
            >
              {device.id === item.id ? (
                <>
                  <CheckCircle2 size={16} />
                  Selected purifier
                </>
              ) : (
                "Select purifier"
              )}
            </button>
          </section>
        ))}
      </div>
      <section className="card manage-pad">
        <div className="manage-setting-row">
          <div className="manage-inline">
            <span className="manage-icon">
              <Radio size={23} />
            </span>
            <div>
              <strong>Try a connection interruption</strong>
              <p className="muted">
                See offline states, stale readings, and automatic connection
                recovery.
              </p>
            </div>
          </div>
          <button
            className="button secondary"
            disabled={connection === "reconnecting"}
            onClick={simulateConnection}
          >
            {connection === "reconnecting"
              ? "Reconnecting…"
              : "Simulate disconnection"}
          </button>
        </div>
        <p className="manage-caption">
          All listed devices are local demo profiles. A production device
          registry, secure provisioning, and signed firmware updates await
          backend integration.
        </p>
      </section>
    </div>
  );
}
