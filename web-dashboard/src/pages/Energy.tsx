import { useState, type FormEvent } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Zap, Leaf, Wallet, Clock3, Settings2, Check } from "lucide-react";
import { useApp } from "../hooks/useApp";
import type { HistoryPoint } from "../types";
import { Heading } from "./ManagementUI";

function consumption(history: HistoryPoint[], start: number, end = Infinity) {
  const points = history
    .map((point) => ({
      time: new Date(point.timestamp).getTime(),
      power: point.power,
    }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
  let wh = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const left = points[index];
    const right = points[index + 1];
    const hours =
      Math.max(0, Math.min(right.time, end) - Math.max(left.time, start)) /
      3600000;
    wh += (hours * (left.power + right.power)) / 2;
  }
  return wh / 1000;
}
export default function Energy() {
  const { device, settings, updateSettings, history, notify, lastUpdated } =
    useApp();
  const [range, setRange] = useState<"week" | "month">("week");
  const [tariff, setTariff] = useState(settings.tariff);
  const [currency, setCurrency] = useState(settings.currency);
  const [saved, setSaved] = useState(false);
  const now = new Date(lastUpdated).getTime();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const day = consumption(history, todayStart);
  const week = consumption(history, now - 7 * 86400000);
  const month = consumption(history, now - 30 * 86400000);
  const count = range === "week" ? 7 : 30;
  const chart = Array.from({ length: count }, (_, index) => {
    const date = new Date(todayStart - (count - index - 1) * 86400000);
    const value = consumption(
      history,
      date.getTime(),
      date.getTime() + 86400000,
    );
    return {
      date: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      energy: Number(value.toFixed(3)),
    };
  });
  const power =
    device.power && device.online
      ? Number((5 + device.fanSpeed * 5.4 + (device.uv ? 3 : 0)).toFixed(1))
      : device.power
        ? null
        : 0.4;
  const baseline = 0.045 * 24 * 30;
  const savings = Math.max(0, baseline - month);
  function save(event: FormEvent) {
    event.preventDefault();
    updateSettings({ tariff, currency });
    setSaved(true);
    notify("Electricity tariff saved");
  }
  function money(value: number) {
    return `${settings.currency} ${(value * settings.tariff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="A LIGHTER FOOTPRINT"
        title="Good air. Thoughtful energy."
        description="Understand your purifier’s estimated energy use, one day at a time."
        action={<span className="badge green">Simulated energy readings</span>}
      />
      <div className="grid-3">
        <section className="card manage-energy-stat">
          <Zap size={24} />
          <p className="muted">Current consumption</p>
          <div className="stat-value">
            {power === null ? "—" : power}
            <span> W</span>
          </div>
          <p className="muted">
            {power === null
              ? "Unavailable while device is offline"
              : device.power
                ? "Based on the confirmed fan setting"
                : "Purifier is powered off"}
          </p>
        </section>
        <section className="card manage-energy-stat">
          <Leaf size={24} />
          <p className="muted">Today’s energy</p>
          <div className="stat-value">
            {day.toFixed(2)}
            <span> kWh</span>
          </div>
          <p className="muted">{money(day)} estimated cost</p>
        </section>
        <section className="card manage-energy-stat">
          <Wallet size={24} />
          <p className="muted">Last 30 days</p>
          <div className="stat-value">
            {month.toFixed(2)}
            <span> kWh</span>
          </div>
          <p className="muted">{money(month)} estimated cost</p>
        </section>
      </div>
      <section className="card manage-pad">
        <div className="card-header">
          <div>
            <p className="eyebrow">THE BIGGER PICTURE</p>
            <h2>Small watts, over time</h2>
          </div>
          <div className="manage-tabs" aria-label="Energy chart period">
            <button
              className={range === "week" ? "is-active" : ""}
              aria-pressed={range === "week"}
              onClick={() => setRange("week")}
            >
              7 days
            </button>
            <button
              className={range === "month" ? "is-active" : ""}
              aria-pressed={range === "month"}
              onClick={() => setRange("month")}
            >
              30 days
            </button>
          </div>
        </div>
        <div
          className="manage-energy-chart"
          role="img"
          aria-label={`Simulated daily energy usage over the last ${count} days`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chart}
              margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border, #e8ece5)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={26}
                tick={{ fill: "#82907e", fontSize: 12 }}
                dy={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#82907e", fontSize: 12 }}
                unit=""
              />
              <Tooltip
                cursor={{ fill: "rgba(99,145,99,.08)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #dfe7db",
                  fontSize: 13,
                  color: "var(--text)",
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(3)} kWh`,
                  "Estimated usage",
                ]}
              />
              <Bar
                dataKey="energy"
                fill="#739b6f"
                radius={[5, 5, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="manage-caption">
          kWh integrated from simulated power samples. No calibrated power meter
          is connected.
        </p>
      </section>
      <div className="grid-2">
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">YOUR ELECTRICITY RATE</p>
              <h2>Make it personal</h2>
            </div>
            <Settings2 size={22} />
          </div>
          <form className="manage-form" onSubmit={save}>
            <div className="manage-form-grid">
              <label>
                Currency
                <select
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.target.value);
                    setSaved(false);
                  }}
                >
                  <option value="LKR">LKR · Sri Lankan rupee</option>
                  <option value="USD">USD · US dollar</option>
                  <option value="EUR">EUR · Euro</option>
                  <option value="GBP">GBP · British pound</option>
                  <option value="INR">INR · Indian rupee</option>
                </select>
              </label>
              <label>
                Price per kWh
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  required
                  value={tariff}
                  onChange={(event) => {
                    setTariff(Number(event.target.value));
                    setSaved(false);
                  }}
                />
              </label>
            </div>
            <p className="manage-field-note">
              Use the unit rate on your electricity bill. Estimates exclude
              fixed fees, taxes, and tiered pricing.
            </p>
            <div className="manage-actions">
              <button type="submit" className="button primary">
                Save rate
              </button>
              {saved && (
                <span className="manage-saved">
                  <Check size={16} />
                  Saved
                </span>
              )}
            </div>
          </form>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">A CONSIDERED ROUTINE</p>
              <h2>Your energy at a glance</h2>
            </div>
            <Clock3 size={22} />
          </div>
          <ul className="manage-compact-list">
            <li>
              <span>Last 7 days</span>
              <strong>{week.toFixed(2)} kWh</strong>
            </li>
            <li>
              <span>Last 30 days</span>
              <strong>{month.toFixed(2)} kWh</strong>
            </li>
            <li>
              <span>Total operating hours</span>
              <strong>
                {Math.floor(device.operatingHours).toLocaleString()} h
              </strong>
            </li>
            <li>
              <span>Illustrative monthly saving</span>
              <strong>{savings.toFixed(2)} kWh</strong>
            </li>
          </ul>
          <p className="manage-caption">
            Savings compare this demo history with an assumed 45 W device
            running continuously for 30 days. This is an illustrative
            comparison, not a measured efficiency claim.
          </p>
        </section>
      </div>
    </div>
  );
}
