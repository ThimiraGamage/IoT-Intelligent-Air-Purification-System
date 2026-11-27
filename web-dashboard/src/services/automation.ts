import type { AutomationRule, Device, HistoryPoint } from "../types";

export function shouldRunRule(
  rule: AutomationRule,
  device: Device,
  latest: HistoryPoint,
  now: Date,
): boolean {
  if (!rule.enabled || !device.online) return false;
  if (rule.sensor === "time")
    return (
      rule.time ===
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
  if (rule.sensor === "filter") return device.filterLife <= rule.threshold;
  return latest[rule.sensor] > rule.threshold;
}

export function validateCommand(
  device: Device,
  patch: Partial<Device>,
): string | null {
  if (!device.online)
    return "Device is offline. Reconnect before sending a command.";
  if (device.childLock && Object.keys(patch).some((key) => key !== "childLock"))
    return "Child lock is enabled. Unlock the controls first.";
  if (patch.uv && (!device.interlockClosed || !(patch.power ?? device.power)))
    return "UV-C request rejected: power must be on and the hardware safety interlock closed.";
  if (
    patch.fanSpeed !== undefined &&
    (!Number.isInteger(patch.fanSpeed) ||
      patch.fanSpeed < 1 ||
      patch.fanSpeed > 5)
  )
    return "Choose a fan speed from 1 to 5.";
  if (
    patch.brightness !== undefined &&
    (!Number.isFinite(patch.brightness) ||
      patch.brightness < 0 ||
      patch.brightness > 100)
  )
    return "Display brightness must be between 0 and 100%.";
  if (
    patch.mode !== undefined &&
    !["auto", "manual", "sleep", "turbo", "eco"].includes(patch.mode)
  )
    return "Unknown purification mode.";
  if (patch.interlockClosed !== undefined)
    return "Hardware safety interlocks cannot be changed by device commands.";
  return null;
}

export function confirmedDeviceState(
  device: Device,
  patch: Partial<Device>,
): Device {
  const next = { ...device };
  const allowed = [
    "power",
    "mode",
    "fanSpeed",
    "uv",
    "aroma",
    "childLock",
    "brightness",
  ] as const;
  for (const key of allowed)
    if (patch[key] !== undefined) Object.assign(next, { [key]: patch[key] });
  if (patch.mode === "sleep" || patch.mode === "eco") next.fanSpeed = 1;
  if (patch.mode === "sleep") next.brightness = 20;
  if (patch.mode === "turbo") next.fanSpeed = 5;
  if (patch.mode === "auto") next.fanSpeed = 2;
  if (!next.power || !next.interlockClosed) next.uv = false;
  if (!next.power) next.aroma = false;
  return next;
}
