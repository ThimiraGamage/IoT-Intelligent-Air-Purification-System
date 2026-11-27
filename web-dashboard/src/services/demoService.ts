import type {
  AppActions,
  AppNotification,
  AppState,
  AutomationRule,
  Device,
  DeviceCommand,
  HistoryPoint,
  Settings,
} from "../types";
import {
  createHistory,
  initialDevices,
  initialNotifications,
  initialRules,
  initialSettings,
  makeLivePoint,
  readingsFromHistory,
} from "../mock/data";
import {
  confirmedDeviceState,
  shouldRunRule,
  validateCommand,
} from "./automation";
import {
  browserStorage,
  loadSavedState,
  saveState,
  type StorageLike,
} from "./storage";
import type { AirService } from "./api";

const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const VALID_MODES = ["auto", "manual", "sleep", "turbo", "eco"];
const validDevice = (device: Device) =>
  typeof device?.id === "string" &&
  typeof device.name === "string" &&
  typeof device.room === "string" &&
  typeof device.online === "boolean" &&
  typeof device.power === "boolean" &&
  VALID_MODES.includes(device.mode) &&
  Number.isFinite(device.fanSpeed) &&
  Number.isFinite(device.filterLife) &&
  Number.isFinite(device.operatingHours);
const validRule = (rule: AutomationRule) =>
  typeof rule?.id === "string" &&
  typeof rule.name === "string" &&
  ["pm25", "aqi", "time", "filter"].includes(rule.sensor) &&
  ["turbo", "sleep", "notify"].includes(rule.action) &&
  Number.isFinite(rule.threshold) &&
  typeof rule.enabled === "boolean" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time);
const validNotification = (item: AppNotification) =>
  typeof item?.id === "string" &&
  typeof item.title === "string" &&
  typeof item.message === "string" &&
  typeof item.category === "string" &&
  typeof item.read === "boolean" &&
  Number.isFinite(Date.parse(item.timestamp)) &&
  ["info", "warning", "critical", "success"].includes(item.severity);

/** Browser-local simulator. A pending command is acknowledged only by this mock,
 * never by physical hardware. UI state cannot override a hardware interlock. */
export class DemoAirService implements AirService, AppActions {
  private state: AppState;
  private histories = new Map<string, HistoryPoint[]>();
  private listeners = new Set<() => void>();
  private interval?: ReturnType<typeof setInterval>;
  private commandTimers = new Set<ReturnType<typeof setTimeout>>();
  private deviceCommands = new Map<string, DeviceCommand>();
  private recoveringDevices = new Set<string>();
  private toastTimer?: ReturnType<typeof setTimeout>;
  private cooldown = new Map<string, number>();
  private ticks = 0;
  private deletedIds: string[] = [];
  private readonly storage: StorageLike | undefined;

