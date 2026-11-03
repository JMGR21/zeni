// Tipo compartido para las deudas que una herramienta deja fuera de su
// cálculo — usado por `simulate_debt_payoff` y `run_cashflow_simulation`
// para que el modelo pueda avisarle al usuario qué no se contempló, en vez
// de presentar un resultado parcial como si fuera completo.
export type ExcludedDebtReason = "fixed_weekly_not_comparable" | "kueski_aplazo_not_supported" | "no_payment_defined";

export type ExcludedDebt = { name: string; reason: ExcludedDebtReason };
