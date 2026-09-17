import { Scale } from "lucide-react";
import Link from "next/link";
import { FiftyThirtyTwentyBars } from "@/components/fifty-thirty-twenty-bars";
import { FiftyThirtyTwentyHistoryChart } from "@/components/fifty-thirty-twenty-history-chart";
import { FiftyThirtyTwentyMonthSelector } from "@/components/fifty-thirty-twenty-month-selector";
import { computeFiftyThirtyTwenty, getFiftyThirtyTwentyHistory } from "@/lib/fifty-thirty-twenty";
import { computePeriodStart, parsePeriodISODate, toISODate } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FiftyThirtyTwentyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const currentMonthStart = computePeriodStart(new Date(), 1);
  const monthParam = firstParam(params.month);
  const requestedMonth = monthParam && ISO_DATE_RE.test(monthParam) ? parsePeriodISODate(monthParam) : currentMonthStart;
  // No tiene sentido navegar a un mes futuro — no hay datos que mostrar.
  const selectedMonth = requestedMonth.getTime() > currentMonthStart.getTime() ? currentMonthStart : requestedMonth;
  const isCurrentMonth = toISODate(selectedMonth) === toISODate(currentMonthStart);

  const [result, history] = await Promise.all([
    computeFiftyThirtyTwenty(supabase, user.id, selectedMonth),
    getFiftyThirtyTwentyHistory(supabase, user.id, 6),
  ]);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <Scale className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Instrumentos
      </div>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Regla 50/30/20</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Divide tu ingreso del mes en tres partes: 50% Necesidad (renta, comida, servicios — lo que no puedes dejar
        de pagar), 30% Deseo (todo lo demás: gustos, salidas, entretenimiento) y 20% Ahorro/Deuda (lo que apartas en
        tus Dragones, más el gasto en categorías que clasifiques como Ahorro/Deuda en{" "}
        <Link href="/categories" className="text-ki-awakening hover:underline">
          Categorías
        </Link>{" "}
        — para deudas que pagas sin llevarlas como Dragón). No es una regla estricta, es una guía rápida para ver si
        tu gasto está balanceado.
      </p>

      <div className="mt-8 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Detalle del mes
        </h2>
        <FiftyThirtyTwentyMonthSelector monthISO={toISODate(selectedMonth)} isCurrentMonth={isCurrentMonth} />
      </div>
      <div className="mt-4 rounded-xl border border-ink-muted/15 bg-void/40 p-5">
        {result ? (
          <FiftyThirtyTwentyBars result={result} />
        ) : (
          <p className="text-sm text-ink-muted">
            {isCurrentMonth
              ? "Aún no registras ingresos este mes — la Regla 50/30/20 necesita un ingreso base para calcular porcentajes."
              : "No registraste ingresos ese mes — la Regla 50/30/20 necesita un ingreso base para calcular porcentajes."}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Histórico mensual
        </h2>
        <div className="mt-4 rounded-xl border border-ink-muted/15 bg-void/40 p-5">
          <FiftyThirtyTwentyHistoryChart history={history} />
        </div>
      </div>
    </section>
  );
}
