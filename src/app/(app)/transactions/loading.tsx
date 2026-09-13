import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </section>
  );
}
