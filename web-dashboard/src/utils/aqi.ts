/** US EPA 2024 particulate breakpoints. Inputs here are instantaneous demo data,
 * not validated 24-hour averages or the EPA NowCast. See docs/AQI.md. */
const pm25Breakpoints = [
  [0, 9, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];
const pm10Breakpoints = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 604, 301, 500],
];

function subindex(value: number, breakpoints: number[][], precision: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  const concentration =
    Math.floor((value + Number.EPSILON) * precision) / precision;
  const band =
    breakpoints.find(([, high]) => concentration <= high) ??
    breakpoints[breakpoints.length - 1];
  const [low, high, indexLow, indexHigh] = band;
  return Math.min(
    500,
    Math.max(
      0,
      Math.round(
        ((indexHigh - indexLow) / (high - low)) * (concentration - low) +
          indexLow,
      ),
    ),
  );
}

export function calculateAqi(pm25: number, pm10?: number): number {
  return Math.max(
    subindex(pm25, pm25Breakpoints, 10),
    pm10 === undefined ? 0 : subindex(pm10, pm10Breakpoints, 1),
  );
}

export function getAqiCategory(aqi: number) {
  if (aqi <= 50)
    return {
      label: "Good",
      color: "#39866c",
      description:
        "Particle levels are low. Your room feels fresh and comfortable.",
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "#b58a25",
      description:
        "Particle levels are elevated. Keep purification running and watch the trend.",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy for sensitive groups",
      color: "#cb7939",
      description:
        "Particle levels are high for sensitive people. Reduce indoor pollution sources.",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      color: "#c65555",
      description:
        "Particle levels are high. Check pollution sources and ventilation conditions.",
    };
  if (aqi <= 300)
    return {
      label: "Very unhealthy",
      color: "#8e5d9f",
      description:
        "Particle levels are very high. Investigate the source and consult local air-quality guidance.",
    };
  return {
    label: "Hazardous",
    color: "#8d3e57",
    description:
      "The demo particulate index is extremely high. This prototype is not a safety alarm.",
  };
}
