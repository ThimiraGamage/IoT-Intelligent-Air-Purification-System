export type SensorKey =
  "pm1" | "pm25" | "pm10" | "co2" | "tvoc" | "temperature" | "humidity";
export type Mode = "auto" | "manual" | "sleep" | "turbo" | "eco";
export interface SensorReading {
  key: SensorKey;
  label: string;
  value: number;
  unit: string;
  status: string;
  trend: number;
  available: boolean;
  updatedAt: string;
  history: number[];
}
export interface HistoryPoint {
  timestamp: string;
  pm1: number;
  pm25: number;
  pm10: number;
  co2: number;
  tvoc: number;
  temperature: number;
  humidity: number;
  aqi: number;
  power: number;
}
export interface Device {
  id: string;
  name: string;
  room: string;
  online: boolean;
  power: boolean;
  mode: Mode;
  fanSpeed: number;
  filterLife: number;
  firmware: string;
  operatingHours: number;
  uv: boolean;
  aroma: boolean;
  childLock: boolean;
  brightness: number;
  interlockClosed: boolean;
}
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  timestamp: string;
  read: boolean;
  category: string;
}
export interface AutomationRule {
  id: string;
  name: string;
  sensor: "pm25" | "aqi" | "time" | "filter";
  threshold: number;
  time: string;
  action: "turbo" | "sleep" | "notify";
  enabled: boolean;
}
export interface Settings {
  name: string;
  email: string;
  theme: "light" | "dark" | "system";
  language: "en" | "si";
  tariff: number;
  currency: string;
  notifications: boolean;
  emailNotifications: boolean;
  analyticsConsent: boolean;
}
export interface DeviceCommand {
  id: string;
  deviceId: string;
  status: "pending" | "confirmed" | "rejected";
  message: string;
  requestedAt: string;
}
export interface AppState {
  devices: Device[];
  selectedDeviceId: string;
  readings: SensorReading[];
  history: HistoryPoint[];
  notifications: AppNotification[];
  rules: AutomationRule[];
  settings: Settings;
  command: DeviceCommand | null;
  connection: "connected" | "reconnecting" | "offline";
  telemetrySource: "demo" | "live";
  lastUpdated: string;
  toast: string | null;
}
export interface AppActions {
  selectDevice: (id: string) => void;
  sendCommand: (patch: Partial<Device>) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  addDevice: (name: string, room: string, serialNumber?: string) => void;
  markRead: (id?: string) => void;
  deleteNotification: (id: string) => void;
  addRule: (rule: Omit<AutomationRule, "id">) => void;
  updateRule: (id: string, patch: Partial<AutomationRule>) => void;
  deleteRule: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetFilter: () => void;
  simulateConnection: () => void;
  notify: (message: string) => void;
  clearToast: () => void;
}
export interface AppContextValue extends AppState, AppActions {
  device: Device;
  aqi: number;
}
