import { getKiLevel } from "@/lib/ki";

type KiGaugeProps = {
  score: number;
  size?: number;
};

const STROKE_WIDTH = 10;

// Medidor radial del Ki. Único elemento de la UI con glow, para que se
// sienta como el "hero" de marca y no un gráfico de datos genérico.
export function KiGauge({ score, size = 220 }: KiGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const level = getKiLevel(clamped);
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const accent = `var(--color-${level.colorToken})`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface)"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 10px ${accent})`,
            transition: "stroke-dashoffset 0.8s ease, stroke 0.8s ease",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center gap-1 text-center">
        <span className="font-display text-base font-semibold tracking-wide text-ink">
          {level.label}
        </span>
        <span className="font-mono text-3xl text-ink">{clamped}</span>
      </div>
    </div>
  );
}
