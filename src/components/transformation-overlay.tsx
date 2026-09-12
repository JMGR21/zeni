"use client";

import { useEffect, useState } from "react";
import { AuraIcon } from "@/components/aura-icon";

type TransformationOverlayProps = {
  active: boolean;
  levelLabel: string;
  colorToken: string;
};

const AUTO_DISMISS_MS = 4500;

// Único otro lugar del proyecto, junto con el arco del KiGauge, donde se
// permite un glow animado — celebra una Transformación (subida de etiqueta
// de Ki mes contra mes). Reutiliza el mismo lenguaje visual (AuraIcon +
// glow del color de Ki), no un motivo nuevo.
export function TransformationOverlay({ active, levelLabel, colorToken }: TransformationOverlayProps) {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    setVisible(active);
    if (!active) return;
    const timeout = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [active]);

  if (!visible) return null;

  const accent = `var(--color-${colorToken})`;

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-label={`Transformación: ahora eres ${levelLabel}`}
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-void/90 backdrop-blur-sm"
    >
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute size-56 rounded-full"
          style={{
            boxShadow: `0 0 80px 24px ${accent}`,
            animation: "transformation-pulse 1.8s ease-in-out infinite",
          }}
        />
        <AuraIcon color={accent} size={280} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-mono text-xs tracking-widest text-ink-muted uppercase">Transformación</p>
        <p className="font-display text-3xl font-semibold" style={{ color: accent }}>
          ¡Ahora eres {levelLabel}!
        </p>
        <p className="mt-3 text-sm text-ink-muted">Toca para continuar</p>
      </div>
    </div>
  );
}
