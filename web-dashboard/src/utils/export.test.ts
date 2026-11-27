import { describe, expect, it } from "vitest";
import { csvCell, historyToCsv } from "./export";
import { initialDevices, makeLivePoint } from "../mock/data";

describe("research CSV export", () => {
  it("quotes delimiters and escapes embedded quotes", () =>
    expect(csvCell('a,"b"')).toBe('"a,""b"""'));
  it("neutralizes spreadsheet formulas", () =>
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"'));
  it("includes explicit simulation and units metadata in column names", () => {
    const csv = historyToCsv([makeLivePoint(initialDevices[0], 0)]);
    expect(csv).toContain("instantaneous_demo_particulate_index");
    expect(csv).toContain("estimated_power_w");
    expect(csv.split("\r\n").length).toBe(2);
  });
});
