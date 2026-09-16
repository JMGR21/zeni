import type { SupabaseClient } from "@supabase/supabase-js";
import { computeActiveStreakDays } from "@/lib/streak";
import { grantAchievement } from "@/lib/grant-achievement";
import { getAverageMonthlyExpense, wasMonthWithinBudget } from "@/lib/budget";
import { getSphereProgress } from "@/lib/spheres";
import { getKiLevelRank } from "@/lib/ki";
import type { AchievementDefinition } from "@/lib/achievements";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// monthsAgo=0 es el mes en curso, monthsAgo=1 el mes calendario anterior,
// etc. Acepta valores negativos para obtener el inicio del mes siguiente.
function monthsAgoStart(from: Date, monthsAgo: number): Date {
  return new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1);
}

/**
 * Intenta otorgar un logro y, si se desbloqueó (no estaba ya otorgado),
 * lo agrega a `unlocked` — así cada evaluador puede devolver la lista de
 * logros recién desbloqueados en esa llamada específica, para que el
 * llamador (Server Action o carga del dashboard) la use para encolar
 * avisos (toasts) del lado del cliente.
 */
async function grantAndCollect(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  unlocked: AchievementDefinition[],
): Promise<void> {
  const result = await grantAchievement(supabase, userId, slug);
  if (result.granted) unlocked.push(result.achievement);
}

// Umbrales de racha de Entrenamiento (Categoría A), de menor a mayor.
const TRAINING_STREAK_THRESHOLDS: readonly { days: number; slug: string }[] = [
  { days: 14, slug: "guerrero-novato" },
  { days: 30, slug: "guerrero-constante" },
  { days: 120, slug: "guerrero-de-acero" },
  { days: 365, slug: "maestro-del-ki" },
];

/**
 * Evalúa los logros de Categoría A (Entrenamiento) tras registrar una
 * transacción: "Primer Ki" (idempotente vía el unique constraint de
 * `user_achievements`, seguro de intentar en cada registro), los umbrales
 * de racha activa alcanzados hasta ahora, y "Segunda Oportunidad"
 * (Categoría K). Devuelve los logros recién desbloqueados en esta llamada.
 */
export async function evaluateTrainingAchievements(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date = new Date(),
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  await grantAndCollect(supabase, userId, "primer-ki", unlocked);

  const { data: rows } = await supabase.from("transactions").select("occurred_on").eq("user_id", userId);

  const activityDates = (rows ?? []).map((row) => new Date(`${row.occurred_on}T00:00:00`));
  const streakDays = computeActiveStreakDays(activityDates, referenceDate);

  for (const threshold of TRAINING_STREAK_THRESHOLDS) {
    if (streakDays >= threshold.days) {
      await grantAndCollect(supabase, userId, threshold.slug, unlocked);
    }
  }

  // "Segunda Oportunidad" (Categoría K): la racha se acaba de reiniciar
  // (streak == 1) y hay actividad de antes de ese reinicio — es decir, no
  // es simplemente el primer día que el usuario usa la app.
  const distinctActivityDays = new Set(activityDates.map(toISODate)).size;
  if (streakDays === 1 && distinctActivityDays > 1) {
    await grantAndCollect(supabase, userId, "segunda-oportunidad", unlocked);
  }

  return unlocked;
}

// Umbrales de meses consecutivos en presupuesto (Categoría B), de menor a
// mayor. El máximo (12) también es el tope de meses que hace falta contar
// hacia atrás.
const BUDGET_STREAK_THRESHOLDS: readonly { months: number; slug: string }[] = [
  { months: 1, slug: "disciplina-saiyan" },
  { months: 3, slug: "disciplina-de-hierro" },
  { months: 6, slug: "disciplina-absoluta" },
  { months: 12, slug: "maestro-del-presupuesto" },
];

