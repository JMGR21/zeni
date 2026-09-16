import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex}>
            <Skeleton className="h-4 w-20" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
