import { describe, expect, it } from "vitest";
import { calculateAqi, getAqiCategory } from "./aqi";

describe("EPA 2024 particulate demo index", () => {
  it.each([
    [0, 0],
    [9, 50],
    [9.1, 51],
    [35.4, 100],
    [35.5, 101],
    [55.4, 150],
    [55.5, 151],
    [125.4, 200],
    [125.5, 201],
    [225.4, 300],
    [225.5, 301],
    [325.4, 500],
  ])("maps PM2.5 %s to %s", (concentration, expected) =>
    expect(calculateAqi(concentration)).toBe(expected),
  );
  it("truncates PM2.5 to one decimal before interpolation", () =>
    expect(calculateAqi(9.099)).toBe(50));
  it("uses the larger of the PM2.5 and PM10 subindices", () => {
    expect(calculateAqi(0, 154)).toBe(100);
    expect(calculateAqi(35.4, 54)).toBe(100);
  });
  it("truncates PM10 to an integer", () =>
    expect(calculateAqi(0, 54.99)).toBe(50));
  it("guards malformed inputs and caps the displayed demo index", () => {
    expect(calculateAqi(NaN)).toBe(0);
    expect(calculateAqi(-5)).toBe(0);
    expect(calculateAqi(900)).toBe(500);
  });
  it("categorizes exact boundaries", () => {
    expect(getAqiCategory(50).label).toBe("Good");
    expect(getAqiCategory(51).label).toBe("Moderate");
    expect(getAqiCategory(301).label).toBe("Hazardous");
  });
});
