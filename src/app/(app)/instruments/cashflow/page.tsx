import { TrendingUp } from "lucide-react";
import { CashflowSimulator } from "@/components/cashflow-simulator";
import { getSimulationBaseInput } from "@/lib/cashflow-simulation-data";
import { createClient } from "@/lib/supabase/server";

export default async function CashflowSimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const baseInput = await getSimulationBaseInput(supabase, user.id);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <TrendingUp className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Instrumentos
      </div>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Simulador de flujo de efectivo</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Proyecta tu Saldo Disponible hacia adelante activando o desactivando tus recurrentes, Dragones de deuda y
        Dragones de ahorro — nada de esto toca tus datos reales, solo responde &ldquo;¿qué pasaría si...?&rdquo;.
      </p>

      <div className="mt-8">
        <CashflowSimulator baseInput={baseInput} />
      </div>
    </section>
  );
}