async function countConsecutiveWithinBudgetMonths(
  supabase: SupabaseClient,
  userId: string,
  latestMonthStart: Date,
  cap: number,
): Promise<number> {
  let count = 0;
  let cursor = latestMonthStart;
  while (count < cap) {
    const within = await wasMonthWithinBudget(supabase, userId, cursor);
    if (!within) break;
    count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return count;
}

/**
 * Evalúa los logros de Categoría B (Presupuesto): cuenta cuántos meses
 * consecutivos hacia atrás, empezando por `latestMonthStart` (ya confirmado
 * dentro de presupuesto por el llamador), se mantuvieron dentro de
 * presupuesto, y otorga los umbrales alcanzados.
 */
export async function evaluateBudgetStreakAchievements(
  supabase: SupabaseClient,
  userId: string,
  latestMonthStart: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const maxThreshold = BUDGET_STREAK_THRESHOLDS[BUDGET_STREAK_THRESHOLDS.length - 1].months;
  const consecutiveMonths = await countConsecutiveWithinBudgetMonths(supabase, userId, latestMonthStart, maxThreshold);

  for (const threshold of BUDGET_STREAK_THRESHOLDS) {
    if (consecutiveMonths >= threshold.months) {
      await grantAndCollect(supabase, userId, threshold.slug, unlocked);
    }
  }

  return unlocked;
}

/**
 * "Mes de Recuperación" (Categoría K): el mes recién cerrado cumplió
 * presupuesto (ya confirmado por el llamador, `latestMonthStart`) Y el mes
 * inmediato anterior a ese NO lo cumplió.
 */
export async function evaluateBudgetRecoveryAchievement(
  supabase: SupabaseClient,
  userId: string,
  latestMonthStart: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const monthBeforeThat = monthsAgoStart(latestMonthStart, 1);
  const wasMonthBeforeWithinBudget = await wasMonthWithinBudget(supabase, userId, monthBeforeThat);
  if (!wasMonthBeforeWithinBudget) {
    await grantAndCollect(supabase, userId, "mes-de-recuperacion", unlocked);
  }
  return unlocked;
}

async function countDragonsByStatus(
  supabase: SupabaseClient,
  userId: string,
  type: "savings" | "debt",
  status: "active" | "completed",
): Promise<number> {
  const { count } = await supabase
    .from("dragons")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .eq("status", status);
  return count ?? 0;
}

async function countDragonsByType(supabase: SupabaseClient, userId: string, type: "savings" | "debt"): Promise<number> {
  const { count } = await supabase
    .from("dragons")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type);
  return count ?? 0;
}

/**
 * Evalúa las esferas de Categoría C que no distinguen tipo de Dragón:
 * "Primera Esfera" (al menos una esfera nueva se acaba de completar en esta
 * llamada) y "Recolector de Esferas" (7 esferas completadas en total,
 * sumando todos los Dragones del usuario). Se llama desde
 * `sync-dragon-link.ts` junto al XP de esferas ya existente.
 */
export async function evaluateSphereAchievements(
  supabase: SupabaseClient,
  userId: string,
  newlyCompletedCount: number,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  if (newlyCompletedCount > 0) {
    await grantAndCollect(supabase, userId, "primera-esfera", unlocked);
  }

  const { data: dragons } = await supabase
    .from("dragons")
    .select("current_amount, target_amount")
    .eq("user_id", userId);

  const totalSpheres = (dragons ?? []).reduce(
    (sum, dragon) => sum + getSphereProgress(dragon.current_amount, dragon.target_amount).filter(Boolean).length,
    0,
  );
  if (totalSpheres >= 7) {
    await grantAndCollect(supabase, userId, "recolector-de-esferas", unlocked);
  }

  return unlocked;
}

// Umbrales de Dragones de Ahorro completados (Categoría C).
const SAVINGS_COMPLETION_THRESHOLDS: readonly { count: number; slug: string }[] = [
  { count: 1, slug: "guardian-del-tesoro" },
  { count: 3, slug: "boveda-personal" },
  { count: 5, slug: "maestro-del-ahorro" },
];

// Umbrales de "colchón" de un Dragón de ahorro, en múltiplos del gasto
// mensual promedio del usuario (Categoría H).
const EMERGENCY_FUND_THRESHOLDS: readonly { multiplier: number; slug: string }[] = [
  { multiplier: 1, slug: "primer-colchon" },
  { multiplier: 3, slug: "fondo-de-emergencia" },
  { multiplier: 6, slug: "fortaleza-financiera" },
];

