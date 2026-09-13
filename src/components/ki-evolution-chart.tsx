import { LineChart } from "@tremor/react";

export type KiScorePoint = {
  year_month: string;
  score: number;
};

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });

function toChartData(points: KiScorePoint[]) {
  return points.map((point) => ({
    mes: monthFormatter.format(new Date(`${point.year_month}T00:00:00`)),
    Ki: Number(point.score),
  }));
}

export function KiEvolutionChart({ points }: { points: KiScorePoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
        <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">Evolución de Ki</span>
        <p className="mt-3 text-sm text-ink-muted">
          Todavía no hay suficiente historial para mostrar una tendencia — vuelve el próximo mes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">Evolución de Ki</span>
      <LineChart
        className="mt-4 h-56"
        data={toChartData(points)}
        index="mes"
        categories={["Ki"]}
        minValue={0}
        maxValue={100}
        showLegend={false}
        showAnimation
      />
    </div>
  );
}
