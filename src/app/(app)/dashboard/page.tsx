import Link from "next/link";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { GiDragonHead } from "react-icons/gi";
import { AddTransactionDialog, type DragonOption, type TransactionCategory } from "@/components/add-transaction-dialog";
import { AchievementToastQueue } from "@/components/achievement-toast-queue";
import { CategorySpendingChart, type CategorySpending } from "@/components/category-spending-chart";
import { DashboardHeader } from "@/components/dashboard-header";
import type { Dragon } from "@/components/dragon-card";
import { DragonsSummary } from "@/components/dragons-summary";
import { BudgetSummary } from "@/components/budget-summary";
import { FiftyThirtyTwentySummary } from "@/components/fifty-thirty-twenty-summary";
import { KiStatTile } from "@/components/ki-stat-tile";
import { LevelBadge } from "@/components/level-badge";
import { PendingRecurringOccurrences, type PendingOccurrence } from "@/components/pending-recurring-occurrences";
import { RecentTransactions, type RecentTransaction } from "@/components/recent-transactions";
import { StatTile, type StatDelta } from "@/components/stat-tile";
import { TransformationOverlay } from "@/components/transformation-overlay";
import { TrendChartCard } from "@/components/trend-chart-card";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getSuggestedBudget, type BudgetCategory } from "@/lib/budget";
import { getDailyQuote } from "@/lib/dbz-quotes";
import { getKiLevel } from "@/lib/ki";
import { awardMonthlyXp, calculateKi } from "@/lib/ki-engine";
import type { KiScorePoint } from "@/components/ki-evolution-chart";
import { getLevelFromXp } from "@/lib/level";
import { getTotalXp } from "@/lib/grant-xp";
import { getMonthlyIncomeExpenseSeries, type MonthlyFlow } from "@/lib/monthly-summary";
import { computeFiftyThirtyTwenty } from "@/lib/fifty-thirty-twenty";
import { computeNetBalanceWithCushion } from "@/lib/monthly-balance";
import { getAvailableBalanceAsOf } from "@/lib/total-balance";
import { computePeriodStart, periodRangeFromStart, parsePeriodISODate, shiftPeriodStart, toISODate } from "@/lib/period";
import { evaluateGeneralAchievements } from "@/lib/achievement-engine";
import type { AchievementDefinition } from "@/lib/achievements";
import { createClient } from "@/lib/supabase/server";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

// Límites del mes calendario REAL (siempre día 1 a fin de mes) — separado
// a propósito del "periodo" configurable de abajo: el motor de Ki/XP/logros
// mensuales (`ki_scores`, `awardMonthlyXp`) siempre corre sobre el mes
// calendario real, nunca sobre el periodo que el usuario esté viendo en el
// dashboard (ver nota en la Fase 10, cuarta pasada, en CLAUDE.md).
function calendarMonthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: toISODate(start), end: toISODate(end) };
}

