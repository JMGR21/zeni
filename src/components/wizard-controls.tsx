"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

export function WizardProgress({
  steps,
  step,
  maxReached,
  onJump,
}: {
  steps: readonly string[];
  step: number;
  maxReached: number;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, index) => {
        const reached = index <= maxReached;
        const active = index === step;
        return (
          <button
            key={label}
            type="button"
            disabled={!reached}
            onClick={() => onJump(index)}
            aria-label={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors disabled:cursor-not-allowed",
              active ? "bg-ki-awakening" : reached ? "bg-ki-awakening/40" : "bg-ink-muted/15",
            )}
          />
        );
      })}
    </div>
  );
}

export function WizardStepHeader({
  label,
  step,
  onBack,
}: {
  label: string;
  step: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {step > 0 && (
        <button
          type="button"
          aria-label="Atrás"
          onClick={onBack}
          className="flex size-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      <span className="text-xs font-medium tracking-widest text-ink-muted uppercase">{label}</span>
    </div>
  );
}

export function WizardSummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-ink">{value}</span>
        <button type="button" onClick={onEdit} className="text-xs text-ki-awakening hover:underline">
          Editar
        </button>
      </div>
    </div>
  );
}
