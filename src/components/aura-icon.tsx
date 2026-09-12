type AuraIconProps = {
  color: string;
  size?: number;
  className?: string;
};

// Ilustración original (no arte de Dragon Ball): silueta orgánica de aura
// ascendente, en capas con blur para usarse como decoración detrás del KiGauge.
export function AuraIcon({ color, size = 320, className }: AuraIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g style={{ filter: "blur(18px)" }} opacity={0.5}>
        <path
          d="M100 190C70 160 40 140 45 100C48 72 70 55 65 30C90 45 100 70 98 95C120 80 118 50 105 20C140 40 155 80 140 115C160 105 168 80 165 55C185 85 190 125 165 155C150 172 125 185 100 190Z"
          fill={color}
        />
      </g>
      <g style={{ filter: "blur(6px)" }} opacity={0.3}>
        <path
          d="M100 175C78 152 58 132 62 102C64 82 80 68 76 48C94 60 101 80 99 100C115 88 113 64 103 40C128 56 139 86 128 112C143 104 149 84 146 64C161 87 165 117 146 140C134 154 116 165 100 175Z"
          fill={color}
        />
      </g>
    </svg>
  );
}
