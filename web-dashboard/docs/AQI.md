# Particulate index calculation

The interface displays an **instantaneous demo particulate index** using the US EPA's 2024 particulate breakpoints. The index is a useful visual demonstration, not an official AQI, a validated health assessment, a 24-hour average, or an implementation of EPA NowCast.

For each pollutant, `src/utils/aqi.ts` truncates concentration (PM2.5: one decimal; PM10: integer), locates the surrounding concentration and index breakpoints, and linearly interpolates:

```text
I = round((I_high − I_low) / (C_high − C_low) × (C − C_low) + I_low)
displayed particulate index = max(I_PM2.5, I_PM10)
```

| Index   | PM2.5, µg/m³ | PM10, µg/m³ | Category                       |
| ------- | ------------ | ----------- | ------------------------------ |
| 0–50    | 0.0–9.0      | 0–54        | Good                           |
| 51–100  | 9.1–35.4     | 55–154      | Moderate                       |
| 101–150 | 35.5–55.4    | 155–254     | Unhealthy for sensitive groups |
| 151–200 | 55.5–125.4   | 255–354     | Unhealthy                      |
| 201–300 | 125.5–225.4  | 355–424     | Very unhealthy                 |
| 301–500 | 225.5–325.4  | 425–604     | Hazardous                      |

The demo clamps the display at 500; it does not extrapolate hazardous concentrations. The official particulate daily index uses 24-hour concentration data. Source: [EPA AirNow technical reporting guidance](https://www.airnow.gov/publications/air-quality-index/technical-assistance-document-for-reporting-the-daily-aqi/) and [40 CFR Part 58, Appendix G](https://www.govinfo.gov/content/pkg/CFR-2025-title40-vol6/xhtml/CFR-2025-title40-vol6-part58.html).

Before using real hardware, implement validated sensor calibration, quality flags, suitable time aggregation, data completeness rules, local applicability review, and clear distinction between instantaneous indoor measurements and published outdoor AQI. CO₂, TVOC, temperature, and humidity do not contribute to this particulate index. PM1.0 does not have an EPA AQI breakpoint here. Their card statuses use demo product thresholds rather than certified exposure limits.

TVOC is a broad response expressed as a simulated ppb-equivalent value. It cannot establish the identity or concentration of benzene, toluene, LPG, or another specific hazardous chemical. Future compound-specific research needs appropriate validated sensing hardware.
