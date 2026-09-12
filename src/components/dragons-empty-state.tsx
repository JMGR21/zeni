import { AuraScene } from "@/components/aura-scene";
import { CreateDragonDialog } from "@/components/create-dragon-dialog";
import { DragonMotif } from "@/components/dragon-motif";

export function DragonsEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 px-6 py-14">
      <AuraScene
        color="var(--color-ki-awakening)"
        className="pointer-events-none absolute inset-0 mx-auto h-full max-w-md opacity-60"
      />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <DragonMotif size={56} />
        <p className="font-display text-lg font-semibold text-ink">Aún no invocas ningún Dragón</p>
        <p className="max-w-sm text-sm text-ink-muted">
          Crea tu primera meta de ahorro o deuda para empezar a llenar sus Esferas y avanzar hacia tu objetivo.
        </p>
        <div className="mt-2">
          <CreateDragonDialog variant="inline" />
        </div>
      </div>
    </div>
  );
}
