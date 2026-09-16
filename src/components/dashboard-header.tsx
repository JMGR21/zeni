import { AddTransactionDialog, type DragonOption, type TransactionCategory } from "@/components/add-transaction-dialog";
import { DashboardSearch } from "@/components/dashboard-search";
import { PeriodSelector } from "@/components/period-selector";

// Franja superior del dashboard: saludo + frase temática a la izquierda,
// controles de periodo/búsqueda/registro a la derecha — mismo espíritu
// que un header de dashboard fintech (buscador + selector de periodo +
// acción principal), pero con el lenguaje visual y de copy ya establecido
// en el resto de la app.
export function DashboardHeader({
  name,
  quote,
  periodStart,
  periodEnd,
  monthStartDay,
  isCurrentPeriod,
  categories,
  dragons,
}: {
  name: string | null;
  quote: string;
  periodStart: string;
  periodEnd: string;
  monthStartDay: number;
  isCurrentPeriod: boolean;
  categories: TransactionCategory[];
  dragons: DragonOption[];
}) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pt-10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Bienvenido de vuelta{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{quote}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DashboardSearch />
        <PeriodSelector
          periodStart={periodStart}
          periodEnd={periodEnd}
          monthStartDay={monthStartDay}
          isCurrentPeriod={isCurrentPeriod}
        />
        <AddTransactionDialog categories={categories} dragons={dragons} variant="inline" />
      </div>
    </section>
  );
}
