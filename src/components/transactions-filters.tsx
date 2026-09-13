"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { TransactionCategory } from "@/components/add-transaction-dialog";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

function typeLabel(value: string) {
  if (value === "income") return "Ingreso";
  if (value === "expense") return "Gasto";
  return "Todos";
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export function TransactionsFilters({ categories }: { categories: TransactionCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") ?? ALL;
  const categoryId = searchParams.get("category") ?? ALL;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const q = searchParams.get("q") ?? "";

  const [searchDraft, setSearchDraft] = useState(q);
  const [isSearchPending, startSearchTransition] = useTransition();
  // Tracks the last value *this component* pushed to the URL, so the sync effect below
  // can tell "the URL changed because we searched" apart from "the URL changed externally"
  // (back/forward, clear filters) — otherwise a slow/out-of-order navigation can stomp
  // over text the user already typed after triggering the search.
  const lastPushedSearch = useRef(q);

  useEffect(() => {
    if (q === lastPushedSearch.current) return;
    lastPushedSearch.current = q;
    setSearchDraft(q);
  }, [q]);

  function updateParam(key: string, value: string, options?: { replace?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (options?.replace) router.replace(href);
    else router.push(href);
  }

  useEffect(() => {
    if (searchDraft === q) return;
    const timeout = setTimeout(() => {
      const next = searchDraft.trim();
      lastPushedSearch.current = next;
      startSearchTransition(() => updateParam("q", next, { replace: true }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const hasFilters = type !== ALL || categoryId !== ALL || from !== "" || to !== "" || q !== "";
  const incomeCategories = categories.filter((category) => category.type === "income");
  const expenseCategories = categories.filter((category) => category.type === "expense");

  function categoryLabel(value: string) {
    if (value === ALL) return "Todas";
    return categories.find((category) => category.id === value)?.name ?? "Todas";
  }

  const labelClassName = "font-mono text-[11px] tracking-widest text-ink-muted uppercase";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* En 375px estos 5 campos en una sola fila (el layout original a
          partir de sm+) no caben — se apilan en una grilla de 2 columnas por
          debajo de sm y vuelven a la fila horizontal en sm+ (ver auditoría
          responsive). */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <label htmlFor="transactions-search" className={labelClassName}>
            Buscar
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-ink-muted/60"
              aria-hidden="true"
            />
            <Input
              id="transactions-search"
              type="text"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Descripción..."
              className="h-10 w-full pr-7 pl-7 sm:w-48"
            />
            {isSearchPending && (
              <span
                className="scouter-blink absolute top-1/2 right-2 size-1.5 -translate-y-1/2 rounded-full bg-ki-awakening"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Tipo</label>
          <Select value={type} onValueChange={(next) => updateParam("type", next ?? ALL)}>
            <SelectTrigger aria-label="Tipo" className="w-full sm:w-36">
              <SelectValue>{typeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Categoría</label>
          <Select value={categoryId} onValueChange={(next) => updateParam("category", next ?? ALL)}>
            <SelectTrigger aria-label="Categoría" className="w-full sm:w-44">
              <SelectValue>{categoryLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectGroup>
                <SelectLabel>Ingresos</SelectLabel>
                {incomeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Gastos</SelectLabel>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Desde</label>
          <DatePicker
            value={parseISODate(from)}
            onChange={(date) => updateParam("from", date ? toISODate(date) : "")}
            placeholder="Sin límite"
            label="Desde"
            className="w-full sm:w-40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Hasta</label>
          <DatePicker
            value={parseISODate(to)}
            onChange={(date) => updateParam("to", date ? toISODate(date) : "")}
            placeholder="Sin límite"
            label="Hasta"
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            lastPushedSearch.current = "";
            setSearchDraft("");
            router.push(pathname);
          }}
          className="h-10"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
