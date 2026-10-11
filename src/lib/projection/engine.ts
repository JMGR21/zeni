export type ProjectionLineKind = "income" | "expense";

export type ProjectionLineInput = {
  kind: ProjectionLineKind;
  amount: number; // presupuesto — siempre positivo, en moneda decimal; el signo lo da `kind`
  actualAmount?: number | null; // gasto/ingreso real; null/undefined = "todavía no sucede", no "ya sucedió por $0"
  expectedDate: Date;
  included: boolean;
};

export type ProjectionScenarioInput = {
  month: Date; // cualquier fecha dentro del mes a evaluar
  openingBalance: number;
  bufferPercent: number;
  lines: ProjectionLineInput[];
};

export type DailyBalancePoint = {
  date: Date;
  balance: number;
};

export type ProjectionResult = {
  totalIncome: number;
  totalExpense: number;
  projectedFinal: number;
  buffer: number;
  available: number; // "Libre final" — disponible proyectado con el presupuesto completo del mes
  dailyBalance: DailyBalancePoint[];
  firstNegativeDate: Date | null;
  firstBelowBufferDate: Date | null;
  dailySpendAvailable: number | null; // null si `today` no cae dentro del mes evaluado
  totalIncomeActual: number;
  totalExpenseActual: number;
  projectedFinalActual: number;
  availableActual: number; // "Libre actual" — mismo colchón que `available`, pero con lo YA ocurrido (líneas sin `actualAmount` no suman)
};

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Motor puro de la proyección mensual. Sin Supabase ni React — corre sobre
 * centavos (enteros) para evitar errores de punto flotante (0.1 + 0.2) y
 * solo convierte a decimal en la salida.
 */
export function computeProjection(input: ProjectionScenarioInput, today: Date = new Date()): ProjectionResult {
  const { month, openingBalance, bufferPercent, lines } = input;
  const includedLines = lines.filter((line) => line.included);

  const openingBalanceCents = toCents(openingBalance);
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let totalIncomeActualCents = 0;
  let totalExpenseActualCents = 0;
  for (const line of includedLines) {
    const actualCents = line.actualAmount != null ? toCents(line.actualAmount) : 0;
    if (line.kind === "income") {
      totalIncomeCents += toCents(line.amount);
      totalIncomeActualCents += actualCents;
    } else {
      totalExpenseCents += toCents(line.amount);
      totalExpenseActualCents += actualCents;
    }
  }

  const projectedFinalCents = openingBalanceCents + totalIncomeCents - totalExpenseCents;
  // El colchón es un solo corte para todo el mes (porcentaje del gasto total
  // proyectado), no un valor que cambia día a día — y es el MISMO colchón
  // para "Libre final" y "Libre actual" (es un margen de seguridad fijo
  // sobre el plan completo, no algo que deba encogerse solo porque todavía
  // no se ha gastado todo lo presupuestado).
  const bufferCents = Math.round((totalExpenseCents * bufferPercent) / 100);
  const availableCents = projectedFinalCents - bufferCents;

  const projectedFinalActualCents = openingBalanceCents + totalIncomeActualCents - totalExpenseActualCents;
  const availableActualCents = projectedFinalActualCents - bufferCents;

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const dailyNetCents = new Array<number>(daysInMonth).fill(0);
  for (const line of includedLines) {
    const date = line.expectedDate;
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const dayIndex = date.getDate() - 1;
    dailyNetCents[dayIndex] += line.kind === "income" ? toCents(line.amount) : -toCents(line.amount);
  }

  const dailyBalance: DailyBalancePoint[] = [];
  let firstNegativeDate: Date | null = null;
  let firstBelowBufferDate: Date | null = null;
  let runningCents = openingBalanceCents;

  for (let day = 0; day < daysInMonth; day++) {
    runningCents += dailyNetCents[day];
    const date = new Date(year, monthIndex, day + 1);
    dailyBalance.push({ date, balance: fromCents(runningCents) });
    if (firstNegativeDate === null && runningCents < 0) firstNegativeDate = date;
    if (firstBelowBufferDate === null && runningCents < bufferCents) firstBelowBufferDate = date;
  }

  let dailySpendAvailable: number | null = null;
  if (sameMonth(today, month)) {
    const daysRemaining = daysInMonth - today.getDate() + 1;
    dailySpendAvailable = fromCents(availableCents) / daysRemaining;
  }

  return {
    totalIncome: fromCents(totalIncomeCents),
    totalExpense: fromCents(totalExpenseCents),
    projectedFinal: fromCents(projectedFinalCents),
    buffer: fromCents(bufferCents),
    available: fromCents(availableCents),
    dailyBalance,
    firstNegativeDate,
    firstBelowBufferDate,
    dailySpendAvailable,
    totalIncomeActual: fromCents(totalIncomeActualCents),
    totalExpenseActual: fromCents(totalExpenseActualCents),
    projectedFinalActual: fromCents(projectedFinalActualCents),
    availableActual: fromCents(availableActualCents),
  };
}
