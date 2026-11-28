import { motion } from "framer-motion";
import { getAqiCategory } from "../utils/aqi";
export default function AqiRing({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const category = getAqiCategory(value);
  const progress = Math.min(value / 150, 1);
  return (
    <div
      className={`aqi-ring ${compact ? "compact" : ""}`}
      style={{ "--aqi-color": category.color } as React.CSSProperties}
    >
      <svg viewBox="0 0 220 190" aria-hidden="true">
        <path className="ring-track" d="M 37 159 A 90 90 0 1 1 183 159" />
        <motion.path
          className="ring-progress"
          d="M 37 159 A 90 90 0 1 1 183 159"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.16, progress) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="ring-value">
        <span className="eyebrow">INDOOR AQI</span>
        <strong>{Math.round(value)}</strong>
        <span className="ring-category">{category.label}</span>
      </div>
      <div className="ring-endpoints">
        <span>0</span>
        <span>150+</span>
      </div>
    </div>
  );
}