// Umbrales de Dragones de Deuda completados (Categoría D).
const DEBT_COMPLETION_THRESHOLDS: readonly { count: number; slug: string }[] = [
  { count: 1, slug: "deuda-liquidada" },
  { count: 3, slug: "cazador-de-deudas" },
];

/**
 * Evalúa los logros de Categoría C (Dragones de Ahorro, además de las
 * esferas de `evaluateSphereAchievements`), Categoría D (Dragones de
 * Deuda) y los umbrales de "colchón" de Categoría H, tras un ajuste de
 * `current_amount`. Se llama desde `adjustDragonAmount` en
 * `sync-dragon-link.ts`, el único punto donde ese monto cambia (abono
 * directo, edición o eliminación de una transacción vinculada).
 */
export async function evaluateDragonProgressAchievements(
  supabase: SupabaseClient,
  userId: string,
  params: {
    dragonType: "savings" | "debt";
    delta: number;
    currentAmount: number;
    targetAmount: number;
    justCompleted: boolean;
  },
): Promise<AchievementDefinition[]> {
  const { dragonType, delta, currentAmount, targetAmount, justCompleted } = params;
  const unlocked: AchievementDefinition[] = [];

  if (dragonType === "debt" && delta > 0) {
    await grantAndCollect(supabase, userId, "primer-golpe", unlocked);
  }

  if (dragonType === "debt" && targetAmount > 0 && currentAmount >= targetAmount * 0.5) {
    await grantAndCollect(supabase, userId, "deuda-bajo-control", unlocked);
  }

  if (dragonType === "savings" && justCompleted) {
    const completedCount = await countDragonsByStatus(supabase, userId, "savings", "completed");
    for (const threshold of SAVINGS_COMPLETION_THRESHOLDS) {
      if (completedCount >= threshold.count) {
        await grantAndCollect(supabase, userId, threshold.slug, unlocked);
      }
    }
  }

  if (dragonType === "savings") {
    const averageExpense = await getAverageMonthlyExpense(supabase, userId);
    if (averageExpense.available) {
      for (const threshold of EMERGENCY_FUND_THRESHOLDS) {
        if (currentAmount >= averageExpense.amount * threshold.multiplier) {
          await grantAndCollect(supabase, userId, threshold.slug, unlocked);
        }
      }
    }
  }

  if (dragonType === "debt" && justCompleted) {
    const [completedCount, activeCount, totalCount] = await Promise.all([
      countDragonsByStatus(supabase, userId, "debt", "completed"),
      countDragonsByStatus(supabase, userId, "debt", "active"),
      countDragonsByType(supabase, userId, "debt"),
    ]);

    for (const threshold of DEBT_COMPLETION_THRESHOLDS) {
      if (completedCount >= threshold.count) {
        await grantAndCollect(supabase, userId, threshold.slug, unlocked);
      }
    }

    if (totalCount >= 1 && activeCount === 0) {
      await grantAndCollect(supabase, userId, "libre-de-cadenas", unlocked);
    }
  }

  return unlocked;
}

// Etiquetas de Ki cuyo primer alcance otorga un logro (Categoría E),
// ordenadas de menor a mayor rango.
const KI_MILESTONE_THRESHOLDS: readonly { label: string; slug: string }[] = [
  { label: "Ki Despertando", slug: "despertar" },
  { label: "Guerrero Z", slug: "guerrero-z" },
  { label: "Super Saiyan", slug: "es-un-super-saiyan" },
  { label: "Super Saiyan 2", slug: "mas-alla-de-un-super-saiyan" },
];

/**
 * Evalúa los logros de Categoría E (Ki) tras calcular y guardar el Ki del
 * mes en curso: los 4 hitos de "primera vez que se alcanza esta etiqueta"
 * (comparando contra el máximo rango histórico ANTES de este mes) y "Fénix
 * Financiero" (tuvo Modo Supervivencia alguna vez antes, y ahora está por
 * encima). Se llama desde `awardMonthlyXp`, ya con la fila de `ki_scores`
 * del mes en curso guardada — `currentMonthKey` se excluye explícitamente
 * del historial para no comparar el mes contra sí mismo.
 */
