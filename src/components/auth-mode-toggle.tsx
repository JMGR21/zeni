import Link from "next/link";
import { cn } from "@/lib/utils";

type AuthModeToggleProps = {
  mode: "login" | "signup";
};

const OPTIONS = [
  { mode: "login" as const, href: "/login", label: "Iniciar sesión" },
  { mode: "signup" as const, href: "/signup", label: "Crear cuenta" },
];

// Selector de modo tipo pestañas de scouter, para saltar entre login y
// registro sin depender solo del enlace de texto al pie del formulario.
export function AuthModeToggle({ mode }: AuthModeToggleProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
      {OPTIONS.map((option) => {
        const active = option.mode === mode;
        return (
          <Link
            key={option.mode}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md py-1.5 text-center text-xs font-medium uppercase tracking-wide transition-colors",
              active
                ? "bg-ki-awakening text-void"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
