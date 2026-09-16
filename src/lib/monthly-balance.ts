// "Colchón": si un mes/periodo cierra en negativo, el Saldo Disponible que
// el usuario ya tenía acumulado AL FINAL del mes/periodo anterior (ver
// `getAvailableBalanceAsOf` en `total-balance.ts`) cubre el bache — no un
// ingreso marcado a mano. Si no hay suficiente saldo disponible, cubre solo
// lo que alcance; nunca convierte un mes malo en uno positivo.
export function computeNetBalanceWithCushion(
  rawBalance: number,
  availableBalanceEndOfPreviousPeriod: number,
): number {
  if (rawBalance >= 0) return rawBalance;
  const cushionApplied = Math.min(Math.abs(rawBalance), Math.max(0, availableBalanceEndOfPreviousPeriod));
  return rawBalance + cushionApplied;
}