export async function evaluateKiLevelAchievements(
  supabase: SupabaseClient,
  userId: string,
  currentLevelLabel: string,
  currentMonthKey: string,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const currentRank = getKiLevelRank(currentLevelLabel);
  if (currentRank === null) return unlocked;

  const { data: historyRows } = await supabase
    .from("ki_scores")
    .select("level_label")
    .eq("user_id", userId)
    .lt("year_month", currentMonthKey);

  const historicalRanks = (historyRows ?? [])
    .map((row: { level_label: string }) => getKiLevelRank(row.level_label))
    .filter((rank): rank is number => rank !== null);
  const maxHistoricalRank = historicalRanks.length > 0 ? Math.max(...historicalRanks) : -1;

  for (const threshold of KI_MILESTONE_THRESHOLDS) {
    const thresholdRank = getKiLevelRank(threshold.label);
    if (thresholdRank !== null && currentRank >= thresholdRank && maxHistoricalRank < thresholdRank) {
      await grantAndCollect(supabase, userId, threshold.slug, unlocked);
    }
  }

  const survivalRank = getKiLevelRank("Modo Supervivencia");
  if (survivalRank !== null && historicalRanks.includes(survivalRank) && currentRank > survivalRank) {
    await grantAndCollect(supabase, userId, "fenix-financiero", unlocked);
  }

  return unlocked;
}

const PHOENIX_RECOVERY_TARGET = 3;

/**
 * "Ave Fénix (x3)" (Categoría K): cuenta cuántas veces, a lo largo de todo
 * el historial de `ki_scores`, la etiqueta pasó de "Modo Supervivencia" a
 * cualquier etiqueta superior en el mes calendario INMEDIATO siguiente
 * (cada transición cuenta una vez; un salto sobre un mes sin registro no
 * cuenta, ya que ese mes no tiene fila en `ki_scores` para comparar). Se
 * llama desde `awardMonthlyXp`, junto a `evaluateKiLevelAchievements`.
 */
export async function evaluatePhoenixRecoveryAchievement(
  supabase: SupabaseClient,
  userId: string,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const survivalRank = getKiLevelRank("Modo Supervivencia");
  if (survivalRank === null) return unlocked;

  const { data: rows } = await supabase
    .from("ki_scores")
    .select("year_month, level_label")
    .eq("user_id", userId)
    .returns<{ year_month: string; level_label: string }[]>();
  if (!rows || rows.length === 0) return unlocked;

  const labelByMonth = new Map(rows.map((row) => [row.year_month.slice(0, 7), row.level_label]));

  let recoveries = 0;
  for (const row of rows) {
    if (getKiLevelRank(row.level_label) !== survivalRank) continue;
    const monthDate = new Date(`${row.year_month.slice(0, 7)}-01T00:00:00`);
    const nextMonthKey = toISODate(monthsAgoStart(monthDate, -1)).slice(0, 7);
    const nextRank = labelByMonth.has(nextMonthKey) ? getKiLevelRank(labelByMonth.get(nextMonthKey)!) : null;
    if (nextRank !== null && nextRank > survivalRank) {
      recoveries += 1;
    }
  }

  if (recoveries >= PHOENIX_RECOVERY_TARGET) {
    await grantAndCollect(supabase, userId, "ave-fenix-x3", unlocked);
  }

  return unlocked;
}

// Umbrales de Transformaciones acumuladas (Categoría F).
const TRANSFORMATION_THRESHOLDS: readonly { count: number; slug: string }[] = [
  { count: 1, slug: "primera-transformacion" },
  { count: 3, slug: "ciclo-de-evolucion" },
  { count: 10, slug: "evolucion-constante" },
];

