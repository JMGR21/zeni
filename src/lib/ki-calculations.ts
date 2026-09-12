export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// -20% de balance = 0 puntos, +20% o más = 100 puntos. Sin ingresos no hay
// forma de confirmar salud financiera, así que se trata como 0.
export function computeBalanceScore(income: number, expense: number): number {
  if (income === 0) return 0;
  const balanceRatio = (income - expense) / income;
  return clamp(((balanceRatio + 0.2) / 0.4) * 100, 0, 100);
}

// 0% de deuda sobre ingreso = 100 puntos, 50%+ = 0 puntos. Igual que el
// balance, sin ingresos no se puede evaluar la carga de deuda de forma
// confiable.
export function computeDebtScore(income: number, debtPayments: number): number {
  if (income === 0) return 0;
  const debtRatio = debtPayments / income;
  return clamp(100 - (debtRatio / 0.5) * 100, 0, 100);
}

export function computeSaludActual(income: number, expense: number, debtPayments: number): number {
  return (computeBalanceScore(income, expense) + computeDebtScore(income, debtPayments)) / 2;
}

export type MomentumInputs = {
  debtContributions: number;
  savingsContributions: number;
  balance: number;
};

// Si el mes anterior fue 0, un salto a positivo es una mejora completa
// (100); quedarse en 0 es neutral (50). Si el mes anterior fue 0 y el
// actual es negativo (solo posible para `balance`), se trata como
// deterioro completo (0) — no lo cubre el prompt original explícitamente,
// pero es la extensión simétrica del caso "0 a positivo = 100".
export function computeChangeScore(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 50;
    return current > 0 ? 100 : 0;
  }
  const pctChange = clamp((current - previous) / Math.abs(previous), -1, 1);
  return 50 + pctChange * 50;
}

export function computeMomentum(current: MomentumInputs, previous: MomentumInputs | null): number {
  if (previous === null) return 50;

  const debtScore = computeChangeScore(current.debtContributions, previous.debtContributions);
  const savingsScore = computeChangeScore(current.savingsContributions, previous.savingsContributions);
  const balanceScore = computeChangeScore(current.balance, previous.balance);

  return (debtScore + savingsScore + balanceScore) / 3;
}

export function computePresupuesto(totalBudget: number, totalSpent: number): number {
  if (totalBudget <= 0) return 50;
  const usedPct = (totalSpent / totalBudget) * 100;
  return clamp(100 - Math.max(0, usedPct - 100) * 2, 0, 100);
}

export function computeConstancia(daysWithTransactions: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return clamp((daysWithTransactions / daysElapsed) * 100, 0, 100);
}

export type KiBreakdown = {
  saludActual: number;
  momentum: number;
  presupuesto: number;
  constancia: number;
};

export function computeFinalScore(breakdown: KiBreakdown): number {
  const raw =
    0.35 * breakdown.saludActual +
    0.35 * breakdown.momentum +
    0.2 * breakdown.presupuesto +
    0.1 * breakdown.constancia;
  return clamp(raw, 0, 100);
}

// Tope de "Ki Dormido" cuando el usuario lleva 2+ meses de balance negativo
// o no cubrió un pago mínimo de deuda.
export function applySafeguard(score: number, safeguardApplied: boolean): number {
  return safeguardApplied ? Math.min(score, 35) : score;
}
