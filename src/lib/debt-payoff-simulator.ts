export type DebtPayoffStrategy = "avalanche" | "snowball";

export type DebtPayoffInput = {
  id: string;
  name: string;
  pendingBalance: number;
  monthlyRate: number;
  minimumPayment: number;
  extraPayment: number;
};

export type DebtPayoffResult =
  | { status: "converged"; totalMonths: number; totalInterestPaid: number; payoffOrder: string[] }
  | { status: "not_converged" };

const MAX_MONTHS = 600;

// Simulador puro mes a mes: avalancha ataca primero la tasa más alta,
// bola de nieve el saldo más bajo. El "pool" de pago extra de todas las
// deudas se concentra siempre en la deuda objetivo actual; cuando esa deuda
// se liquida, su pago mínimo se libera y se suma al pool (efecto cascada)
// para atacar la siguiente en el orden de la estrategia.
export function simulateDebtPayoff(debts: DebtPayoffInput[], strategy: DebtPayoffStrategy): DebtPayoffResult {
  if (debts.length === 0) return { status: "converged", totalMonths: 0, totalInterestPaid: 0, payoffOrder: [] };

  const order = [...debts].sort((a, b) =>
    strategy === "avalanche" ? b.monthlyRate - a.monthlyRate : a.pendingBalance - b.pendingBalance,
  );

  const balances = new Map(order.map((debt) => [debt.id, debt.pendingBalance]));
  const paidOff = new Set<string>();
  const payoffOrder: string[] = [];
  const combinedExtraPool = order.reduce((sum, debt) => sum + debt.extraPayment, 0);
  let totalInterestPaid = 0;

  for (const debt of order) {
    if (debt.pendingBalance <= 0) {
      paidOff.add(debt.id);
      payoffOrder.push(debt.name);
    }
  }

  for (let month = 1; month <= MAX_MONTHS; month++) {
    if (paidOff.size === order.length) {
      return { status: "converged", totalMonths: month - 1, totalInterestPaid, payoffOrder };
    }

    for (const debt of order) {
      if (paidOff.has(debt.id)) continue;
      const balance = balances.get(debt.id)!;
      const interest = balance * debt.monthlyRate;
      totalInterestPaid += interest;
      balances.set(debt.id, balance + interest);
    }

    const freedMinimums = order
      .filter((debt) => paidOff.has(debt.id))
      .reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const extraPool = combinedExtraPool + freedMinimums;
    const target = order.find((debt) => !paidOff.has(debt.id));

    for (const debt of order) {
      if (paidOff.has(debt.id)) continue;
      const balance = balances.get(debt.id)!;
      const payment = Math.min(debt.minimumPayment + (debt.id === target?.id ? extraPool : 0), balance);
      const nextBalance = balance - payment;
      balances.set(debt.id, nextBalance);
      if (nextBalance <= 0.005) {
        paidOff.add(debt.id);
        payoffOrder.push(debt.name);
      }
    }
  }

  return { status: "not_converged" };
}
