import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoAirService } from "./demoService";
import { STORAGE_KEY, type StorageLike } from "./storage";

let service: DemoAirService;
beforeEach(() => {
  vi.useFakeTimers();
  service = new DemoAirService();
});
afterEach(() => {
  service.dispose();
  vi.useRealTimers();
});

describe("simulated command lifecycle", () => {
  it("keeps requested and reported states separate until the acknowledgement", () => {
    service.sendCommand({ mode: "turbo" });
    expect(service.getSnapshot().command?.status).toBe("pending");
    expect(service.getSnapshot().devices[0].mode).toBe("auto");
    vi.advanceTimersByTime(850);
    expect(service.getSnapshot().command?.status).toBe("confirmed");
    expect(service.getSnapshot().devices[0].mode).toBe("turbo");
  });
  it("revalidates hardware safety at acknowledgement time", () => {
    service.sendCommand({ uv: true });
    service.updateDevice(service.getSnapshot().selectedDeviceId, {
      interlockClosed: false,
    });
    vi.advanceTimersByTime(850);
    expect(service.getSnapshot().command?.status).toBe("rejected");
    expect(service.getSnapshot().devices[0].uv).toBe(false);
  });
  it("never applies a command to the newly selected device", () => {
    service.sendCommand({ mode: "turbo" });
    service.selectDevice("aeris-bedroom");
    vi.advanceTimersByTime(850);
    expect(service.getSnapshot().devices[0].mode).toBe("turbo");
    expect(service.getSnapshot().devices[1].mode).toBe("sleep");
  });
  it("acknowledges concurrent requests independently for each device", () => {
    service.sendCommand({ mode: "turbo" });
    service.selectDevice("aeris-bedroom");
    expect(service.getSnapshot().command).toBeNull();
    service.sendCommand({ mode: "eco" });
    vi.advanceTimersByTime(850);
    expect(service.getSnapshot().devices[0].mode).toBe("turbo");
    expect(service.getSnapshot().devices[1].mode).toBe("eco");
    expect(service.getSnapshot().command?.deviceId).toBe("aeris-bedroom");
    expect(service.getSnapshot().command?.status).toBe("confirmed");
    service.selectDevice("aeris-living");
    expect(service.getSnapshot().command?.status).toBe("confirmed");
    expect(service.getSnapshot().command?.deviceId).toBe("aeris-living");
  });
  it("allows only one pending request per device", () => {
    service.sendCommand({ mode: "turbo" });
    const requestId = service.getSnapshot().command?.id;
    service.sendCommand({ mode: "eco" });
    expect(service.getSnapshot().command?.id).toBe(requestId);
    vi.advanceTimersByTime(850);
    expect(service.getSnapshot().devices[0].mode).toBe("turbo");
  });
  it("marks readings unavailable then recovers with a fresh timestamp", () => {
    const unsubscribe = service.subscribe(() => {});
    const initial = service.getSnapshot().lastUpdated;
    service.simulateConnection();
    expect(service.getSnapshot().connection).toBe("offline");
    expect(
      service.getSnapshot().readings.every((reading) => !reading.available),
    ).toBe(true);
    vi.advanceTimersByTime(1800);
    expect(service.getSnapshot().connection).toBe("reconnecting");
    vi.advanceTimersByTime(2400);
    expect(service.getSnapshot().connection).toBe("connected");
    expect(service.getSnapshot().lastUpdated).not.toBe(initial);
    unsubscribe();
  });
  it("preserves more than a month of simulated history", () => {
    const history = service.getSnapshot().history;
    expect(
      Date.parse(history[history.length - 1].timestamp) -
        Date.parse(history[0].timestamp),
    ).toBeGreaterThanOrEqual(31 * 86400000);
  });
  it("retains the last sample timestamp during disconnection", () => {
    service.simulateConnection();
    const last = service.getSnapshot().lastUpdated;
    vi.advanceTimersByTime(1000);
    service.tick();
    expect(service.getSnapshot().lastUpdated).toBe(last);
    expect(
      service.getSnapshot().readings.every((reading) => !reading.available),
    ).toBe(true);
  });
  it("prevents repeated automation alerts during the cooldown", () => {
    service.addRule({
      name: "Test threshold",
      sensor: "pm25",
      threshold: 0,
      time: "22:00",
      action: "notify",
      enabled: true,
    });
    service.tick();
    const after = service.getSnapshot().notifications.length;
    service.tick();
    expect(service.getSnapshot().notifications.length).toBe(after);
  });
});

describe("browser storage resilience", () => {
  it("falls back to defaults when local data is malformed", () => {
    const badStorage: StorageLike = {
      getItem: () => "{bad JSON",
      setItem: () => {},
    };
    const other = new DemoAirService(badStorage);
    expect(other.getSnapshot().settings.currency).toBe("LKR");
    expect(other.getSnapshot().devices.length).toBe(2);
    other.dispose();
  });
  it("survives denied browser storage", () => {
    const deniedStorage: StorageLike = {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    };
    const other = new DemoAirService(deniedStorage);
    expect(() => other.updateSettings({ theme: "dark" })).not.toThrow();
    other.dispose();
  });
  it("persists settings and device details without persisting telemetry", () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    };
    const first = new DemoAirService(storage);
    first.updateSettings({ currency: "USD", tariff: 0.2 });
    first.updateDevice(first.getSnapshot().selectedDeviceId, {
      name: "My purifier",
    });
    const second = new DemoAirService(storage);
    expect(second.getSnapshot().settings.currency).toBe("USD");
    expect(second.getSnapshot().devices[0].name).toBe("My purifier");
    expect(values.get(STORAGE_KEY)).not.toContain("history");
    first.dispose();
    second.dispose();
  });
  it("preserves generated maintenance notifications and read state after reload", () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    };
    const first = new DemoAirService(storage);
    first.resetFilter();
    const notification = first.getSnapshot().notifications[0];
    first.markRead(notification.id);
    const second = new DemoAirService(storage);
    expect(second.getSnapshot().notifications[0].id).toBe(notification.id);
    expect(second.getSnapshot().notifications[0].read).toBe(true);
    first.dispose();
    second.dispose();
  });
});
