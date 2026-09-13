import Link from "next/link";
import { GiDragonHead } from "react-icons/gi";
import { AddTransactionDialog, type DragonOption, type TransactionCategory } from "@/components/add-transaction-dialog";
import { AppHeader } from "@/components/app-header";
import { AuraIcon } from "@/components/aura-icon";
import { KiGauge } from "@/components/ki-gauge";
import { LevelBadge } from "@/components/level-badge";
import { RecentTransactions, type RecentTransaction } from "@/components/recent-transactions";
import { TransformationOverlay } from "@/components/transformation-overlay";
import { getKiLevel } from "@/lib/ki";
import { awardMonthlyXp, calculateKi } from "@/lib/ki-engine";
import { getLevelFromXp } from "@/lib/level";
import { getTotalXp } from "@/lib/grant-xp";
import { createClient } from "@/lib/supabase/server";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function monthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { start, end } = monthRange(new Date());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: monthTransactions }, { data: recentTransactions }, { data: categories }, { data: dragons }, kiResult] =
    await Promise.all([
      supabase.from("transactions").select("type, amount").gte("occurred_on", start).lt("occurred_on", end),
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
      supabase.from("dragons").select("id, name").eq("status", "active").order("name").returns<DragonOption[]>(),
      user ? calculateKi(user.id) : Promise.resolve(null),
    ]);

  let transformationJustHappened = false;
  if (user && kiResult) {
    await supabase.from("ki_scores").upsert(
      {
        user_id: user.id,
        year_month: start,
        score: kiResult.score,
        level_label: kiResult.level.label,
      },
      { onConflict: "user_id,year_month" },
    );
    const monthlyXp = await awardMonthlyXp(user.id, kiResult.level.label);
    transformationJustHappened = monthlyXp.transformationJustHappened;
  }

  const totalXp = user ? await getTotalXp(supabase, user.id) : 0;
  const levelInfo = getLevelFromXp(totalXp);

  const income = (monthTransactions ?? [])
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = (monthTransactions ?? [])
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = income - expenses;

  const kiScore = kiResult?.score ?? 0;
  const kiLevel = getKiLevel(kiScore);

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="dashboard" />

      <section className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AuraIcon color={`var(--color-${kiLevel.colorToken})`} size={380} />
        </div>
        <KiGauge score={kiScore} size={220} />
        <p className="font-mono text-3xl text-ink">
          {currencyFormatter.format(balance)}
        </p>
        <p className="text-sm text-ink-muted">Saldo actual</p>

        <div className="w-full max-w-xs">
          <LevelBadge
            level={levelInfo.level}
            xpIntoLevel={levelInfo.xpIntoLevel}
            xpForNextLevel={levelInfo.xpForNextLevel}
            totalXp={totalXp}
          />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Este mes
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-ink-muted/10 pb-2">
              <dt className="text-sm text-ink-muted">Ingresos</dt>
              <dd className="font-mono text-sm text-ink">
                {currencyFormatter.format(income)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-ink-muted/10 pb-2">
              <dt className="text-sm text-ink-muted">Gastos</dt>
              <dd className="font-mono text-sm text-ink">
                {currencyFormatter.format(expenses)}
              </dd>
            </div>
            <div className="flex items-center justify-between pb-2">
              <dt className="text-sm text-ink-muted">Balance</dt>
              <dd className="font-mono text-sm text-ink">
                {currencyFormatter.format(balance)}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            <GiDragonHead className="size-3.5 text-ki-awakening" aria-hidden="true" />
            Dragones activos
          </h2>
          <p className="mt-4 text-sm text-ink-muted">
            Próximamente — fase 4.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
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
          dragons={dragons ?? []}
        />
      </section>

      <AddTransactionDialog categories={categories ?? []} dragons={dragons ?? []} />
      <TransformationOverlay
        active={transformationJustHappened}
        levelLabel={kiLevel.label}
        colorToken={kiLevel.colorToken}
      />
    </div>
  );
}
