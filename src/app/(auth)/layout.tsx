import { ScouterHud } from "@/components/scouter-hud";

// Ki Despertando (ámbar) como acento fijo: aún no hay un usuario con Ki
// calculado en las pantallas de Auth.
const AUTH_ACCENT = "var(--color-ki-awakening)";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <div className="relative flex h-56 shrink-0 items-center justify-center overflow-hidden bg-void md:h-auto md:flex-1">
        <ScouterHud color={AUTH_ACCENT} className="absolute inset-0 h-full w-full" />
        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-6 bg-ki-awakening/60 md:w-10" />
            <span className="font-display text-4xl font-bold tracking-[0.3em] text-ink md:text-6xl">
              ZENI
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-ki-awakening/60 md:w-10" />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ki-awakening md:text-sm">
            Scouter financiero
          </p>
          <p className="max-w-xs font-sans text-sm text-ink-muted md:text-base">
            Cada zeni ahorrado sube tu ki. Entrena tus finanzas como un guerrero.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
