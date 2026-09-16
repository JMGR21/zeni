import { GiDragonHead } from "react-icons/gi";
import { CreateDragonDialog } from "@/components/create-dragon-dialog";
import { DebtStrategyComparison } from "@/components/debt-strategy-comparison";
import { DragonCard, type Dragon } from "@/components/dragon-card";
import { DragonsEmptyState } from "@/components/dragons-empty-state";
import { DragonsProgressChart } from "@/components/dragons-progress-chart";
import { DragonsSummary } from "@/components/dragons-summary";
import { DragonsTabs, type DragonsTab } from "@/components/dragons-tabs";
import { assignMissingPriorities, getAttackOrder } from "@/lib/dragon-priority";
import { createClient } from "@/lib/supabase/server";

type DragonRow = Dragon & { created_at: string };

type SearchParams = { [key: string]: string | string[] | undefined };

function parseTab(value: string | string[] | undefined): DragonsTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "savings" || raw === "debt" ? raw : "general";
}

export default async function DragonsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: dragons }, { data: contributions }] = await Promise.all([
    supabase
      .from("dragons")
      .select(
        "id, name, type, target_amount, current_amount, status, institution, interest_rate, minimum_payment, extra_payment, priority, payment_schedule, principal_amount, weekly_payment, total_installments, payment_day_of_week, disbursement_date, payoff_today_amount, payoff_today_updated_at, created_at",
      )
      .order("created_at", { ascending: true })
      .returns<DragonRow[]>(),
    supabase
      .from("dragon_contributions")
      .select("dragon_id, created_at")
      .order("created_at", { ascending: false })
      .returns<{ dragon_id: string; created_at: string }[]>(),
  ]);

  const lastContributionByDragonId = new Map<string, string>();
  for (const contribution of contributions ?? []) {
    if (!lastContributionByDragonId.has(contribution.dragon_id)) {
      lastContributionByDragonId.set(contribution.dragon_id, contribution.created_at);
    }
  }

  const activeDebts = (dragons ?? []).filter((dragon) => dragon.type === "debt" && dragon.status === "active");

  const assignments = assignMissingPriorities(
    activeDebts.map((dragon) => ({ id: dragon.id, priority: dragon.priority, createdAt: dragon.created_at })),
  );
  if (assignments.length > 0) {
    await Promise.all(
      assignments.map(({ id, priority }) =>
        supabase.from("dragons").update({ priority }).eq("id", id).eq("user_id", user.id),
      ),
    );
    const priorityById = new Map(assignments.map((assignment) => [assignment.id, assignment.priority]));
    for (const dragon of activeDebts) {
      const assigned = priorityById.get(dragon.id);
      if (assigned !== undefined) dragon.priority = assigned;
    }
  }

  activeDebts.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const attackOrderByDragonId = getAttackOrder(activeDebts.map((dragon) => dragon.id));

  const activeSavings = (dragons ?? [])
    .filter((dragon) => dragon.type === "savings" && dragon.status === "active")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activeDragons = [...activeDebts, ...activeSavings];
  const completedDragons = (dragons ?? []).filter((dragon) => dragon.status === "completed");

  const hasAnyDragons = (dragons ?? []).length > 0;
  const activeList = tab === "savings" ? activeSavings : tab === "debt" ? activeDebts : activeDragons;
  const completedList =
    tab === "general" ? completedDragons : completedDragons.filter((dragon) => dragon.type === tab);

  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
          <GiDragonHead className="size-3.5 text-ki-awakening" aria-hidden="true" />
          Metas invocadas
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Dragones</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cada Dragón es una meta de ahorro o deuda. Aliméntalo con abonos o pagos hasta completarlo.
        </p>

        <div className="mt-8">
          <DragonsTabs active={tab} />
        </div>

        {tab === "general" && (
          <div className="mt-8">
            <DragonsSummary dragons={dragons ?? []} />
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">Activos</h2>
          {activeList.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeList.map((dragon) => (
                <DragonCard
                  key={dragon.id}
                  dragon={dragon}
                  attackOrder={attackOrderByDragonId.get(dragon.id)}
                  lastContributionAt={lastContributionByDragonId.get(dragon.id)}
                />
              ))}
            </div>
          ) : hasAnyDragons ? (
            <p className="mt-4 text-sm text-ink-muted">
              {tab === "savings" ? "No tienes Dragones de ahorro activos." : "No tienes Dragones de deuda activos."}
            </p>
          ) : (
            <div className="mt-4">
              <DragonsEmptyState />
            </div>
          )}
        </div>

        {activeList.length >= 2 && (
          <div className="mt-8">
            <DragonsProgressChart dragons={activeList} />
          </div>
        )}

        {tab !== "savings" && <DebtStrategyComparison dragons={activeDebts} />}

        {completedList.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
              Completados
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {completedList.map((dragon) => (
                <DragonCard
                  key={dragon.id}
                  dragon={dragon}
                  lastContributionAt={lastContributionByDragonId.get(dragon.id)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <CreateDragonDialog />
    </>
  );
}