/**
 * Evalúa los logros de Categoría F (Transformaciones) contando el total de
 * eventos de XP tipo `transformation` del usuario. Se llama desde
 * `awardMonthlyXp` solo cuando `grantXp` acaba de otorgar una Transformación
 * nueva (el conteo no cambia si no hubo una).
 */
export async function evaluateTransformationAchievements(
  supabase: SupabaseClient,
  userId: string,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const { count } = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "transformation");
  const transformationCount = count ?? 0;

  for (const threshold of TRANSFORMATION_THRESHOLDS) {
    if (transformationCount >= threshold.count) {
      await grantAndCollect(supabase, userId, threshold.slug, unlocked);
    }
  }

  return unlocked;
}

// Umbrales de Nivel (Categoría G).
const LEVEL_THRESHOLDS: readonly { level: number; slug: string }[] = [
  { level: 5, slug: "guerrero-nivel-5" },
  { level: 10, slug: "guerrero-nivel-10" },
  { level: 25, slug: "leyenda-nivel-25" },
];

const ACCOUNT_ANNIVERSARY_DAYS = 365;

/**
 * Evalúa los logros de Categoría G (Generales): umbrales de Nivel ya
 * calculado, y antigüedad de la cuenta (`profiles.created_at`). Se llama
 * desde el dashboard, junto a `getLevelFromXp`.
 */
