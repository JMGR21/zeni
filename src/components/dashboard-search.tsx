"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

// Icono de búsqueda que se expande a un input al hacer clic — la búsqueda
// real ya vive en /transactions (filtro `q`, ya gatilla el logro
// "Detective Financiero"), así que esto solo navega ahí con el término en
// vez de duplicar esa lógica en el dashboard.
export function DashboardSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/transactions?q=${encodeURIComponent(trimmed)}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Buscar movimientos"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-lg border border-ink-muted/15 bg-void/40 text-ink-muted transition-colors hover:text-ink"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-muted/60"
        aria-hidden="true"
      />
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
        placeholder="Buscar movimientos..."
        className={cn(
          "h-9 w-40 rounded-lg border border-ink-muted/15 bg-void/40 pr-7 pl-8 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none sm:w-56",
        )}
      />
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        onClick={() => {
          setOpen(false);
          setValue("");
        }}
        className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
