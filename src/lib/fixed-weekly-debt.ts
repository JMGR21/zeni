export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export type FixedWeeklyDebtTotals = {
  targetAmount: number;
  currentAmount: number;
  installmentsRemaining: number;
  totalInterest: number;
};

/**
 * Deuda de plazo fijo semanal: cada pago es de monto fijo, así que
 * `current_amount / target_amount` en pesos ya equivale exactamente a
 * "pagos realizados / pagos totales" — no hace falta una columna separada
 * de "semanas pagadas".
 */
export function computeFixedWeeklyTotals({
  principalAmount,
  weeklyPayment,
  totalInstallments,
  installmentsPaid,
}: {
  principalAmount: number;
  weeklyPayment: number;
  totalInstallments: number;
  installmentsPaid: number;
}): FixedWeeklyDebtTotals {
  const targetAmount = weeklyPayment * totalInstallments;
  const currentAmount = installmentsPaid * weeklyPayment;
  return {
    targetAmount,
    currentAmount,
    installmentsRemaining: totalInstallments - installmentsPaid,
    totalInterest: targetAmount - principalAmount,
  };
}

export function deriveInstallmentsPaid(currentAmount: number, weeklyPayment: number): number {
  if (weeklyPayment <= 0) return 0;
  return Math.round(currentAmount / weeklyPayment);
}

/**
 * Ahorro de liquidar hoy vs. seguir pagando hasta el final del plazo.
 * Positivo = liquidar hoy es más barato que seguir pagando semana a semana.
 */
export function computePayoffTodaySavings({
  weeklyPayment,
  installmentsRemaining,
  payoffTodayAmount,
}: {
  weeklyPayment: number;
  installmentsRemaining: number;
  payoffTodayAmount: number;
}): number {
  const remainingIfPaidOnSchedule = installmentsRemaining * weeklyPayment;
  return remainingIfPaidOnSchedule - payoffTodayAmount;
}
