import Link from "next/link";
import { cn } from "cn";

export type DragonsTab = "general" | "savings" | "debt";

const OPTIONS: { tab: DragonsTab; label: string; href: string }[] = [
  { tab: "general", label: "General", href: "/dragons" },
  { tab: "savings", label: "Ahorro", href: "/dragons?tab=savings" },
  { tab: "debt", label: "Deuda", href: "/dragons?tab=debt" },
];

// Mismo patrón tipo pestañas que AuthModeToggle (login/signup), aplicado
// aquí para separar la vista general de Dragones en Ahorro/Deuda sin salir
// de la página — vía query param para mantener /dragons como Server Component.
export function DragonsTabs({ active }: { active: DragonsTab }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
      {OPTIONS.map((option) => {
        const isActive = option.tab === active;
        return (
          <Link
            key={option.tab}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md py-1.5 text-center text-xs font-medium uppercase tracking-wide transition-colors",
              isActive ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
