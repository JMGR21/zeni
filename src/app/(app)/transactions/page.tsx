import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { DragonOption, TransactionCategory } from "@/components/add-transaction-dialog";
import { AppHeader } from "@/components/app-header";
import { RecentTransactions, type RecentTransaction } from "@/components/recent-transactions";
import { TransactionsFilters } from "@/components/transactions-filters";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const page = Number(firstParam(value));
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const type = firstParam(params.type);
  const categoryId = firstParam(params.category);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const page = parsePage(params.page);

  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount, description, occurred_on, category_id, categories(name), dragon_id, dragons(name)",
      { count: "exact" },
    )
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (type === "income" || type === "expense") query = query.eq("type", type);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (from) query = query.gte("occurred_on", from);
  if (to) query = query.lte("occurred_on", to);

  const rangeStart = (page - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE - 1;

  const [{ data: transactions, count }, { data: categories }, { data: dragons }] = await Promise.all([
    query.range(rangeStart, rangeEnd).returns<RecentTransaction[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("active", true)
      .order("name")
      .returns<TransactionCategory[]>(),
    supabase.from("dragons").select("id, name").eq("status", "active").order("name").returns<DragonOption[]>(),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(type || categoryId || from || to);

  function pageHref(nextPage: number) {
    const search = new URLSearchParams();
    if (type) search.set("type", type);
    if (categoryId) search.set("category", categoryId);
    if (from) search.set("from", from);
    if (to) search.set("to", to);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/transactions?${query}` : "/transactions";
  }

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="transactions" />

      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Movimientos</h1>
        <p className="mt-1 text-sm text-ink-muted">Historial completo de ingresos y gastos.</p>

        <div className="mt-6">
          <TransactionsFilters categories={categories ?? []} />
        </div>

        <div className="mt-6">
          <RecentTransactions
            transactions={transactions ?? []}
            categories={categories ?? []}
            dragons={dragons ?? []}
            emptyMessage={hasFilters ? "No hay movimientos con estos filtros" : "Sin movimientos todavía"}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            <Link
              href={pageHref(page - 1)}
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-ink-muted/10 hover:text-ink",
                page <= 1 && "pointer-events-none opacity-30",
              )}
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Anterior
            </Link>
            <span>
              Página {page} de {totalPages}
            </span>
            <Link
              href={pageHref(page + 1)}
              aria-disabled={page >= totalPages}
              tabIndex={page >= totalPages ? -1 : undefined}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-ink-muted/10 hover:text-ink",
                page >= totalPages && "pointer-events-none opacity-30",
              )}
            >
              Siguiente
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
