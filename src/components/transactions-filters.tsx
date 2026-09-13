"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TransactionCategory } from "@/components/add-transaction-dialog";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
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

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = type !== ALL || categoryId !== ALL || from !== "" || to !== "";
  const incomeCategories = categories.filter((category) => category.type === "income");
  const expenseCategories = categories.filter((category) => category.type === "expense");

  function categoryLabel(value: string) {
    if (value === ALL) return "Todas";
    return categories.find((category) => category.id === value)?.name ?? "Todas";
  }

  const labelClassName = "font-mono text-[11px] tracking-widest text-ink-muted uppercase";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid auto-cols-max grid-flow-col grid-rows-[auto_auto] items-end gap-x-3 gap-y-1.5">
        <label className={labelClassName}>Tipo</label>
        <Select value={type} onValueChange={(next) => updateParam("type", next ?? ALL)}>
          <SelectTrigger className="w-36">
            <SelectValue>{typeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="income">Ingreso</SelectItem>
            <SelectItem value="expense">Gasto</SelectItem>
          </SelectContent>
        </Select>

        <label className={labelClassName}>Categoría</label>
        <Select value={categoryId} onValueChange={(next) => updateParam("category", next ?? ALL)}>
          <SelectTrigger className="w-44">
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

        <label className={labelClassName}>Desde</label>
        <DatePicker
          value={parseISODate(from)}
          onChange={(date) => updateParam("from", date ? toISODate(date) : "")}
          placeholder="Sin límite"
          className="w-40"
        />

        <label className={labelClassName}>Hasta</label>
        <DatePicker
          value={parseISODate(to)}
          onChange={(date) => updateParam("to", date ? toISODate(date) : "")}
          placeholder="Sin límite"
          className="w-40"
        />
      </div>

      {hasFilters && (
        <Button type="button" variant="outline" onClick={() => router.push(pathname)} className="h-10">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