  constructor(storage: StorageLike | undefined = browserStorage()) {
    this.storage = storage;
    const saved = loadSavedState(storage);
    const devices =
      Array.isArray(saved?.devices) &&
      saved.devices.length &&
      saved.devices.every(validDevice)
        ? saved.devices.map((device) => ({
            ...initialDevices[0],
            ...device,
            uv: device.interlockClosed && device.power ? device.uv : false,
          }))
        : initialDevices.map((device) => ({ ...device }));
    const settings = { ...initialSettings };
    const incoming = saved?.settings;
    if (incoming && typeof incoming === "object") {
      if (typeof incoming.name === "string")
        settings.name = incoming.name.slice(0, 80);
      if (typeof incoming.email === "string")
        settings.email = incoming.email.slice(0, 200);
      if (["light", "dark", "system"].includes(incoming.theme))
        settings.theme = incoming.theme;
      if (["en", "si"].includes(incoming.language))
        settings.language = incoming.language;
      if (Number.isFinite(incoming.tariff) && incoming.tariff >= 0)
        settings.tariff = incoming.tariff;
      if (
        typeof incoming.currency === "string" &&
        incoming.currency.length <= 8
      )
        settings.currency = incoming.currency;
      for (const key of [
        "notifications",
        "emailNotifications",
        "analyticsConsent",
      ] as const)
        if (typeof incoming[key] === "boolean") settings[key] = incoming[key];
    }
    const selectedDeviceId = devices.some(
      (device) => device.id === saved?.selectedDeviceId,
    )
      ? saved!.selectedDeviceId!
      : devices[0].id;
    for (const device of devices)
      this.histories.set(device.id, createHistory(device.id));
    const selected = devices.find((device) => device.id === selectedDeviceId)!;
    const history = this.histories.get(selectedDeviceId)!;
    this.deletedIds = Array.isArray(saved?.deletedNotificationIds)
      ? saved.deletedNotificationIds.filter(
          (value) => typeof value === "string",
        )
      : [];
    const readIds = Array.isArray(saved?.readNotificationIds)
      ? saved.readNotificationIds
      : [];
    const notifications =
      Array.isArray(saved?.notifications) &&
      saved.notifications.every(validNotification)
        ? saved.notifications.slice(0, 100)
        : initialNotifications();
    this.state = {
      devices,
      selectedDeviceId,
      settings,
      rules:
        Array.isArray(saved?.rules) && saved.rules.every(validRule)
          ? saved.rules
          : initialRules.map((rule) => ({ ...rule })),
      notifications: notifications
        .filter((item) => !this.deletedIds.includes(item.id))
        .map((item) => ({
          ...item,
          read: item.read || readIds.includes(item.id),
        })),
      readings: readingsFromHistory(history, selected.online),
      history,
      command: null,
      connection: selected.online ? "connected" : "offline",
      lastUpdated: history[history.length - 1].timestamp,
      toast: null,
    };
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.interval) this.interval = setInterval(this.tick, 5000);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size && this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }
    };
  };
  private persist() {
    const { devices, selectedDeviceId, settings, rules, notifications } =
      this.state;
    saveState(this.storage, {
      version: 1,
      devices,
      selectedDeviceId,
      settings,
      rules,
      notifications,
      readNotificationIds: notifications
        .filter((item) => item.read)
        .map((item) => item.id),
      deletedNotificationIds: this.deletedIds,
    });
  }
  private emit(patch: Partial<AppState>, persist = false) {
    this.state = { ...this.state, ...patch };
    if (persist) this.persist();
    this.listeners.forEach((listener) => listener());
  }
  private later(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.commandTimers.delete(timer);
      callback();
    }, delay);
    this.commandTimers.add(timer);
  }
  private selected() {
    return this.state.devices.find(
      (device) => device.id === this.state.selectedDeviceId,
    )!;
  }
  private addNotification(
    title: string,
    message: string,
    severity: AppNotification["severity"],
    category: string,
  ) {
    if (!this.state.settings.notifications) return;
    const notification: AppNotification = {
      id: id(),
      title,
      message,
      severity,
      category,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.emit(
      {
        notifications: [notification, ...this.state.notifications].slice(
          0,
          100,
        ),
      },
      true,
    );
  }

  /** Public for deterministic simulation tests; production interval calls every 5s. */
  tick = () => {
    this.ticks++;
    const now = Date.now();
    const devices = this.state.devices.map((device) => {
      if (!device.online || !device.power) return device;
      const next = {
        ...device,
        operatingHours: device.operatingHours + 5 / 3600,
      };
      if (next.mode === "auto") {
        const history = this.histories.get(device.id)!;
        const particles = history[history.length - 1].pm25;
        next.fanSpeed =
          particles <= 9 ? 1 : particles <= 25 ? 2 : particles <= 50 ? 3 : 5;
      }
      return next;
    });
    for (const device of devices) {
      if (
        !device.online ||
        (device.id === this.state.selectedDeviceId &&
          this.state.connection !== "connected")
      )
        continue;
      const history = this.histories.get(device.id)!;
      const next = [...history, makeLivePoint(device, this.ticks, now)];
      // Keep month history stable; compress live updates to five-minute buckets.
      if (next.length > 2200) {
        const cutoff = now - 3600000;
        const compact = next.filter(
          (point, index) =>
            Date.parse(point.timestamp) >= cutoff ||
            index === 0 ||
            Math.floor(Date.parse(point.timestamp) / 300000) !==
              Math.floor(Date.parse(next[index - 1].timestamp) / 300000),
        );
        this.histories.set(
          device.id,
          compact.filter(
            (point) => Date.parse(point.timestamp) >= now - 33 * 86400000,
          ),
        );
      } else this.histories.set(device.id, next);
    }
    const selected = devices.find(
      (device) => device.id === this.state.selectedDeviceId,
    )!;
    const history = this.histories.get(selected.id)!;
    const latest = history[history.length - 1];
    this.emit({
      devices,
      history,
      readings: readingsFromHistory(
        history,
        selected.online && this.state.connection === "connected",
      ),
      lastUpdated: latest.timestamp,
    });
    this.evaluateRules(selected, latest, now);
  };

  private evaluateRules(device: Device, latest: HistoryPoint, now: number) {
    for (const rule of this.state.rules) {
      const key = `${device.id}:${rule.id}`;
      const cooldown = rule.sensor === "time" ? 20 * 3600000 : 10 * 60000;
      if (
        now - (this.cooldown.get(key) ?? 0) < cooldown ||
        !shouldRunRule(rule, device, latest, new Date(now))
      )
        continue;
      if (
        rule.action !== "notify" &&
        this.deviceCommands.get(device.id)?.status === "pending"
      )
        continue;
      this.cooldown.set(key, now);
      this.addNotification(
        "Automation activated",
        `${rule.name}: ${rule.action === "notify" ? "your configured condition was detected" : `${rule.action} mode requested`} for ${device.name}. Demo rule execution.`,
        "info",
        "automation",
      );
      if (rule.action !== "notify")
        this.sendCommand({ mode: rule.action, power: true });
    }
  }

  selectDevice = (deviceId: string) => {
    const device = this.state.devices.find((item) => item.id === deviceId);
    if (!device) return;
    const history = this.histories.get(deviceId)!;
    this.emit(
      {
        selectedDeviceId: deviceId,
        history,
        readings: readingsFromHistory(history, device.online),
        lastUpdated: history[history.length - 1].timestamp,
        connection: device.online
          ? "connected"
          : this.recoveringDevices.has(deviceId)
            ? "reconnecting"
            : "offline",
        command: this.deviceCommands.get(deviceId) ?? null,
      },
      true,
    );
  };

  sendCommand = (patch: Partial<Device>) => {
    const device = this.selected();
    if (this.deviceCommands.get(device.id)?.status === "pending") {
      this.notify(
        "This device already has a command awaiting a simulated acknowledgement.",
      );
      return;
    }
    const requestId = id();
    const command = {
      id: requestId,
      deviceId: device.id,
      requestedAt: new Date().toISOString(),
      status: "pending" as const,
      message: "Command requested. Waiting for the simulated device…",
    };
    const rejection =
      this.state.connection !== "connected"
        ? "Device is offline. Reconnect before sending a command."
        : validateCommand(device, patch);
    if (rejection) {
      const rejected: DeviceCommand = {
        ...command,
        status: "rejected",
        message: rejection,
      };
      this.deviceCommands.set(device.id, rejected);
      this.emit({ command: rejected });
      this.notify(rejection);
      return;
    }
    this.deviceCommands.set(device.id, command);
    this.emit({ command });
    this.later(() => {
      const latestDevice = this.state.devices.find(
        (item) => item.id === device.id,
      );
      if (!latestDevice || this.deviceCommands.get(device.id)?.id !== requestId)
        return;
      const reason = validateCommand(latestDevice, patch);
      if (reason) {
        const rejected: DeviceCommand = {
          ...command,
          status: "rejected",
          message: reason,
        };
        this.deviceCommands.set(device.id, rejected);
        if (this.state.selectedDeviceId === device.id)
          this.emit({ command: rejected });
        this.notify(reason);
        return;
      }
      const confirmed = confirmedDeviceState(latestDevice, patch);
      const acknowledgement: DeviceCommand = {
        ...command,
        status: "confirmed",
        message:
          "Confirmed by the simulated device. No physical hardware is connected.",
      };
      this.deviceCommands.set(device.id, acknowledgement);
      this.emit(
        {
          devices: this.state.devices.map((item) =>
            item.id === confirmed.id ? confirmed : item,
          ),
          ...(this.state.selectedDeviceId === device.id
            ? { command: acknowledgement }
            : {}),
        },
        true,
      );
      this.notify("Simulated device confirmed your settings.");
    }, 850);
  };

  updateDevice = (deviceId: string, patch: Partial<Device>) => {
    const safe: Partial<Device> = {};
    if (typeof patch.name === "string" && patch.name.trim())
      safe.name = patch.name.trim().slice(0, 60);
    if (typeof patch.room === "string" && patch.room.trim())
      safe.room = patch.room.trim().slice(0, 60);
    if (typeof patch.online === "boolean") safe.online = patch.online;
    if (typeof patch.interlockClosed === "boolean") {
      safe.interlockClosed = patch.interlockClosed;
      if (!patch.interlockClosed) safe.uv = false;
    }
    const devices = this.state.devices.map((device) =>
      device.id === deviceId ? { ...device, ...safe } : device,
    );
    const selected = devices.find(
      (device) => device.id === this.state.selectedDeviceId,
    )!;
    this.emit(
      {
        devices,
        connection: selected.online
          ? "connected"
          : this.recoveringDevices.has(selected.id)
            ? "reconnecting"
            : "offline",
        readings: readingsFromHistory(this.state.history, selected.online),
      },
      true,
    );
    this.notify("Device details updated locally.");
  };

  addDevice = (name: string, room: string) => {
    if (!name.trim() || !room.trim()) {
      this.notify("Enter a device name and room.");
      return;
    }
    if (this.state.devices.length >= 12) {
      this.notify("The demo supports up to 12 devices.");
      return;
    }
    const device: Device = {
      ...initialDevices[0],
      id: id(),
      name: name.trim().slice(0, 60),
      room: room.trim().slice(0, 60),
      operatingHours: 0,
      filterLife: 100,
    };
    this.histories.set(device.id, createHistory(device.id));
    this.emit({ devices: [...this.state.devices, device] }, true);
    this.selectDevice(device.id);
    this.notify(
      "Demo pairing complete. No Wi-Fi credentials were requested or stored.",
    );
  };
  markRead = (notificationId?: string) =>
    this.emit(
      {
        notifications: this.state.notifications.map((item) =>
          !notificationId || item.id === notificationId
            ? { ...item, read: true }
            : item,
        ),
      },
      true,
    );
  deleteNotification = (notificationId: string) => {
    this.deletedIds.push(notificationId);
    this.emit(
      {
        notifications: this.state.notifications.filter(
          (item) => item.id !== notificationId,
        ),
      },
      true,
    );
  };
  addRule = (rule: Omit<AutomationRule, "id">) => {
    const next = { ...rule, id: id(), name: rule.name.trim().slice(0, 80) };
    if (!next.name || !validRule(next) || next.threshold < 0) {
      this.notify("Check the rule name, threshold, and time.");
      return;
    }
    this.emit({ rules: [...this.state.rules, next] }, true);
    this.notify("Automation rule created for the selected demo purifier.");
  };
  updateRule = (ruleId: string, patch: Partial<AutomationRule>) => {
    const rules = this.state.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...patch, id: ruleId } : rule,
    );
    if (!rules.every(validRule)) {
      this.notify("The automation rule contains invalid values.");
      return;
    }
    this.emit({ rules }, true);
  };
  deleteRule = (ruleId: string) => {
    this.emit(
      { rules: this.state.rules.filter((rule) => rule.id !== ruleId) },
      true,
    );
    this.notify("Automation rule deleted.");
  };
  updateSettings = (patch: Partial<Settings>) => {
    const next = { ...this.state.settings, ...patch };
    if (!Number.isFinite(next.tariff) || next.tariff < 0) {
      this.notify("Enter a valid non-negative electricity tariff.");
      return;
    }
    if (
      !["light", "dark", "system"].includes(next.theme) ||
      !["en", "si"].includes(next.language)
    )
      return;
    this.emit({ settings: next }, true);
  };
  resetFilter = () => {
    this.emit(
      {
        devices: this.state.devices.map((device) =>
          device.id === this.state.selectedDeviceId
            ? { ...device, filterLife: 100 }
            : device,
        ),
      },
      true,
    );
    this.addNotification(
      "Filter replacement recorded",
      "Your selected purifier filter estimate was reset to 100%. Replacement recorded in this browser only.",
      "success",
      "maintenance",
    );
    this.notify("Filter replacement recorded. Estimated life reset to 100%.");
  };
  simulateConnection = () => {
    const deviceId = this.state.selectedDeviceId;
    if (this.recoveringDevices.has(deviceId)) return;
    this.recoveringDevices.add(deviceId);
    const original = this.selected();
    this.emit({
      connection: "offline",
      devices: this.state.devices.map((device) =>
        device.id === deviceId
          ? { ...device, online: false, uv: false }
          : device,
      ),
      readings: readingsFromHistory(this.state.history, false),
    });
    this.addNotification(
      "Demo device disconnected",
      `${original.name} temporarily stopped sending telemetry. Last readings remain visible and are marked unavailable.`,
      "warning",
      "connection",
    );
    this.later(() => {
      if (this.state.selectedDeviceId === deviceId)
        this.emit({ connection: "reconnecting" });
    }, 1800);
    this.later(() => {
      this.recoveringDevices.delete(deviceId);
      this.emit({
        devices: this.state.devices.map((device) =>
          device.id === deviceId ? { ...device, online: true } : device,
        ),
        ...(this.state.selectedDeviceId === deviceId
          ? { connection: "connected" as const }
          : {}),
      });
      this.tick();
      this.addNotification(
        "Connection restored",
        `${original.name} is back online. Simulated readings have resumed.`,
        "success",
        "connection",
      );
      this.notify("Connection recovered. Demo readings are updating again.");
    }, 4200);
  };
  notify = (message: string) => {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.emit({ toast: message });
    this.toastTimer = setTimeout(this.clearToast, 5000);
  };
  clearToast = () => this.emit({ toast: null });
  dispose = () => {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.commandTimers.forEach((timer) => clearTimeout(timer));
    this.commandTimers.clear();
    this.listeners.clear();
  };
}