export async function evaluateGeneralAchievements(
  supabase: SupabaseClient,
  userId: string,
  level: number,
  referenceDate: Date = new Date(),
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  for (const threshold of LEVEL_THRESHOLDS) {
    if (level >= threshold.level) {
      await grantAndCollect(supabase, userId, threshold.slug, unlocked);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle<{ created_at: string }>();

  if (profile?.created_at) {
    const daysSinceCreation = Math.floor(
      (referenceDate.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreation >= ACCOUNT_ANNIVERSARY_DAYS) {
      await grantAndCollect(supabase, userId, "un-anio-de-entrenamiento", unlocked);
    }
  }

  return unlocked;
}

async function getMonthlyIncomeExpense(
  supabase: SupabaseClient,
  userId: string,
  monthStart: Date,
): Promise<{ income: number; expense: number }> {
  const start = toISODate(monthStart);
  const end = toISODate(monthsAgoStart(monthStart, -1));

  const { data } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  let income = 0;
  let expense = 0;
  for (const row of data ?? []) {
    if (row.type === "income") income += row.amount;
    else expense += row.amount;
  }
  return { income, expense };
}

/**
 * "Sobre el Mínimo" (Categoría H): algún Dragón de deuda activo con
 * `minimum_payment` definido superó ese mínimo en abonos durante cada uno
 * de los últimos 3 meses calendario completos. Una sola consulta a
 * `dragon_contributions` para los Dragones elegibles, agrupada por
 * Dragón+mes en memoria, en vez de una consulta por Dragón por mes.
 */
async function evaluateAboveMinimumPayment(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  const { data: activeDebts } = await supabase
    .from("dragons")
    .select("id, minimum_payment")
    .eq("user_id", userId)
    .eq("type", "debt")
    .eq("status", "active")
    .not("minimum_payment", "is", null)
    .returns<{ id: string; minimum_payment: number | null }[]>();

  const eligibleDragons = (activeDebts ?? []).filter(
    (dragon): dragon is { id: string; minimum_payment: number } => dragon.minimum_payment !== null,
  );
  if (eligibleDragons.length === 0) return unlocked;

  const windowStart = toISODate(monthsAgoStart(referenceDate, 3));
  const windowEnd = toISODate(monthsAgoStart(referenceDate, 0));

  const { data: contributions } = await supabase
    .from("dragon_contributions")
    .select("dragon_id, amount, created_at")
    .eq("user_id", userId)
    .in(
      "dragon_id",
      eligibleDragons.map((dragon) => dragon.id),
    )
    .gte("created_at", windowStart)
    .lt("created_at", windowEnd);

  const totalsByDragonMonth = new Map<string, number>();
  for (const row of contributions ?? []) {
    const key = `${row.dragon_id}:${row.created_at.slice(0, 7)}`;
    totalsByDragonMonth.set(key, (totalsByDragonMonth.get(key) ?? 0) + row.amount);
  }

  const monthKeys = [1, 2, 3].map((monthsAgo) => toISODate(monthsAgoStart(referenceDate, monthsAgo)).slice(0, 7));

  const qualifies = eligibleDragons.some((dragon) =>
    monthKeys.every((monthKey) => (totalsByDragonMonth.get(`${dragon.id}:${monthKey}`) ?? 0) > dragon.minimum_payment),
  );

  if (qualifies) {
    await grantAndCollect(supabase, userId, "sobre-el-minimo", unlocked);
  }

  return unlocked;
}

/** "Equilibrio" (Categoría H): balance positivo en los últimos 3 meses calendario completos. */
async function evaluatePositiveBalanceStreak(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const months = [1, 2, 3].map((monthsAgo) => monthsAgoStart(referenceDate, monthsAgo));
  const totals = await Promise.all(months.map((month) => getMonthlyIncomeExpense(supabase, userId, month)));

  if (totals.every(({ income, expense }) => income - expense > 0)) {
    await grantAndCollect(supabase, userId, "equilibrio", unlocked);
  }

  return unlocked;
}

/**
 * "Doble Frente" (Categoría H): algún mes calendario (cualquiera, no solo
 * el más reciente) tuvo al menos un abono a un Dragón `savings` Y a uno
 * `debt`. Nota de rendimiento: a diferencia de los demás chequeos de esta
 * categoría (ventana de 3 meses), este escanea TODO el historial de
 * `dragon_contributions` — candidato a optimizar si el historial crece
 * mucho (ej. cachear el primer mes en que ya se cumplió, una vez otorgado).
 */
async function evaluateDoubleFront(supabase: SupabaseClient, userId: string): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  const [{ data: contributions }, { data: dragonsList }] = await Promise.all([
    supabase.from("dragon_contributions").select("dragon_id, created_at").eq("user_id", userId),
    supabase.from("dragons").select("id, type").eq("user_id", userId).returns<{ id: string; type: "savings" | "debt" }[]>(),
  ]);

  const typeById = new Map((dragonsList ?? []).map((dragon) => [dragon.id, dragon.type]));
  const monthsWithSavings = new Set<string>();
  const monthsWithDebt = new Set<string>();

  for (const row of contributions ?? []) {
    const type = typeById.get(row.dragon_id);
    const monthKey = row.created_at.slice(0, 7);
    if (type === "savings") monthsWithSavings.add(monthKey);
    if (type === "debt") monthsWithDebt.add(monthKey);
  }

  const hasDoubleFront = Array.from(monthsWithSavings).some((monthKey) => monthsWithDebt.has(monthKey));
  if (hasDoubleFront) {
    await grantAndCollect(supabase, userId, "doble-frente", unlocked);
  }

  return unlocked;
}

/** "Todo en su Lugar" (Categoría H): el mes calendario recién cerrado tuvo el 100% de sus transacciones categorizadas. */
async function evaluateFullyCategorizedMonth(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const previousMonthStart = monthsAgoStart(referenceDate, 1);
  const start = toISODate(previousMonthStart);
  const end = toISODate(monthsAgoStart(referenceDate, 0));

  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("category_id")
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  if (monthTransactions && monthTransactions.length > 0 && monthTransactions.every((row) => row.category_id !== null)) {
    await grantAndCollect(supabase, userId, "todo-en-su-lugar", unlocked);
  }

  return unlocked;
}

/**
 * "Puertas Cerradas" (Categoría H): 6 meses calendario seguidos sin crear
 * un Dragón de deuda nuevo, Y al menos 6 meses de antigüedad de cuenta
 * (para no otorgarlo de inmediato a alguien nuevo que no ha tenido tiempo
 * de crear uno).
 */
async function evaluateNoNewDebtStreak(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date,
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const sixMonthsAgoStart = monthsAgoStart(referenceDate, 6);
  const windowStart = toISODate(sixMonthsAgoStart);

  const [{ count: recentDebtCount }, { data: profile }] = await Promise.all([
    supabase
      .from("dragons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "debt")
      .gte("created_at", windowStart),
    supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle<{ created_at: string }>(),
  ]);

  const accountOldEnough = Boolean(profile?.created_at && profile.created_at.slice(0, 10) <= windowStart);

  if ((recentDebtCount ?? 0) === 0 && accountOldEnough) {
    await grantAndCollect(supabase, userId, "puertas-cerradas", unlocked);
  }

  return unlocked;
}

/**
 * Evalúa los logros de Categoría H que se calculan en el punto mensual
 * (junto al resto de `awardMonthlyXp`): "Sobre el Mínimo", "Equilibrio",
 * "Doble Frente", "Todo en su Lugar" y "Puertas Cerradas". Los de "colchón"
 * de esta misma categoría (Primer Colchón/Fondo de Emergencia/Fortaleza
 * Financiera) se evalúan aparte, en `evaluateDragonProgressAchievements`,
 * junto al resto de Categoría C/D — ahí es donde cambia `current_amount`.
 */
export async function evaluateHabitAchievements(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date = new Date(),
): Promise<AchievementDefinition[]> {
  const results = await Promise.all([
    evaluateAboveMinimumPayment(supabase, userId, referenceDate),
    evaluatePositiveBalanceStreak(supabase, userId, referenceDate),
    evaluateDoubleFront(supabase, userId),
    evaluateFullyCategorizedMonth(supabase, userId, referenceDate),
    evaluateNoNewDebtStreak(supabase, userId, referenceDate),
  ]);
  return results.flat();
}

/**
 * "Primer Ingreso Extra" y "Múltiples Fuentes" (Categoría I): se evalúan al
 * registrar una transacción de tipo `income`. La categoría "principal" del
 * usuario es la de su transacción de ingreso más antigua.
 */
export async function evaluateIncomeTransactionAchievements(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string | null,
  referenceDate: Date = new Date(),
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];

  if (categoryId) {
    const { data: oldestIncome } = await supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", userId)
      .eq("type", "income")
      .order("occurred_on", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ category_id: string | null }>();

    if (oldestIncome?.category_id && categoryId !== oldestIncome.category_id) {
      await grantAndCollect(supabase, userId, "primer-ingreso-extra", unlocked);
    }
  }

  const start = toISODate(monthsAgoStart(referenceDate, 0));
  const end = toISODate(monthsAgoStart(referenceDate, -1));

  const { data: monthIncome } = await supabase
    .from("transactions")
    .select("category_id")
    .eq("user_id", userId)
    .eq("type", "income")
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  const distinctCategories = new Set(
    (monthIncome ?? []).map((row) => row.category_id).filter((id): id is string => id !== null),
  );
  if (distinctCategories.size >= 3) {
    await grantAndCollect(supabase, userId, "multiples-fuentes", unlocked);
  }

  return unlocked;
}

type MonthlyIncomeStats = { total: number; categoryIds: Set<string> };

async function getMonthlyIncomeStats(supabase: SupabaseClient, userId: string): Promise<Map<string, MonthlyIncomeStats>> {
  const { data } = await supabase
    .from("transactions")
    .select("amount, category_id, occurred_on")
    .eq("user_id", userId)
    .eq("type", "income");

  const stats = new Map<string, MonthlyIncomeStats>();
  for (const row of data ?? []) {
    const monthKey = row.occurred_on.slice(0, 7);
    const entry = stats.get(monthKey) ?? { total: 0, categoryIds: new Set<string>() };
    entry.total += row.amount;
    if (row.category_id) entry.categoryIds.add(row.category_id);
    stats.set(monthKey, entry);
  }
  return stats;
}

/**
 * Evalúa "Mejor Mes", "Ingreso en Ascenso", "Doble Fuente Sostenida" e
 * "Ingreso Duplicado" (Categoría I) contra el mes calendario recién
 * cerrado. Se llama desde `awardMonthlyXp`, junto al resto de logros
 * mensuales.
 *
 * Nota de rendimiento: `getMonthlyIncomeStats` trae TODO el historial de
 * ingresos del usuario en una sola consulta (necesario para "Mejor Mes" e
 * "Ingreso Duplicado", que comparan contra el máximo histórico y el primer
 * mes respectivamente) — junto con "Doble Frente" de Categoría H, es de las
 * consultas más pesadas de este archivo si el historial crece mucho.
 */
export async function evaluateIncomeMonthlyAchievements(
  supabase: SupabaseClient,
  userId: string,
  referenceDate: Date = new Date(),
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const stats = await getMonthlyIncomeStats(supabase, userId);
  if (stats.size === 0) return unlocked;

  const monthKeyFor = (monthsAgo: number) => toISODate(monthsAgoStart(referenceDate, monthsAgo)).slice(0, 7);
  const totalFor = (monthsAgo: number) => stats.get(monthKeyFor(monthsAgo))?.total ?? 0;
  const categoryCountFor = (monthsAgo: number) => stats.get(monthKeyFor(monthsAgo))?.categoryIds.size ?? 0;

  const previousMonthKey = monthKeyFor(1);
  const previousMonthTotal = totalFor(1);

  const priorMonthKeys = Array.from(stats.keys()).filter((key) => key < previousMonthKey);
  if (priorMonthKeys.length > 0) {
    const maxPriorTotal = Math.max(...priorMonthKeys.map((key) => stats.get(key)!.total));
    if (previousMonthTotal > maxPriorTotal) {
      await grantAndCollect(supabase, userId, "mejor-mes", unlocked);
    }
  }

  if (totalFor(1) > totalFor(2) && totalFor(2) > totalFor(3) && totalFor(3) > totalFor(4)) {
    await grantAndCollect(supabase, userId, "ingreso-en-ascenso", unlocked);
  }

  if (categoryCountFor(1) >= 2 && categoryCountFor(2) >= 2 && categoryCountFor(3) >= 2) {
    await grantAndCollect(supabase, userId, "doble-fuente-sostenida", unlocked);
  }

  const firstMonthKey = Array.from(stats.keys()).sort()[0];
  const firstMonthTotal = stats.get(firstMonthKey)?.total ?? 0;
  if (firstMonthKey !== previousMonthKey && firstMonthTotal > 0 && previousMonthTotal >= firstMonthTotal * 2) {
    await grantAndCollect(supabase, userId, "ingreso-duplicado", unlocked);
  }

  return unlocked;
}

const SECRET_AMOUNT_9000 = 9001;
const SECRET_ROUND_MULTIPLE = 1000;
const NIGHT_TRAINING_START_HOUR = 1;
const NIGHT_TRAINING_END_HOUR = 4; // exclusivo
const EARLY_BIRD_HOUR = 5; // exclusivo

/**
 * Evalúa los 4 logros secretos (Categoría L) al registrar una transacción.
 * Los chequeos de hora usan la hora del servidor tal como se guarda (el
 * momento de la petición, equivalente a `created_at`) — no hay conversión
 * de zona horaria por ahora, simplificación aceptable para uso personal.
 */
export async function evaluateSecretAchievements(
  supabase: SupabaseClient,
  userId: string,
  params: { type: "income" | "expense"; amount: number; createdAt: Date },
): Promise<AchievementDefinition[]> {
  const unlocked: AchievementDefinition[] = [];
  const { type, amount, createdAt } = params;
  const hour = createdAt.getHours();

  if (amount === SECRET_AMOUNT_9000) {
    await grantAndCollect(supabase, userId, "esta-sobre-los-9000", unlocked);
  }

  if (hour >= NIGHT_TRAINING_START_HOUR && hour < NIGHT_TRAINING_END_HOUR) {
    await grantAndCollect(supabase, userId, "entrenamiento-nocturno", unlocked);
  }

  if (hour < EARLY_BIRD_HOUR) {
    await grantAndCollect(supabase, userId, "madrugador-saiyan", unlocked);
  }

  if (type === "expense" && amount > 0 && amount % SECRET_ROUND_MULTIPLE === 0) {
    await grantAndCollect(supabase, userId, "numero-redondo", unlocked);
  }

  return unlocked;
}
