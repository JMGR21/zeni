"use client";

import { useId } from "react";

type AuraSceneProps = {
  color: string;
  className?: string;
};

// Escena atmosférica original (rayos + partículas), NO arte de Dragon Ball.
// Pensada para colocarse detrás de otro contenido con position: absolute, inset-0.
export function AuraScene({ color, className }: AuraSceneProps) {
  const gradientId = useId();
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  const particles = [
    { x: 120, y: 80, r: 2.5, o: 0.6 },
    { x: 680, y: 120, r: 1.8, o: 0.4 },
    { x: 90, y: 320, r: 2, o: 0.5 },
    { x: 720, y: 300, r: 3, o: 0.35 },
    { x: 400, y: 60, r: 1.5, o: 0.5 },
    { x: 200, y: 400, r: 2.2, o: 0.3 },
    { x: 600, y: 420, r: 1.6, o: 0.45 },
    { x: 400, y: 440, r: 2, o: 0.3 },
  ];

  return (
    <svg
      viewBox="0 0 800 500"
      className={className}
      style={{ color }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="800" height="500" fill={`url(#${gradientId})`} />

      <g transform="translate(400 250)">
        {rays.map((angle) => (
          <line
            key={angle}
            x1="0"
            y1="0"
            x2="0"
            y2="-230"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.08"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>

      {particles.map((p) => (
        <circle
          key={`${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="currentColor"
          opacity={p.o}
        />
      ))}
    </svg>
  );
}
