// Tramos de XP semanal según CLAUDE.md, de mayor a menor para que el
// primer match sea siempre el tramo correcto.
const WEEKLY_XP_TIERS: readonly { minDays: number; amount: number }[] = [
  { minDays: 6, amount: 90 },
  { minDays: 4, amount: 50 },
  { minDays: 2, amount: 25 },
  { minDays: 1, amount: 10 },
];

export function getWeeklyXpTierAmount(activeDays: number): number {
  return WEEKLY_XP_TIERS.find((tier) => activeDays >= tier.minDays)?.amount ?? 0;
}

export type WeeklyXpAction = { kind: "insert" | "update"; amount: number } | { kind: "none" };

/**
 * El bono semanal puede "subir de tramo" durante la semana sin volver a dar
 * el XP completo de un tramo ya otorgado: si ya existe una fila para esta
 * semana con un monto menor al tramo actual, se actualiza (no se otorga un
 * segundo evento). `existingAmount` es null si todavía no hay fila para
 * esta semana.
 */
export function resolveWeeklyXpAction(existingAmount: number | null, tierAmount: number): WeeklyXpAction {
  if (tierAmount <= 0) return { kind: "none" };
  if (existingAmount === null) return { kind: "insert", amount: tierAmount };
  if (existingAmount < tierAmount) return { kind: "update", amount: tierAmount };
  return { kind: "none" };
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Lunes de la semana (lunes a domingo) a la que pertenece `date`.
export function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 = domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
}

export function toISODateString(date: Date): string {
  return toISODate(date);
}

export function getWeekDedupeKey(date: Date): string {
  return `week:${toISODate(getWeekStart(date))}`;
}
