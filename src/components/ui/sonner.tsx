"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Re-tematizado a los tokens de Zeni (bg-surface/text-ink/border-ink-muted)
// en vez del popover/foreground genérico de shadcn — mismo patrón que el
// resto de primitivos en components/ui (select, dropdown-menu).
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-ink group-[.toaster]:border-ink-muted/15 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-black/40",
          description: "group-[.toast]:text-ink-muted",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "color-mix(in srgb, var(--color-ink-muted) 15%, transparent)",
        } as CSSProperties
      }
      {...props}
    />
  );
}
