import { User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AuraIcon } from "@/components/aura-icon";
import { KiGauge } from "@/components/ki-gauge";
import { getKiLevel } from "@/lib/ki";

// Datos de ejemplo para maquetar el diseño; llegarán de Supabase en fases futuras.
const EXAMPLE_KI_SCORE = 58;
const EXAMPLE_MONTH = { income: 24000, expenses: 15300 };

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const kiLevel = getKiLevel(EXAMPLE_KI_SCORE);
  const balance = EXAMPLE_MONTH.income - EXAMPLE_MONTH.expenses;

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <header className="flex items-center justify-between border-b border-ink-muted/10 px-6 py-4">
        <span className="font-display text-xl font-bold tracking-[0.2em]">
          ZENI
        </span>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <User className="size-5" />
          </button>
        </form>
      </header>

      <section className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AuraIcon color={`var(--color-${kiLevel.colorToken})`} size={380} />
        </div>
        <KiGauge score={EXAMPLE_KI_SCORE} size={220} />
        <p className="font-mono text-3xl text-ink">
          {currencyFormatter.format(balance)}
        </p>
        <p className="text-sm text-ink-muted">Saldo actual</p>
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
                {currencyFormatter.format(EXAMPLE_MONTH.income)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-ink-muted/10 pb-2">
              <dt className="text-sm text-ink-muted">Gastos</dt>
              <dd className="font-mono text-sm text-ink">
                {currencyFormatter.format(EXAMPLE_MONTH.expenses)}
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
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Dragones activos
          </h2>
          <p className="mt-4 text-sm text-ink-muted">
            Próximamente — fase 4.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Movimientos recientes
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-muted/10 text-ink-muted">
              <th className="py-2 font-normal">Fecha</th>
              <th className="py-2 font-normal">Categoría</th>
              <th className="py-2 font-normal">Descripción</th>
              <th className="py-2 text-right font-normal">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink-muted/10">
              <td className="py-3 text-ink-muted">—</td>
              <td className="py-3 text-ink-muted">—</td>
              <td className="py-3 text-ink-muted">Sin movimientos todavía</td>
              <td className="py-3 text-right text-ink-muted">—</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
