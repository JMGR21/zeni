"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Movimientos" },
  { href: "/budget", label: "Presupuesto" },
  { href: "/dragons", label: "Dragones" },
  { href: "/recurring", label: "Recurrentes" },
  { href: "/training", label: "Entrenamiento" },
  { href: "/instruments", label: "Instrumentos" },
  { href: "/achievements", label: "Logros" },
  { href: "/categories", label: "Categorías" },
] as const;

// Cliente para poder derivar el link activo de la URL actual (usePathname) sin
// que AppHeader (servidor) necesite un prop `active` por página — así el header
// vive una sola vez en el layout compartido y no se re-monta ni parpadea al
// navegar entre rutas.
//
// Debajo de `md` la fila completa de 6 links no cabe junto al logo y el
// avatar (probado en 375px: desborda y produce scroll horizontal), así que
// se colapsa a un botón de menú con los mismos links en un dropdown — mismo
// componente que ya usa ProfileMenu, sin inventar un patrón visual nuevo.
export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden items-center gap-5 md:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors",
              pathname.startsWith(item.href) ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Abrir menú de navegación"
              className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink md:hidden"
            />
          }
        >
          <Menu className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {NAV_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              <span className={pathname.startsWith(item.href) ? "text-ink" : "text-ink-muted"}>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
