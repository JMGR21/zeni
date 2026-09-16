import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <section className="mx-auto w-full max-w-md px-6 py-10">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-8 flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="mt-8 border-t border-ink-muted/10 pt-6">
        <Skeleton className="h-4 w-28" />
      </div>
    </section>
  );
}
