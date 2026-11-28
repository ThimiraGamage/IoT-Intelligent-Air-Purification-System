import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bluetooth,
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
import type { User } from "firebase/auth";
import { useApp } from "../hooks/useApp";
import {
  discoverAerisOverBluetooth,
  isWebBluetoothSupported,
  provisionWifiOverBluetooth,
  type BleDeviceHandle,
} from "../services/ble";
import {
  registerUserDeviceInRtdb,
  subscribeAuthState,
} from "../services/firebase";
import { Heading } from "./ManagementUI";

export default function Devices() {
  const navigate = useNavigate();
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
  const [bleDevice, setBleDevice] = useState<BleDeviceHandle | null>(null);
  const [bleStatus, setBleStatus] = useState("");
  const [bleBusy, setBleBusy] = useState(false);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiProvisioned, setWifiProvisioned] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => subscribeAuthState(setCurrentUser), []);

  async function scanBluetooth() {
    setError("");
    setBleBusy(true);
    setBleStatus("Scanning for nearby Aeris purifiers via Bluetooth...");
    try {
      const found = await discoverAerisOverBluetooth();
      setBleDevice(found.device);
      setCode(found.serialNumber);
      setWifiProvisioned(false);
      setBleStatus(`Found ${found.bleName} (${found.serialNumber}). Enter Wi-Fi below.`);
      notify(`Discovered ${found.serialNumber}`);
    } catch (err) {
      setBleStatus("");
      setError(
        err instanceof Error ? err.message : "Bluetooth discovery failed.",
      );
    } finally {
      setBleBusy(false);
    }
  }

  async function sendWifiViaBluetooth() {
    if (!bleDevice) return;
    if (!wifiSsid.trim()) {
      setError("Enter your 2.4 GHz Wi-Fi SSID.");
      return;
    }
    setError("");
    setBleBusy(true);
    setBleStatus("Sending Wi-Fi credentials to ESP32 over Bluetooth...");
    try {
      const res = await provisionWifiOverBluetooth(
        bleDevice,
        wifiSsid,
        wifiPass,
        (status) => setBleStatus(`ESP32 status: ${status}`),
      );
      setWifiProvisioned(true);
      setWifiPass("");
      if (res.serialNumber) setCode(res.serialNumber);
      setBleStatus(
        `Wi-Fi connected${res.ip ? ` (${res.ip})` : ""}! Click Pair device below to register.`,
      );
      notify("ESP32 connected to Wi-Fi");
    } catch (err) {
      setBleStatus("");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to provision Wi-Fi over Bluetooth.",
      );
    } finally {
      setBleBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !room.trim()) {
      setError("Give your purifier a name and a room.");
      return;
    }
    const trimmedCode = code.trim();
    const isEspSerial = /^AERIS-[A-F0-9]{8,12}$/i.test(trimmedCode);
    if (!editing && !isEspSerial) {
      setError(
        "Scan via Bluetooth or enter a valid ESP32 S/N (e.g. AERIS-3C61051AB2C4).",
      );
      return;
    }
    if (editing)
      updateDevice(editing, { name: name.trim(), room: room.trim() });
    else {
      addDevice(name.trim(), room.trim(), trimmedCode);
      if (currentUser) {
        try {
          await registerUserDeviceInRtdb(currentUser.uid, {
            id: trimmedCode.toUpperCase(),
            name: name.trim(),
            room: room.trim(),
            serialNumber: trimmedCode.toUpperCase(),
          });
        } catch {
          /* Local pairing still succeeds if RTDB rules restrict user writes */
        }
      }
    }
    setAdding(false);
    setEditing(null);
    setBleDevice(null);
    setBleStatus("");
    setWifiProvisioned(false);
    setError("");
    notify(editing ? "Device details saved" : "ESP32 purifier paired");
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
                {editing ? "MAKE IT YOURS" : "ADD PURIFIER"}
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
                <div
                  className="card"
                  style={{
                    padding: "1rem",
                    marginBottom: "0.75rem",
                    borderStyle: "dashed",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>1. Auto-discover via Bluetooth</strong>
                      <p className="manage-field-note" style={{ margin: 0 }}>
                        {isWebBluetoothSupported()
                          ? "Scan for nearby Aeris ESP32 devices and configure Wi-Fi automatically."
                          : "Web Bluetooth requires Chrome/Edge over HTTPS or localhost. You can still enter S/N manually below."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={bleBusy || !isWebBluetoothSupported()}
                      onClick={scanBluetooth}
                    >
                      <Bluetooth size={16} />
                      {bleBusy ? "Working..." : "Scan via Bluetooth"}
                    </button>
                  </div>

                  {bleStatus && (
                    <p
                      className="manage-field-note"
                      style={{ marginTop: "0.6rem", fontWeight: 600 }}
                    >
                      {bleStatus}
                    </p>
                  )}

                  {bleDevice && !wifiProvisioned && (
                    <div
                      className="manage-form-grid"
                      style={{ marginTop: "0.75rem" }}
                    >
                      <label>
                        2.4 GHz Wi-Fi SSID
                        <input
                          placeholder="Your Wi-Fi network name"
                          value={wifiSsid}
                          onChange={(event) => setWifiSsid(event.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <label>
                        Wi-Fi Password
                        <input
                          type="password"
                          placeholder="Wi-Fi password"
                          value={wifiPass}
                          onChange={(event) => setWifiPass(event.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          className="button primary"
                          disabled={bleBusy}
                          onClick={sendWifiViaBluetooth}
                        >
                          <Wifi size={16} />
                          Send Wi-Fi to Device
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label>
                  Device Serial Number (S/N)
                  <input
                    required
                    placeholder="AERIS-XXXXXXXXXXXX"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <p className="manage-field-note">
                  Auto-filled after Bluetooth discovery, or enter your ESP32
                  S/N manually (e.g. <code>AERIS-3C61051AB2C4</code>).
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
                {editing ? "Save device" : "Register device"}
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
      {devices.length === 0 && !adding && (
        <section className="card manage-pad" style={{ textAlign: "center" }}>
          <Cpu size={32} style={{ marginBottom: "0.5rem" }} />
          <h2>No purifiers connected to your account yet</h2>
          <p className="muted" style={{ maxWidth: 460, margin: "0.5rem auto 1rem" }}>
            Connect your Aeris purifier using automatic Bluetooth discovery or
            enter its Serial Number (S/N) manually to unlock live readings and
            controls.
          </p>
          <button
            className="button primary"
            onClick={() => {
              setAdding(true);
              setEditing(null);
              setName("Aeris One");
              setRoom("Living room");
              setCode("");
              setError("");
            }}
          >
            <Plus size={17} />
            Connect a purifier
          </button>
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
              className={`button ${device.id === item.id ? "primary" : "secondary"}`}
              onClick={() => {
                selectDevice(item.id);
                notify(`${item.name} selected`);
                navigate("/");
              }}
            >
              {device.id === item.id ? (
                <>
                  <CheckCircle2 size={16} />
                  Open dashboard
                </>
              ) : (
                "Select & open"
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
          Devices shown here are registered to your Firebase account and stream
          live readings from Firebase Realtime Database.
        </p>
      </section>
    </div>
  );
}
