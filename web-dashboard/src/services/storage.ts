import type {
  AppNotification,
  AutomationRule,
  Device,
  Settings,
} from "../types";

export const STORAGE_KEY = "aeris.dashboard.v1";
export interface SavedState {
  version: 1;
  devices: Device[];
  selectedDeviceId: string;
  settings: Settings;
  rules: AutomationRule[];
  notifications?: AppNotification[];
  readNotificationIds: string[];
  deletedNotificationIds: string[];
}
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadSavedState(
  storage?: StorageLike,
): Partial<SavedState> | undefined {
  if (!storage) return undefined;
  try {
    const saved: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (
      !saved ||
      typeof saved !== "object" ||
      !("version" in saved) ||
      saved.version !== 1
    )
      return undefined;
    return saved as Partial<SavedState>;
  } catch {
    return undefined;
  }
}

export function saveState(
  storage: StorageLike | undefined,
  state: SavedState,
): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
