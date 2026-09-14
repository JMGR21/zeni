import { getKiLevel } from "@/lib/ki";

type KiGaugeProps = {
  score: number;
  size?: number;
  // El glow queda reservado al tamaño grande (hero) — una versión mini
  // (ej. la tarjeta compacta de Ki en la franja superior del dashboard)
  // lo apaga para no romper la regla de "glow solo en dos lugares".
  glow?: boolean;
  // A tamaños pequeños el texto interno (etiqueta + score) no cabe —
  // showLabel:false deja solo el número, más legible en una tarjeta chica.
  showLabel?: boolean;
};

const STROKE_RATIO = 10 / 220;
const MIN_STROKE_WIDTH = 4;

// Medidor radial del Ki. Único elemento de la UI con glow (cuando
// glow=true), para que se sienta como el "hero" de marca y no un gráfico
// de datos genérico.
export function KiGauge({ score, size = 220, glow = true, showLabel = true }: KiGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const level = getKiLevel(clamped);
  const strokeWidth = Math.max(MIN_STROKE_WIDTH, size * STROKE_RATIO);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const accent = `var(--color-${level.colorToken})`;
  const gradientId = `ki-gauge-arc-${level.colorToken}`;
  const glowId = `ki-gauge-glow-${level.colorToken}`;

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
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: `color-mix(in oklch, ${accent} 55%, white)` }} />
            <stop offset="100%" style={{ stopColor: accent }} />
          </linearGradient>
          {/* Región de filtro ampliada (-60%/220%) a propósito: el recorte
              por defecto del SVG en su viewBox convertía el glow en una
              silueta cuadrada en vez de un aura difusa. */}
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={glow ? `url(#${glowId})` : undefined}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center gap-1 text-center">
        {showLabel && (
          <span
            className="font-display font-semibold tracking-wide text-ink"
            style={{ fontSize: size * 0.073 }}
          >
            {level.label}
          </span>
        )}
        <span className="font-mono text-ink" style={{ fontSize: size * 0.16 }}>
          {clamped}
        </span>
      </div>
    </div>
  );
}
