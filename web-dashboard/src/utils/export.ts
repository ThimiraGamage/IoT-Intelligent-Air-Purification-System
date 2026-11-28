import type { HistoryPoint } from "../types";

/** Quote every field, preserve Unicode, and neutralize spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function historyToCsv(history: HistoryPoint[]): string {
  const keys: (keyof HistoryPoint)[] = [
    "timestamp",
    "pm1",
    "pm25",
    "pm10",
    "co2",
    "tvoc",
    "temperature",
    "humidity",
    "aqi",
    "power",
  ];
  const labels = [
    "timestamp_utc",
    "pm1_ug_m3",
    "pm25_ug_m3",
    "pm10_ug_m3",
    "co2_ppm",
    "tvoc_ppb",
    "temperature_c",
    "humidity_percent",
    "instantaneous_demo_particulate_index",
    "estimated_power_w",
  ];
  return (
    "\uFEFF" +
    [
      labels.map(csvCell).join(","),
      ...history.map((point) =>
        keys.map((key) => csvCell(point[key])).join(","),
      ),
    ].join("\r\n")
  );
}

export function exportCsv(
  history: HistoryPoint[],
  filename = "aeris-demo-readings.csv",
): void {
  const url = URL.createObjectURL(
    new Blob([historyToCsv(history)], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
