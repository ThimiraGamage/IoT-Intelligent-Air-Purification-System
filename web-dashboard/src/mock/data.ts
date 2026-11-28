import type {
  AppNotification,
  AutomationRule,
  Device,
  HistoryPoint,
  SensorKey,
  SensorReading,
  Settings,
} from "../types";
import { calculateAqi } from "../utils/aqi";

export const initialDevices: Device[] = [
  {
    id: "aeris-living",
    name: "Aeris One",
    room: "Living room",
    online: true,
    power: true,
    mode: "auto",
    fanSpeed: 2,
    filterLife: 84,
    firmware: "0.9.4-demo",
    operatingHours: 384,
    uv: false,
    aroma: false,
    childLock: false,
    brightness: 70,
    interlockClosed: true,
  },
  {
    id: "aeris-bedroom",
    name: "Aeris Mini",
    room: "Bedroom",
    online: true,
    power: true,
    mode: "sleep",
    fanSpeed: 1,
    filterLife: 92,
    firmware: "0.9.4-demo",
    operatingHours: 146,
    uv: false,
    aroma: false,
    childLock: false,
    brightness: 20,
    interlockClosed: true,
  },
];
export const initialSettings: Settings = {
  name: "Alex",
  email: "alex@example.com",
  theme: "light",
  language: "en",
  tariff: 42,
  currency: "LKR",
  notifications: true,
  emailNotifications: false,
  analyticsConsent: false,
};
export const initialRules: AutomationRule[] = [
  {
    id: "rule-clean",
    name: "Keep the air fresh",
    sensor: "pm25",
    threshold: 25,
    time: "22:00",
    action: "turbo",
    enabled: true,
  },
  {
    id: "rule-sleep",
    name: "Wind down for the night",
    sensor: "time",
    threshold: 0,
    time: "22:00",
    action: "sleep",
    enabled: true,
  },
  {
    id: "rule-filter",
    name: "A little care goes a long way",
    sensor: "filter",
    threshold: 20,
    time: "09:00",
    action: "notify",
    enabled: true,
  },
];

export function initialNotifications(now = Date.now()): AppNotification[] {
  return [
    {
      id: "welcome",
      title: "A breath of fresh air",
      message:
        "Living room particle levels have stayed in the Good demo category for the past hour.",
      severity: "success",
      timestamp: new Date(now - 12 * 60000).toISOString(),
      read: false,
      category: "air-quality",
    },
    {
      id: "maintenance",
      title: "Your pre-filter could use a clean",
      message:
        "A quick vacuum helps maintain airflow. Your next routine check is in 7 days.",
      severity: "info",
      timestamp: new Date(now - 3 * 3600000).toISOString(),
      read: false,
      category: "maintenance",
    },
    {
      id: "automation",
      title: "Sleep schedule is ready",
      message:
        "Wind down for the night will switch your selected demo purifier to Sleep at 22:00.",
      severity: "info",
      timestamp: new Date(now - 6 * 3600000).toISOString(),
      read: true,
      category: "automation",
    },
    {
      id: "connection",
      title: "Connection restored",
      message:
        "Your simulated purifier is connected and readings are updating.",
      severity: "success",
      timestamp: new Date(now - 86400000).toISOString(),
      read: true,
      category: "connection",
    },
  ];
}

const round = (value: number, decimals = 1) => Number(value.toFixed(decimals));

/** Deterministic, reproducible historical demo data, not captured research data. */
export function createHistory(
  deviceId = "aeris-living",
  now = Date.now(),
): HistoryPoint[] {
  const bedroom = deviceId.includes("bedroom");
  const points: HistoryPoint[] = [];
  // Half-hour samples for 32 days cover monthly and custom date views.
  for (let index = 32 * 48; index >= 0; index--) {
    const timestamp = new Date(now - index * 30 * 60000);
    const phase = index / 7;
    const cooking = Math.pow(Math.max(0, Math.sin(index / 11)), 12) * 19;
    const pm25 = round(
      (bedroom ? 3.3 : 4.6) + (Math.sin(phase) + 1) * 2 + cooking,
    );
    const pm10 = round(pm25 * 1.8 + 3.7);
    points.push({
      timestamp: timestamp.toISOString(),
      pm1: round(pm25 * 0.63),
      pm25,
      pm10,
      co2: Math.round(
        (bedroom ? 590 : 620) +
          90 * Math.sin(index / 9) +
          Math.abs(Math.cos(index / 13)) * 110,
      ),
      tvoc: Math.round(88 + Math.abs(Math.sin(index / 10)) * 80 + cooking * 4),
      temperature: round(24 + Math.sin(index / 20) * 1.5),
      humidity: Math.round(47 + Math.sin(index / 17) * 7),
      aqi: calculateAqi(pm25, pm10),
      power: round(14 + Math.abs(Math.sin(index / 12)) * 12),
    });
  }
  // A recent five-minute series supports the live and hourly chart views.
  points.splice(-3);
  for (let index = 12; index >= 0; index--)
    points.push(
      makeLivePoint(
        initialDevices[bedroom ? 1 : 0],
        -index,
        now - index * 5 * 60000,
      ),
    );
  return points;
}

