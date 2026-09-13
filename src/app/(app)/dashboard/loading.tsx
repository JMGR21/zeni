import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <section className="flex flex-col items-center gap-3 px-6 py-16">
        <Skeleton className="size-55 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-24" />

        <div className="mt-2 w-full max-w-xs">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
        <div>
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-20 w-full rounded-xl" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <Skeleton className="h-48 w-full rounded-xl" />
      </section>
    </>
  );
}
