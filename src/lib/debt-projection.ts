export type DebtProjectionInput = {
  pendingBalance: number;
  annualRate: number | null;
  minimumPayment: number | null;
  extraPayment: number;
};

export type DebtProjection =
  | { status: "no_payment" }
  | { status: "not_payable"; minimumExtraNeeded: number }
  | { status: "payable"; months: number; totalInterest: number };

export function projectDebt({
  pendingBalance,
  annualRate,
  minimumPayment,
  extraPayment,
}: DebtProjectionInput): DebtProjection {
  const monthlyPayment = (minimumPayment ?? 0) + extraPayment;
  if (monthlyPayment <= 0) return { status: "no_payment" };

  if (pendingBalance <= 0) return { status: "payable", months: 0, totalInterest: 0 };

  const monthlyRate = annualRate ? annualRate / 100 / 12 : 0;

  if (monthlyRate === 0) {
    const months = Math.ceil(pendingBalance / monthlyPayment);
    return { status: "payable", months, totalInterest: 0 };
  }

  const monthlyInterest = monthlyRate * pendingBalance;
  if (monthlyInterest >= monthlyPayment) {
    return { status: "not_payable", minimumExtraNeeded: monthlyInterest - monthlyPayment + 50 };
  }

  const months = Math.ceil(-Math.log(1 - monthlyInterest / monthlyPayment) / Math.log(1 + monthlyRate));
  const totalInterest = monthlyPayment * months - pendingBalance;
  return { status: "payable", months, totalInterest };
}
