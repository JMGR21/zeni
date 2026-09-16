import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      <Skeleton className="mt-1 h-4 w-2/3 max-w-lg" />

      <div className="mt-8">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
