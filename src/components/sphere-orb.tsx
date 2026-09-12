type SphereOrbProps = {
  index: number;
  completed: boolean;
  size?: number;
  color?: string;
  className?: string;
};

const STAR_OFFSETS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-2.5, 0],
    [2.5, 0],
  ],
  3: [
    [0, -2.5],
    [-2.5, 2],
    [2.5, 2],
  ],
};

function starPositions(count: number): [number, number][] {
  if (count <= 3) return STAR_OFFSETS[count] ?? [];
  const outer = count - 1;
  const positions: [number, number][] = [[0, 0]];
  for (let i = 0; i < outer; i++) {
    const angle = (i / outer) * Math.PI * 2 - Math.PI / 2;
    positions.push([Math.cos(angle) * 3.4, Math.sin(angle) * 3.4]);
  }
  return positions;
}

// Icono original inspirado en las esferas del dragón: una por hito de
// progreso (1 a 7 estrellas), sin usar arte con derechos de Dragon Ball.
export function SphereOrb({ index, completed, size = 22, color = "var(--color-ki-awakening)", className }: SphereOrbProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="9"
        fill={completed ? color : "transparent"}
        stroke={completed ? color : "var(--color-ink-muted)"}
        strokeOpacity={completed ? 1 : 0.3}
        strokeWidth={1.2}
      />
      <g fill={completed ? "var(--color-void)" : "var(--color-ink-muted)"} fillOpacity={completed ? 0.9 : 0.35}>
        {starPositions(index).map(([dx, dy], i) => (
          <circle key={i} cx={10 + dx} cy={10 + dy} r="1" />
        ))}
      </g>
    </svg>
  );
}
