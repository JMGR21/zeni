"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@tremor/react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { runCashflowSimulation, type SimulationInput } from "@/lib/cashflow-simulation";

type BaseSimulationInput = Omit<SimulationInput, "horizonMonths">;

const HORIZON_OPTIONS = [
  { label: "1 mes", months: 1 },
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "12 meses", months: 12 },
  { label: "2 años", months: 24 },
  { label: "5 años", months: 60 },
  { label: "10 años", months: 120 },
] as const;

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

function SwitchRow({
  title,
  subtitle,
  subtitleClassName,
  checked,
  onCheckedChange,
  ariaLabel,
  children,
}: {
  title: string;
  subtitle: string;
  subtitleClassName?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-ink-muted/10 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-ink">{title}</p>
        <p className={cn("font-mono text-xs text-ink-muted", subtitleClassName)}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={ariaLabel} />
      </div>
    </div>
  );
}

/**
 * Todo el recálculo corre en el cliente vía `runCashflowSimulation` (motor
 * puro, sin Supabase) — mover un interruptor o cambiar el horizonte nunca
 * hace un round-trip al servidor.
 */
export function CashflowSimulator({ baseInput }: { baseInput: BaseSimulationInput }) {
  const [horizonMonths, setHorizonMonths] = useState<number>(12);

  const [recurringEnabled, setRecurringEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(baseInput.recurringItems.map((item) => [item.id, item.enabled])),
  );
  const [weeklyDebtEnabled, setWeeklyDebtEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(baseInput.fixedWeeklyDebts.map((debt) => [debt.id, debt.enabled])),
  );
  const [otherDebtEnabled, setOtherDebtEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(baseInput.otherDebts.map((debt) => [debt.id, debt.enabled])),
  );
  const [savingsEnabled, setSavingsEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(baseInput.savingsDragons.map((dragon) => [dragon.id, dragon.enabled])),
  );
  const [savingsAmount, setSavingsAmount] = useState<Record<string, number>>(() =>
    Object.fromEntries(baseInput.savingsDragons.map((dragon) => [dragon.id, dragon.suggestedMonthlyAmount])),
  );

  const result = useMemo(() => {
    const input: SimulationInput = {
      startingAvailableBalance: baseInput.startingAvailableBalance,
      horizonMonths,
      recurringItems: baseInput.recurringItems.map((item) => ({
        ...item,
        enabled: recurringEnabled[item.id] ?? item.enabled,
      })),
      fixedWeeklyDebts: baseInput.fixedWeeklyDebts.map((debt) => ({
        ...debt,
        enabled: weeklyDebtEnabled[debt.id] ?? debt.enabled,
      })),
      otherDebts: baseInput.otherDebts.map((debt) => ({
        ...debt,
        enabled: otherDebtEnabled[debt.id] ?? debt.enabled,
      })),
      savingsDragons: baseInput.savingsDragons.map((dragon) => ({
        ...dragon,
        enabled: savingsEnabled[dragon.id] ?? dragon.enabled,
        customMonthlyAmount: savingsAmount[dragon.id] ?? dragon.suggestedMonthlyAmount,
      })),
    };
    return runCashflowSimulation(input);
  }, [baseInput, horizonMonths, recurringEnabled, weeklyDebtEnabled, otherDebtEnabled, savingsEnabled, savingsAmount]);

  const chartData = result.months.map((month) => ({
    mes: `Mes ${month.monthIndex + 1}`,
    "Saldo proyectado": Math.round(month.endingBalance),
    "Referencia $0": 0,
  }));

  const hasDebts = baseInput.fixedWeeklyDebts.length > 0 || baseInput.otherDebts.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Horizonte</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {HORIZON_OPTIONS.map((option) => (
            <button
              key={option.months}
              type="button"
              onClick={() => setHorizonMonths(option.months)}
              aria-pressed={horizonMonths === option.months}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                horizonMonths === option.months
                  ? "border-ki-awakening bg-ki-awakening text-void"
                  : "border-ink-muted/15 text-ink-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Recurrentes
          </h2>
          <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
            {baseInput.recurringItems.length > 0 ? (
              baseInput.recurringItems.map((item) => {
                const enabled = recurringEnabled[item.id] ?? item.enabled;
                return (
                  <SwitchRow
                    key={item.id}
                    title={item.name}
                    subtitle={currencyFormatter.format(item.amount)}
                    subtitleClassName={item.type === "income" ? "text-ki-saiyan" : "text-ki-warrior"}
                    checked={enabled}
                    onCheckedChange={(checked) => setRecurringEnabled((prev) => ({ ...prev, [item.id]: checked }))}
                    ariaLabel={`${enabled ? "Desactivar" : "Activar"} ${item.name} en la simulación`}
                  />
                );
              })
            ) : (
              <p className="py-3 text-sm text-ink-muted">No tienes movimientos recurrentes activos.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Dragones de deuda
          </h2>
          <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
            {hasDebts ? (
              <>
                {baseInput.fixedWeeklyDebts.map((debt) => {
                  const enabled = weeklyDebtEnabled[debt.id] ?? debt.enabled;
                  return (
                    <SwitchRow
                      key={debt.id}
                      title={debt.name}
                      subtitle={`${currencyFormatter.format(debt.weeklyPayment * debt.remainingInstallments)} pendiente`}
                      checked={enabled}
                      onCheckedChange={(checked) => setWeeklyDebtEnabled((prev) => ({ ...prev, [debt.id]: checked }))}
                      ariaLabel={`${enabled ? "Desactivar" : "Activar"} ${debt.name} en la simulación`}
                    />
                  );
                })}
                {baseInput.otherDebts.map((debt) => {
                  const enabled = otherDebtEnabled[debt.id] ?? debt.enabled;
                  return (
                    <SwitchRow
                      key={debt.id}
                      title={debt.name}
                      subtitle={`${currencyFormatter.format(debt.pendingBalance)} pendiente`}
                      checked={enabled}
                      onCheckedChange={(checked) => setOtherDebtEnabled((prev) => ({ ...prev, [debt.id]: checked }))}
                      ariaLabel={`${enabled ? "Desactivar" : "Activar"} ${debt.name} en la simulación`}
                    />
                  );
                })}
              </>
            ) : (
              <p className="py-3 text-sm text-ink-muted">No tienes Dragones de deuda activos.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Dragones de ahorro
          </h2>
          <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
            {baseInput.savingsDragons.length > 0 ? (
              baseInput.savingsDragons.map((dragon) => {
                const enabled = savingsEnabled[dragon.id] ?? dragon.enabled;
                return (
                  <div
                    key={dragon.id}
                    className="flex flex-col gap-2 border-b border-ink-muted/10 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm text-ink">{dragon.name}</p>
                    <div className="flex items-center gap-3">
                      {enabled && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-ink-muted">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-28"
                            value={savingsAmount[dragon.id] ?? dragon.suggestedMonthlyAmount}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setSavingsAmount((prev) => ({
                                ...prev,
                                [dragon.id]: Number.isFinite(value) ? value : 0,
                              }));
                            }}
                            aria-label={`Monto mensual a simular para ${dragon.name}`}
                          />
                        </div>
                      )}
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => setSavingsEnabled((prev) => ({ ...prev, [dragon.id]: checked }))}
                        aria-label={`${enabled ? "Desactivar" : "Activar"} ${dragon.name} en la simulación`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-3 text-sm text-ink-muted">No tienes Dragones de ahorro activos.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Libre este mes</p>
          <p className="mt-2 font-mono text-2xl text-ink">{currencyFormatter.format(result.freeThisMonth)}</p>
        </div>
        <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Al final del periodo te quedaría
          </p>
          <p className="mt-2 font-mono text-2xl text-ink">
            {currencyFormatter.format(result.endingBalanceAtHorizon)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-5">
        {/* `autoMinValue` deja que el eje Y baje de 0 — con el default de
            Tremor (mínimo fijo en 0) un mes en rojo simplemente se recortaría
            en vez de mostrarse. La serie "Referencia $0" hace de línea de
            referencia horizontal (Tremor no expone un prop de ReferenceLine
            nativo) — ver nota de colores en tailwind.config.js. */}
        <LineChart
          className="h-72"
          data={chartData}
          index="mes"
          categories={["Saldo proyectado", "Referencia $0"]}
          colors={["amber", "gray"]}
          valueFormatter={(value: number) => currencyFormatter.format(value)}
          autoMinValue
          showAnimation
        />
      </div>

      {result.firstNegativeMonth ? (
        <p className="flex items-center gap-2 text-sm text-ki-survival">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          En el mes {result.firstNegativeMonth.monthIndex + 1} de tu proyección tu Saldo Disponible se pondría en
          negativo, alrededor del {dateFormatter.format(result.firstNegativeMonth.startDate)}.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <CircleCheck className="size-4 shrink-0 text-ki-saiyan" aria-hidden="true" />
          No se proyecta ningún mes en negativo dentro de este horizonte.
        </p>
      )}

      <p className="text-xs text-ink-muted">
        Este simulador solo conoce los ingresos que ya registraste como Recurrentes. Si tienes ingresos irregulares
        que no llevas como Recurrente, la proyección se verá más conservadora de lo real.
      </p>
    </div>
  );
}
