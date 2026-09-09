import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HudFrameProps = {
  children: ReactNode;
  className?: string;
};

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "left-0 bottom-0 border-l-2 border-b-2",
  "right-0 bottom-0 border-r-2 border-b-2",
] as const;

// Marco tipo "visor" (scouter) para la tarjeta de Auth: esquinas HUD +
// línea de escaneo sutil, para que la tarjeta se sienta parte del mundo
// visual de Zeni y no un formulario genérico.
export function HudFrame({ children, className }: HudFrameProps) {
  return (
    <div className={cn("relative", className)}>
      {CORNERS.map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute h-5 w-5 border-ki-awakening/70",
            corner
          )}
        />
      ))}
      <div className="relative overflow-hidden border border-ink-muted/10 bg-surface/60 px-6 py-8 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-px bg-linear-to-r from-transparent via-ki-awakening/50 to-transparent"
          style={{ animation: "scouter-scan-y 5s linear infinite" }}
        />
        {children}
      </div>
    </div>
  );
}
