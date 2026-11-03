"use client";

import { useState } from "react";
import { ChatTrigger } from "@/components/chat/chat-trigger";
import { ChatPanel } from "@/components/chat/chat-panel";

/**
 * Punto único de montaje: FAB flotante + panel overlay que se abre a
 * demanda — flotante para no interferir con el contenido ni empujar el
 * layout, ya envuelto en `SimulatorInputProvider` vía el layout.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChatTrigger onToggle={() => setOpen(true)} open={open} />
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}
