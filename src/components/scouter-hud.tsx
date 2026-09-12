"use client";

import { useEffect, useId, useState } from "react";

type ScouterHudProps = {
  color: string;
  className?: string;
};

// Lectura de "poder de combate" simulada: sube a saltos, como un scouter
// bloqueando un objetivo, hasta asentarse en un valor y reiniciar.
function usePowerReadout(target = 9001, settleAt = 0.92) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let current = 0;
    let raf: ReturnType<typeof setInterval>;

    const tick = () => {
      const remaining = target - current;
      current += Math.max(37, Math.round(remaining * (Math.random() * 0.35)));
      if (current >= target * settleAt) {
        current = target;
        setValue(current);
        clearInterval(raf);
        window.setTimeout(() => {
          current = 0;
          setValue(0);
          raf = setInterval(tick, 90);
        }, 2200);
        return;
      }
      setValue(current);
    };

    raf = setInterval(tick, 90);
    return () => clearInterval(raf);
  }, [target, settleAt]);

  return value;
}

// Escena original tipo "scouter" (visor de poder): anillos de radar,
// barrido giratorio y retícula. No es arte de Dragon Ball, es una
// reinterpretación del concepto para la identidad visual de Zeni.
export function ScouterHud({ color, className }: ScouterHudProps) {
  const gradientId = useId();
  const power = usePowerReadout();

  return (
    <div className={className} style={{ color }} aria-hidden="true">
      <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="500" fill={`url(#${gradientId})`} />

        {/* Retícula */}
        <g stroke="currentColor" strokeOpacity="0.25">
          <line x1="400" y1="60" x2="400" y2="440" strokeWidth="1" strokeDasharray="2 6" />
          <line x1="120" y1="250" x2="680" y2="250" strokeWidth="1" strokeDasharray="2 6" />
        </g>
        <g stroke="currentColor" strokeOpacity="0.35" fill="none">
          <circle cx="400" cy="250" r="60" strokeWidth="1" />
          <circle cx="400" cy="250" r="130" strokeWidth="1" />
          <circle cx="400" cy="250" r="200" strokeWidth="1" />
        </g>

        {/* Barrido giratorio */}
        <g
          className="origin-[400px_250px] animate-[scouter-sweep_6s_linear_infinite]"
          style={{ transformOrigin: "400px 250px" }}
        >
          <path
            d="M400 250 L400 50 A200 200 0 0 1 573 150 Z"
            fill="currentColor"
            opacity="0.08"
          />
          <line x1="400" y1="250" x2="400" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        </g>

        {/* Marcas de esquina estilo HUD */}
        {[
          [230, 130],
          [570, 130],
          [230, 370],
          [570, 370],
        ].map(([x, y], i) => (
          <path
            key={i}
            d={`M${x} ${y + (y < 250 ? 18 : -18)} L${x} ${y} L${x + (x < 400 ? 18 : -18)} ${y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.5"
          />
        ))}
      </svg>

      {/* Anillos de pulso, como un objetivo bloqueándose */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              borderColor: "currentColor",
              animation: "scouter-pulse 3s ease-out infinite",
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}
      </div>

      {/* Lectura de poder, esquina superior izquierda */}
      <div className="absolute left-4 top-4 flex items-center gap-2 font-mono text-xs tracking-widest md:left-6 md:top-6">
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          style={{ animation: "scouter-blink 1.6s ease-in-out infinite" }}
        />
        <span className="text-ink-muted">PODER</span>
        <span className="min-w-[3.5ch] text-ink">{power.toString().padStart(4, "0")}</span>
      </div>
    </div>
  );
}
