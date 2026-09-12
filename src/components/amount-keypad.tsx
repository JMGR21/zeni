"use client";

import { cn } from "cn";
import { sanitizeAmountInput } from "@/lib/amount";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function AmountKeypad({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
}) {
  function pressKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    onChange(sanitizeAmountInput(value + key));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-1 py-2">
        <span className="font-mono text-2xl text-ink-muted">$</span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
          placeholder="0.00"
          className="w-40 border-none bg-transparent text-center font-mono text-4xl text-ink outline-none placeholder:text-ink-muted/40"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => pressKey(key)}
            className={cn(
              "h-12 rounded-lg border border-ink-muted/10 bg-void/40 font-mono text-lg transition-colors active:scale-95",
              key === "⌫" ? "text-ink-muted hover:border-ink-muted/30" : "text-ink hover:border-ki-awakening/40",
            )}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
