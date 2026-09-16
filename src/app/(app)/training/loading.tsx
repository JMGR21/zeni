import { Skeleton } from "@/components/ui/skeleton";

export default function TrainingLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-2 h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      <div className="mt-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-56 w-full rounded-xl" />
      </div>
    </section>
  );
}
