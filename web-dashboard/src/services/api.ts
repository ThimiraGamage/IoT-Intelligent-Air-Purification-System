import type {
  AppActions,
  AppState,
  Device,
  DeviceCommand,
  HistoryPoint,
} from "../types";

/** Replace DemoAirService behind this boundary when a backend is available. */
export interface AirService extends AppActions {
  getSnapshot(): AppState;
  subscribe(listener: () => void): () => void;
  sendCommand(patch: Partial<Device>): void;
}

export interface TelemetryEnvelope {
  schemaVersion: 1;
  type: "telemetry";
  deviceId: string;
  sequence: number;
  sampledAt: string;
  receivedAt: string;
  source: "esp32";
  values: Omit<HistoryPoint, "timestamp" | "aqi" | "power">;
  measuredPowerWatts?: number;
  sensorHealth: Record<string, "ok" | "warming" | "unavailable" | "fault">;
}

export interface CommandRequest {
  id: string;
  deviceId: string;
  expiresAt: string;
  requested: Pick<
    Partial<Device>,
    "power" | "mode" | "fanSpeed" | "uv" | "aroma" | "childLock" | "brightness"
  >;
}

export interface CommandAcknowledgement {
  id: string;
  deviceId: string;
  status: DeviceCommand["status"];
  confirmedAt?: string;
  reportedState?: Partial<Device>;
  rejectionReason?:
    "interlock_open" | "child_lock" | "offline" | "expired" | "invalid_command";
}

export interface BackendApi {
  listDevices(): Promise<Device[]>;
  getHistory(
    deviceId: string,
    from: string,
    to: string,
  ): Promise<HistoryPoint[]>;
  requestCommand(
    command: CommandRequest,
  ): Promise<{ id: string; status: "pending" }>;
  /** Connect to an authenticated same-origin WebSocket; never connect a public UI to MQTT. */
  subscribeTelemetry(
    onTelemetry: (event: TelemetryEnvelope) => void,
    onCommand: (event: CommandAcknowledgement) => void,
  ): () => void;
}