export function makeLivePoint(
  device: Device,
  tick: number,
  now = Date.now(),
): HistoryPoint {
  const bedroom = device.id.includes("bedroom");
  const drift = Math.sin(tick / 8) * 0.6 + Math.sin(tick / 3) * 0.2;
  const pm25 = round(
    Math.max(
      0.5,
      (bedroom ? 3.2 : 4.3) +
        drift +
        (device.power ? 0 : 3 + Math.min(tick / 12, 15)),
    ),
  );
  const pm10 = round(pm25 * 1.9 + 4.1);
  const fan =
    device.mode === "turbo"
      ? 5
      : device.mode === "sleep"
        ? 1
        : device.mode === "eco"
          ? 1
          : device.fanSpeed;
  return {
    timestamp: new Date(now).toISOString(),
    pm1: round(pm25 * 0.65),
    pm25,
    pm10,
    co2: Math.round((bedroom ? 612 : 648) + Math.sin(tick / 7) * 24),
    tvoc: Math.round(108 + Math.sin(tick / 6) * 17),
    temperature: round(24.6 + Math.sin(tick / 20) * 0.4),
    humidity: Math.round(48 + Math.sin(tick / 13) * 3),
    aqi: calculateAqi(pm25, pm10),
    power: device.power ? round(5 + fan * 5.4 + (device.uv ? 3 : 0)) : 0.4,
  };
}

export const sensorMeta: Record<SensorKey, { label: string; unit: string }> = {
  pm1: { label: "PM1.0", unit: "µg/m³" },
  pm25: { label: "PM2.5", unit: "µg/m³" },
  pm10: { label: "PM10", unit: "µg/m³" },
  co2: { label: "CO₂", unit: "ppm" },
  tvoc: { label: "TVOC", unit: "ppb" },
  temperature: { label: "Temperature", unit: "°C" },
  humidity: { label: "Humidity", unit: "%" },
};

function sensorStatus(key: SensorKey, value: number): string {
  if (key === "temperature")
    return value >= 18 && value <= 28 ? "Comfortable" : "Outside comfort range";
  if (key === "humidity")
    return value >= 40 && value <= 60
      ? "Comfortable"
      : value < 40
        ? "Dry"
        : "Humid";
  if (key === "co2")
    return value < 800 ? "Good" : value < 1200 ? "Elevated" : "High";
  if (key === "tvoc")
    return value < 220 ? "Low" : value < 660 ? "Elevated" : "High";
  const limit = key === "pm1" ? 10 : key === "pm25" ? 9 : 54;
  return value <= limit ? "Good" : value <= limit * 3 ? "Elevated" : "High";
}

export function readingsFromHistory(
  history: HistoryPoint[],
  online = true,
  availability?: Partial<Record<SensorKey, boolean>>,
): SensorReading[] {
  const latest = history[history.length - 1];
  const hourAgo = Date.parse(latest.timestamp) - 3600000;
  const previous = history.reduce(
    (nearest, point) =>
      Math.abs(Date.parse(point.timestamp) - hourAgo) <
      Math.abs(Date.parse(nearest.timestamp) - hourAgo)
        ? point
        : nearest,
    history[0],
  );
  return (Object.keys(sensorMeta) as SensorKey[]).map((key) => {
    const available = online && (availability?.[key] ?? true);
    return {
      key,
      ...sensorMeta[key],
      value: latest[key],
      status: available ? sensorStatus(key, latest[key]) : "Unavailable",
      trend:
        previous[key] === 0
          ? 0
          : round(
              ((latest[key] - previous[key]) / Math.abs(previous[key])) * 100,
            ),
      available,
      updatedAt: latest.timestamp,
      history: history.slice(-24).map((point) => point[key]),
    };
  });
}
