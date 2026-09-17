import { Scale, TrendingUp } from "lucide-react";
import Link from "next/link";

const INSTRUMENTS = [
  {
    href: "/instruments/50-30-20",
    icon: Scale,
    name: "Regla 50/30/20",
    description: "Compara cómo divides tu ingreso del mes entre Necesidad, Deseo y Ahorro/Deuda contra la guía 50/30/20.",
  },
  {
    href: "/instruments/cashflow",
    icon: TrendingUp,
    name: "Simulador de flujo de efectivo",
    description: "Proyecta tu saldo disponible hacia adelante activando o desactivando recurrentes, deudas y metas de ahorro.",
  },
] as const;

// Índice de Instrumentos: no existía hasta que hubo un segundo instrumento
// (ver nota en CLAUDE.md, Fase 12) — con la Regla 50/30/20 sola, la nav
// apuntaba directo a esa página. Ahora que hay dos, "Instrumentos" en la nav
// apunta aquí.
export default function InstrumentsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Instrumentos</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Herramientas de finanzas personales que no son metas ni presupuesto — guías y proyecciones para entender tu
        dinero desde otro ángulo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {INSTRUMENTS.map((instrument) => (
          <Link
            key={instrument.href}
            href={instrument.href}
            className="rounded-xl border border-ink-muted/15 bg-void/40 p-5 transition-colors hover:border-ki-awakening/40"
          >
            <instrument.icon className="size-5 text-ki-awakening" aria-hidden="true" />
            <p className="mt-3 font-display text-base font-semibold text-ink">{instrument.name}</p>
            <p className="mt-1 text-sm text-ink-muted">{instrument.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
