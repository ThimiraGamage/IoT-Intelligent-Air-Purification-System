import { describe, expect, it } from "vitest";
import { initialDevices, initialRules, makeLivePoint } from "../mock/data";
import {
  confirmedDeviceState,
  shouldRunRule,
  validateCommand,
} from "./automation";

describe("device command safety boundary", () => {
  const device = initialDevices[0];
  it("rejects UV-C with an open safety interlock", () =>
    expect(
      validateCommand({ ...device, interlockClosed: false }, { uv: true }),
    ).toMatch(/interlock/));
  it("rejects software changes to hardware interlock", () =>
    expect(validateCommand(device, { interlockClosed: true })).toMatch(
      /cannot/,
    ));
  it("rejects commands sent offline", () =>
    expect(
      validateCommand({ ...device, online: false }, { power: true }),
    ).toMatch(/offline/));
  it("requires power before UV-C can run", () =>
    expect(validateCommand({ ...device, power: false }, { uv: true })).toMatch(
      /power/,
    ));
  it("allows child lock to be released while blocking other controls", () => {
    expect(
      validateCommand({ ...device, childLock: true }, { childLock: false }),
    ).toBeNull();
    expect(
      validateCommand({ ...device, childLock: true }, { fanSpeed: 4 }),
    ).toMatch(/lock/);
  });
  it("turns off UV-C whenever power is off", () =>
    expect(
      confirmedDeviceState({ ...device, uv: true }, { power: false }).uv,
    ).toBe(false));
  it("rejects invalid fan ranges", () => {
    expect(validateCommand(device, { fanSpeed: 6 })).toMatch(/1 to 5/);
    expect(validateCommand(device, { fanSpeed: 2.3 })).toMatch(/1 to 5/);
  });
  it("maps turbo and sleep modes to their confirmed fan speeds", () => {
    expect(confirmedDeviceState(device, { mode: "turbo" }).fanSpeed).toBe(5);
    expect(confirmedDeviceState(device, { mode: "sleep" }).fanSpeed).toBe(1);
  });
});

describe("automation conditions", () => {
  const device = initialDevices[0];
  const now = new Date(2026, 10, 27, 22, 0);
  const latest = makeLivePoint(device, 0, now.getTime());
  it("requires enabled and connected devices", () => {
    expect(
      shouldRunRule(
        { ...initialRules[0], enabled: false },
        device,
        { ...latest, pm25: 30 },
        now,
      ),
    ).toBe(false);
    expect(
      shouldRunRule(
        initialRules[0],
        { ...device, online: false },
        { ...latest, pm25: 30 },
        now,
      ),
    ).toBe(false);
  });
  it("triggers only above a PM2.5 threshold", () => {
    expect(
      shouldRunRule(initialRules[0], device, { ...latest, pm25: 25 }, now),
    ).toBe(false);
    expect(
      shouldRunRule(initialRules[0], device, { ...latest, pm25: 25.1 }, now),
    ).toBe(true);
  });
  it("matches a scheduled browser-local time", () =>
    expect(shouldRunRule(initialRules[1], device, latest, now)).toBe(true));
  it("triggers maintenance at or below remaining life threshold", () =>
    expect(
      shouldRunRule(
        initialRules[2],
        { ...device, filterLife: 20 },
        latest,
        now,
      ),
    ).toBe(true));
});
