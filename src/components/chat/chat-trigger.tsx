"use client";

import { MessageCircle } from "lucide-react";

/**
 * FAB flotante (bottom-6 left-6) para abrir el chat de Zeni — se mantiene
 * montado incluso con el panel abierto (coherente con el resto del
 * proyecto, ej. el FAB de registro en el dashboard y en `/dragons`), solo
 * cambia su ícono/estado.
 */
export function ChatTrigger({ onToggle, open }: { onToggle: () => void; open: boolean }) {
  if (open) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Abrir chat de Zeni"
      className="animate-in fade-in-0 zoom-in-75 fixed bottom-6 left-6 z-50 flex size-14 items-center justify-center rounded-full bg-ki-awakening text-void shadow-lg transition-all duration-200 hover:scale-105 hover:bg-ki-awakening/90 active:scale-95"
    >
      <MessageCircle className="size-6" />
    </button>
  );
}
