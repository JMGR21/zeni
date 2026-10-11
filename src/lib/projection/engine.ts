export type ProjectionLineKind = "income" | "expense";

export type ProjectionLineInput = {
  kind: ProjectionLineKind;
  amount: number; // siempre positivo, en moneda decimal; el signo lo da `kind`
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
  available: number;
  dailyBalance: DailyBalancePoint[];
  firstNegativeDate: Date | null;
  firstBelowBufferDate: Date | null;
  dailySpendAvailable: number | null; // null si `today` no cae dentro del mes evaluado
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
  for (const line of includedLines) {
    if (line.kind === "income") totalIncomeCents += toCents(line.amount);
    else totalExpenseCents += toCents(line.amount);
  }

  const projectedFinalCents = openingBalanceCents + totalIncomeCents - totalExpenseCents;
  // El colchón es un solo corte para todo el mes (porcentaje del gasto total
  // proyectado), no un valor que cambia día a día.
  const bufferCents = Math.round((totalExpenseCents * bufferPercent) / 100);
  const availableCents = projectedFinalCents - bufferCents;

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
  };
}
