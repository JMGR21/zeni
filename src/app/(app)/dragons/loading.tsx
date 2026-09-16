import { Skeleton } from "@/components/ui/skeleton";

export default function DragonsLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-9 w-44" />
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />

      <div className="mt-8">
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-4 w-16" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
