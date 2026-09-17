import { Scale } from "lucide-react";
import Link from "next/link";
import { FiftyThirtyTwentyBars } from "@/components/fifty-thirty-twenty-bars";
import { computeFiftyThirtyTwenty } from "@/lib/fifty-thirty-twenty";
import { createClient } from "@/lib/supabase/server";

export default async function FiftyThirtyTwentyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const result = await computeFiftyThirtyTwenty(supabase, user.id, new Date());

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

      <div className="mt-8 rounded-xl border border-ink-muted/15 bg-void/40 p-5">
        {result ? (
          <FiftyThirtyTwentyBars result={result} />
        ) : (
          <p className="text-sm text-ink-muted">
            Aún no registras ingresos este mes — la Regla 50/30/20 necesita un ingreso base para calcular
            porcentajes.
          </p>
        )}
      </div>
    </section>
  );
}
