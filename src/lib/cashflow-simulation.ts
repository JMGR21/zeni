import { computeNextOccurrenceDate, type RecurringFrequency } from "@/lib/recurring-schedule";

export type SimRecurringItem = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  frequency: RecurringFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  nextOccurrenceDate: Date;
  enabled: boolean;
};

export type SimFixedWeeklyDebt = {
  id: string;
  name: string;
  weeklyPayment: number;
  remainingInstallments: number;
  paymentDayOfWeek: number;
  enabled: boolean;
};

export type SimOtherDebt = {
  id: string;
  name: string;
  pendingBalance: number;
  monthlyPayment: number;
  monthlyRate: number | null; // null = plan fijo (Kueski/Aplazo), no genera interés adicional
  enabled: boolean;
};

export type SimSavingsDragon = {
  id: string;
  name: string;
  suggestedMonthlyAmount: number;
  customMonthlyAmount?: number;
  enabled: boolean;
};

export type SimulationInput = {
  startingAvailableBalance: number;
  horizonMonths: number; // 1 a 120
  recurringItems: SimRecurringItem[];
  fixedWeeklyDebts: SimFixedWeeklyDebt[];
  otherDebts: SimOtherDebt[];
  savingsDragons: SimSavingsDragon[];
};

export type MonthProjection = {
  monthIndex: number;
  startDate: Date;
  endDate: Date;
  netFlow: number;
  endingBalance: number;
};

export type SimulationResult = {
  months: MonthProjection[];
  freeThisMonth: number;
  endingBalanceAtHorizon: number;
  firstNegativeMonth: MonthProjection | null;
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Motor puro del simulador de flujo de efectivo. Sin llamadas a Supabase —
 * corre instantáneo en el cliente cada vez que el usuario mueve un
 * interruptor, sin ir al servidor.
 *
 * Simplificación deliberada: cada "mes" es un bloque fijo de 30 días desde
 * hoy (día 0-29 = mes 1, día 30-59 = mes 2, etc.), NO un mes calendario
 * real. Un horizonte de hasta 10 años con meses calendario reales (28-31
 * días, años bisiestos) complicaría la generación de ocurrencias sin
 * aportar precisión real a una proyección que ya es una estimación. No es
 * un bug si un bucket no coincide exactamente con un corte de calendario.
 */
export function runCashflowSimulation(input: SimulationInput): SimulationResult {
  const { startingAvailableBalance, horizonMonths, recurringItems, fixedWeeklyDebts, otherDebts, savingsDragons } =
    input;

  const horizonStart = startOfDay(new Date());

  const recurringCursors = new Map<string, Date>(
    recurringItems.filter((item) => item.enabled).map((item) => [item.id, new Date(item.nextOccurrenceDate)]),
  );
  const weeklyDebtRemaining = new Map<string, number>(
    fixedWeeklyDebts.map((debt) => [debt.id, debt.remainingInstallments]),
  );
  const otherDebtPending = new Map<string, number>(otherDebts.map((debt) => [debt.id, debt.pendingBalance]));

  const months: MonthProjection[] = [];
  let runningBalance = startingAvailableBalance;

  for (let monthIndex = 0; monthIndex < horizonMonths; monthIndex++) {
    const startDate = addDays(horizonStart, monthIndex * 30);
    const endDate = addDays(horizonStart, (monthIndex + 1) * 30 - 1);
    const endExclusive = addDays(endDate, 1);
    let netFlow = 0;

    for (const item of recurringItems) {
      if (!item.enabled) continue;
      let cursor = recurringCursors.get(item.id)!;
      while (cursor.getTime() < endExclusive.getTime()) {
        if (cursor.getTime() >= startDate.getTime()) {
          netFlow += item.type === "income" ? item.amount : -item.amount;
        }
        cursor = computeNextOccurrenceDate(item.frequency, cursor, item.dayOfWeek, item.dayOfMonth);
      }
      recurringCursors.set(item.id, cursor);
    }

    for (const debt of fixedWeeklyDebts) {
      if (!debt.enabled) continue;
      const remaining = weeklyDebtRemaining.get(debt.id)!;
      if (remaining <= 0) continue;

      let occurrences = 0;
      for (let day = 0; day < 30; day++) {
        if (addDays(startDate, day).getDay() === debt.paymentDayOfWeek) occurrences++;
      }
      occurrences = Math.min(occurrences, remaining);

      netFlow -= debt.weeklyPayment * occurrences;
      weeklyDebtRemaining.set(debt.id, remaining - occurrences);
    }

    for (const debt of otherDebts) {
      if (!debt.enabled) continue;
      let pending = otherDebtPending.get(debt.id)!;
      if (pending <= 0) continue;

      if (debt.monthlyRate !== null) {
        pending += pending * debt.monthlyRate;
      }
      const payment = Math.min(debt.monthlyPayment, pending);
      netFlow -= payment;
      otherDebtPending.set(debt.id, pending - payment);
    }

    for (const dragon of savingsDragons) {
      if (!dragon.enabled) continue;
      netFlow -= dragon.customMonthlyAmount ?? dragon.suggestedMonthlyAmount;
    }

    const endingBalance = runningBalance + netFlow;
    months.push({ monthIndex, startDate, endDate, netFlow, endingBalance });
    runningBalance = endingBalance;
  }

  return {
    months,
    freeThisMonth: months[0]?.netFlow ?? 0,
    endingBalanceAtHorizon: months[months.length - 1]?.endingBalance ?? startingAvailableBalance,
    firstNegativeMonth: months.find((month) => month.endingBalance < 0) ?? null,
  };
}
