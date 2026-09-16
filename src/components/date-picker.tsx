"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { cn } from "cn";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  label,
  className,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const valueLabel = value ? dateFormatter.format(value) : placeholder;

  return (
    <div className="relative h-10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={label ? `${label}: ${valueLabel}` : undefined}
              className={cn(
                "flex h-10 w-full items-center gap-2 rounded-lg border border-ink-muted/20 bg-void/40 px-2.5 text-sm text-ink transition-colors hover:border-ki-awakening/50",
                !value && "text-ink-muted",
                value && "pr-8",
                className,
              )}
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1 truncate text-left">{valueLabel}</span>
        </PopoverTrigger>
        <PopoverContent>
          {open && (
            <Calendar
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
              className="w-72"
            />
          )}
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label={label ? `Limpiar ${label.toLowerCase()}` : "Limpiar fecha"}
          onClick={() => onChange(null)}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