function buildDelta(
  current: number,
  previous: number,
  direction: StatDelta["direction"],
): StatDelta | null {
  if (previous === 0) return null;
  return { percent: ((current - previous) / Math.abs(previous)) * 100, direction };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const { start: kiMonthStart } = calendarMonthRange(now);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = user
    ? await supabase
        .from("profiles")
        .select("name, month_start_day")
        .eq("id", user.id)
        .maybeSingle<{ name: string | null; month_start_day: number }>()
    : { data: null };

  const monthStartDay = profileRow?.month_start_day ?? 1;
  const currentPeriodStart = computePeriodStart(now, monthStartDay);
  const periodParam = firstParam(params.period);
  const selectedPeriodStart =
    periodParam && ISO_DATE_RE.test(periodParam) ? parsePeriodISODate(periodParam) : currentPeriodStart;
  const { start: periodStartDate, end: periodEndDate } = periodRangeFromStart(selectedPeriodStart, monthStartDay);
  const start = toISODate(periodStartDate);
  const end = toISODate(periodEndDate);
  const isCurrentPeriod = toISODate(selectedPeriodStart) === toISODate(currentPeriodStart);

  const previousPeriodStart = shiftPeriodStart(selectedPeriodStart, monthStartDay, -1);
  const prevStart = toISODate(previousPeriodStart);
  const prevEnd = start;

  const [
    { data: monthTransactions },
    { data: previousMonthTransactions },
    { data: recentTransactions },
    { data: categories },
    { data: dragons },
    { data: budgets },
    kiResult,
    { data: kiHistory },
    { data: pendingOccurrenceRows },
    monthlyFlow,
    { data: latestAchievementRow },
    fiftyThirtyTwentyResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, category_id")
      .gte("occurred_on", start)
      .lt("occurred_on", end),
    supabase
      .from("transactions")
      .select("type, amount")
      .gte("occurred_on", prevStart)
      .lt("occurred_on", prevEnd),
    supabase
      .from("transactions")
      .select("id, type, amount, description, occurred_on, category_id, categories(name), dragon_id, dragons(name)")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<RecentTransaction[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("active", true)
      .order("name")
      .returns<TransactionCategory[]>(),
    supabase
      .from("dragons")
      .select(
        "id, name, type, target_amount, current_amount, status, institution, interest_rate, minimum_payment, extra_payment, priority, payment_schedule, principal_amount, weekly_payment, total_installments, payment_day_of_week, disbursement_date, payoff_today_amount, payoff_today_updated_at",
      )
      .eq("status", "active")
      .order("name")
      .returns<Dragon[]>(),
    supabase.from("budgets").select("category_id, amount").returns<{ category_id: string; amount: number }[]>(),
    user ? calculateKi(user.id) : Promise.resolve(null),
    supabase.from("ki_scores").select("year_month, score").order("year_month", { ascending: true }).returns<KiScorePoint[]>(),
    supabase
      .from("recurring_transaction_occurrences")
      .select("id, scheduled_date, status, recurring_transactions(name, type, amount)")
      .in("status", ["pending", "insufficient_funds"])
      .order("scheduled_date")
      .returns<
        {
          id: string;
          scheduled_date: string;
          status: "pending" | "insufficient_funds";
          recurring_transactions: { name: string; type: "income" | "expense"; amount: number } | null;
        }[]
      >(),
    user ? getMonthlyIncomeExpenseSeries(supabase, user.id) : Promise.resolve<MonthlyFlow[]>([]),
    user
      ? supabase
          .from("user_achievements")
          .select("achievement_slug, unlocked_at")
          .eq("user_id", user.id)
          .order("unlocked_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ achievement_slug: string; unlocked_at: string }>()
      : Promise.resolve({ data: null }),
    user ? computeFiftyThirtyTwenty(supabase, user.id, now) : Promise.resolve(null),
  ]);

  const pendingOccurrences: PendingOccurrence[] = (pendingOccurrenceRows ?? [])
    .filter((row) => row.recurring_transactions !== null)
    .map((row) => ({
      id: row.id,
      scheduled_date: row.scheduled_date,
      status: row.status,
      name: row.recurring_transactions!.name,
      type: row.recurring_transactions!.type,
      amount: row.recurring_transactions!.amount,
    }));

  let transformationJustHappened = false;
  const newAchievements: AchievementDefinition[] = [];
  if (user && kiResult) {
    await supabase.from("ki_scores").upsert(
      {
        user_id: user.id,
        year_month: kiMonthStart,
        score: kiResult.score,
        level_label: kiResult.level.label,
      },
      { onConflict: "user_id,year_month" },
    );
    const monthlyXp = await awardMonthlyXp(user.id, kiResult.level.label);
    transformationJustHappened = monthlyXp.transformationJustHappened;
    newAchievements.push(...monthlyXp.achievements);
  }

  const totalXp = user ? await getTotalXp(supabase, user.id) : 0;
  const levelInfo = getLevelFromXp(totalXp);
  if (user) {
    newAchievements.push(...(await evaluateGeneralAchievements(supabase, user.id, levelInfo.level)));
  }

  // El logro más reciente prefiere uno recién otorgado en esta misma carga
  // (siempre el más fresco posible) sobre el que ya estaba en la base de
  // datos, cuya consulta corrió antes de que se otorgaran estos.
  const latestAchievement: AchievementDefinition | null =
    newAchievements[newAchievements.length - 1] ??
    (latestAchievementRow ? (ACHIEVEMENTS.find((a) => a.slug === latestAchievementRow.achievement_slug) ?? null) : null);

  const income = (monthTransactions ?? [])
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = (monthTransactions ?? [])
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = income - expenses;

  const prevIncome = (previousMonthTransactions ?? [])
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const prevExpenses = (previousMonthTransactions ?? [])
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const prevBalance = prevIncome - prevExpenses;

  // Colchón: si el periodo cerró en negativo, el Saldo Disponible real que
  // el usuario ya tenía acumulado al FINAL del periodo anterior (no un
  // ingreso marcado a mano) cubre el bache — ver `getAvailableBalanceAsOf`.
  const cutoffDate = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth(), periodStartDate.getDate() - 1);
  const availableBalanceEndOfPreviousPeriod = user ? await getAvailableBalanceAsOf(supabase, user.id, cutoffDate) : 0;
  const netBalance = computeNetBalanceWithCushion(balance, availableBalanceEndOfPreviousPeriod);
  const cushionApplied = balance < 0 ? Math.min(-balance, Math.max(0, availableBalanceEndOfPreviousPeriod)) : 0;
  const uncoveredShortfall = balance < 0 ? -balance - cushionApplied : 0;

  const balanceDelta = buildDelta(balance, prevBalance, "higherIsBetter");
  const incomeDelta = buildDelta(income, prevIncome, "higherIsBetter");
  const expensesDelta = buildDelta(expenses, prevExpenses, "lowerIsBetter");

  const kiScore = kiResult?.score ?? 0;
  const kiLevel = getKiLevel(kiScore);

  const dragonOptions: DragonOption[] = (dragons ?? []).map((dragon) => ({ id: dragon.id, name: dragon.name }));

  const expenseCategories = (categories ?? []).filter((category) => category.type === "expense");
  const customAmountByCategory = new Map((budgets ?? []).map((budget) => [budget.category_id, budget.amount]));
  const spentByCategory = new Map<string, number>();
  for (const transaction of monthTransactions ?? []) {
    if (transaction.type !== "expense" || !transaction.category_id) continue;
    spentByCategory.set(
      transaction.category_id,
      (spentByCategory.get(transaction.category_id) ?? 0) + transaction.amount,
    );
  }
  const budgetCategories: BudgetCategory[] = user
    ? await Promise.all(
        expenseCategories.map(async (category) => ({
          id: category.id,
          name: category.name,
          spent: spentByCategory.get(category.id) ?? 0,
          customAmount: customAmountByCategory.get(category.id) ?? null,
          suggestion: await getSuggestedBudget(supabase, user.id, category.id),
        })),
      )
    : [];

  const categorySpending: CategorySpending[] = expenseCategories
    .map((category) => ({ name: category.name, value: spentByCategory.get(category.id) ?? 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <>
      <DashboardHeader
        name={profileRow?.name ?? null}
        quote={getDailyQuote(now)}
        periodStart={start}
        periodEnd={end}
        monthStartDay={monthStartDay}
        isCurrentPeriod={isCurrentPeriod}
        categories={categories ?? []}
        dragons={dragonOptions}
      />

      <section className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-4 px-6 pt-6 lg:grid-cols-4">
        <StatTile
          icon={<Wallet className="size-3.5" aria-hidden="true" />}
          label="Saldo del periodo"
          value={currencyFormatter.format(balance)}
          delta={balanceDelta}
          deltaLabel="vs. periodo anterior"
          infoTooltip={
            cushionApplied > 0
              ? "Cuando el periodo cierra en negativo, tu Saldo Disponible acumulado hasta el periodo anterior cubre el bache, hasta donde alcance — nunca convierte un mes malo en uno positivo."
              : undefined
          }
          bufferBreakdown={
            cushionApplied > 0
              ? {
                  rawBalance: currencyFormatter.format(balance),
                  covered: `+${currencyFormatter.format(cushionApplied)}`,
                  netBalance: currencyFormatter.format(netBalance),
                  uncovered: uncoveredShortfall > 0 ? currencyFormatter.format(-uncoveredShortfall) : undefined,
                }
              : undefined
          }
        />
        <StatTile
          icon={<TrendingUp className="size-3.5" aria-hidden="true" />}
          label="Ingresos"
          value={currencyFormatter.format(income)}
          delta={incomeDelta}
          deltaLabel="vs. periodo anterior"
        />
        <StatTile
          icon={<TrendingDown className="size-3.5" aria-hidden="true" />}
          label="Gastos"
          value={currencyFormatter.format(expenses)}
          delta={expensesDelta}
          deltaLabel="vs. periodo anterior"
        />
        <KiStatTile score={kiScore} />
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 py-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChartCard monthlyFlow={monthlyFlow} kiHistory={kiHistory ?? []} />
        </div>

        <div className="flex flex-col gap-4">
          <LevelBadge
            level={levelInfo.level}
            xpIntoLevel={levelInfo.xpIntoLevel}
            xpForNextLevel={levelInfo.xpForNextLevel}
            totalXp={totalXp}
            latestAchievement={latestAchievement ? { name: latestAchievement.name, icon: latestAchievement.icon } : null}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
                <GiDragonHead className="size-3.5 text-ki-awakening" aria-hidden="true" />
                Dragones
              </h2>
              <Link href="/dragons" className="text-sm text-ki-awakening hover:underline">
                Ver más
              </Link>
            </div>
            <DragonsSummary dragons={dragons ?? []} variant="compact" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        <CategorySpendingChart data={categorySpending} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Presupuesto
            </h2>
            <Link href="/budget" className="text-sm text-ki-awakening hover:underline">
              Ver más
            </Link>
          </div>
          <BudgetSummary categories={budgetCategories} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Regla 50/30/20
            </h2>
            <Link href="/instruments/50-30-20" className="text-sm text-ki-awakening hover:underline">
              Ver detalle
            </Link>
          </div>
          <FiftyThirtyTwentySummary result={fiftyThirtyTwentyResult} />
        </div>
      </section>

      <PendingRecurringOccurrences occurrences={pendingOccurrences} />

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Movimientos recientes
          </h2>
          <Link href="/transactions" className="text-sm text-ki-awakening hover:underline">
            Ver todos
          </Link>
        </div>
        <RecentTransactions
          transactions={recentTransactions ?? []}
          categories={categories ?? []}
          dragons={dragonOptions}
        />
      </section>

      <AddTransactionDialog categories={categories ?? []} dragons={dragonOptions} />
      <TransformationOverlay
        active={transformationJustHappened}
        levelLabel={kiLevel.label}
        colorToken={kiLevel.colorToken}
      />
      <AchievementToastQueue achievements={newAchievements} />
    </>
  );
}
