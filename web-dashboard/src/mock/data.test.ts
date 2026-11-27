import { describe, expect, it } from "vitest";
import { initialDevices, makeLivePoint, readingsFromHistory } from "./data";

describe("displayed hourly sensor trend", () => {
  const base = makeLivePoint(initialDevices[0], 0, Date.now() - 3600000);
  it("uses percentage from the hour-ago baseline rather than an absolute sample delta", () => {
    const recent = {
      ...base,
      timestamp: new Date(Date.parse(base.timestamp) + 3500000).toISOString(),
      pm25: 12,
    };
    const latest = {
      ...base,
      timestamp: new Date(Date.parse(base.timestamp) + 3600000).toISOString(),
      pm25: 15,
    };
    const readings = readingsFromHistory([
      { ...base, pm25: 10 },
      recent,
      latest,
    ]);
    expect(readings.find((reading) => reading.key === "pm25")?.trend).toBe(50);
  });
  it("does not return infinity when the comparison sample is zero", () => {
    const latest = {
      ...base,
      timestamp: new Date(Date.parse(base.timestamp) + 3600000).toISOString(),
      pm25: 5,
    };
    expect(
      Number.isFinite(
        readingsFromHistory([{ ...base, pm25: 0 }, latest]).find(
          (reading) => reading.key === "pm25",
        )!.trend,
      ),
    ).toBe(true);
  });
});
