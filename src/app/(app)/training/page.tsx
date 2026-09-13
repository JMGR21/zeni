import { GiMuscleUp } from "react-icons/gi";
import { AppHeader } from "@/components/app-header";
import { formatRelativeDays } from "@/lib/relative-time";
import { computeBestStreak, computeCurrentStreak } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";

const XP_EVENT_LABELS: Record<string, string> = {
  daily_activity: "Registro diario",
  weekly_activity: "Bono semanal",
};

type XpEventRow = { id: string; type: string; amount: number; created_at: string };

export default async function TrainingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: transactionDates }, { count: budgetMonthsCount }, { data: recentXpEvents }] = await Promise.all([
    supabase.from("transactions").select("occurred_on").eq("user_id", user.id),
    supabase
      .from("xp_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "budget_month"),
    supabase
      .from("xp_events")
      .select("id, type, amount, created_at")
      .eq("user_id", user.id)
      .in("type", ["daily_activity", "weekly_activity"])
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<XpEventRow[]>(),
  ]);

  const activeDates = new Set((transactionDates ?? []).map((row) => row.occurred_on));
  const currentStreak = computeCurrentStreak(activeDates);
  const bestStreak = computeBestStreak(activeDates);

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="training" />

      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
          <GiMuscleUp className="size-3.5 text-ki-awakening" aria-hidden="true" />
          Disciplina de entrenamiento
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Entrenamiento</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tu constancia no se ve de un día para otro — aquí está el registro de tu disciplina.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Racha actual</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {currentStreak} <span className="text-base font-medium text-ink-muted">días</span>
            </p>
          </div>
          <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Mejor racha</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {bestStreak} <span className="text-base font-medium text-ink-muted">días</span>
            </p>
          </div>
          <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Meses en presupuesto</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{budgetMonthsCount ?? 0}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Historial de constancia
          </h2>
          <div className="mt-4 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
            {recentXpEvents && recentXpEvents.length > 0 ? (
              recentXpEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-ink-muted/10 py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm text-ink">{XP_EVENT_LABELS[event.type] ?? event.type}</p>
                    <p className="text-xs text-ink-muted">{formatRelativeDays(event.created_at)}</p>
                  </div>
                  <span className="font-mono text-sm text-ki-awakening">+{event.amount} XP</span>
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-ink-muted">Todavía no hay XP de constancia registrado.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
