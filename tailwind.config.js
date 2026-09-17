// Tailwind v4 usa CSS-first config (@theme en globals.css), pero Tremor
// todavía requiere un preset clásico (colores/radios/sombras bajo el
// namespace `tremor-*`). Este archivo se carga vía `@config` en globals.css
// solo para darle a Tremor sus tokens — el resto de la app sigue usando
// @theme. Los valores no son la paleta azul/gris por defecto de Tremor:
// están mapeados a los tokens ya existentes (Ki, ink, void) para que la
// gráfica no se vea como un widget ajeno al sistema de diseño.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./node_modules/@tremor/**/*.{js,ts,jsx,tsx}"],
  // Tremor arma sus clases de color por categoría en runtime
  // (`fill-${color}-500`, `bg-${color}-500`, `text-${color}-500`, cada una
  // con su variante `dark:`) — Tailwind v4 no puede detectarlas de forma
  // estática. Para el BarChart de Ingresos/Gastos del dashboard (único
  // lugar del proyecto que pasa `colors` a un componente de Tremor) se
  // fija un set cerrado de 2 colores (emerald=ingresos, rose=gastos, mismo
  // significado que el verde/rojo ya usado en StatTile) y se safelistea
  // exactamente esas clases — a diferencia del DonutChart descartado en
  // Fase 10 (paleta de 22 colores, imposible de safelistear con
  // confianza), este es un par fijo y pequeño.
  safelist: [
    "fill-emerald-500",
    "dark:fill-emerald-500",
    "bg-emerald-500",
    "dark:bg-emerald-500",
    "text-emerald-500",
    "dark:text-emerald-500",
    "fill-rose-500",
    "dark:fill-rose-500",
    "bg-rose-500",
    "dark:bg-rose-500",
    "text-rose-500",
    "dark:text-rose-500",
    // Segunda excepción a "nunca pases color/colors a Tremor": el
    // LineChart del simulador de flujo de efectivo (`cashflow-simulator.tsx`)
    // necesita 2 series (saldo proyectado + línea de referencia en $0), y a
    // diferencia de BarList/BarChart de una sola serie (que caen a
    // tremor-brand-* sin pasar `colors`), un LineChart con 2+ categorías sin
    // `colors` explícito usa la paleta azul/gris por defecto de Tremor
    // (`themeColorRange`, no mapeada a nuestros tokens) — así que aquí sí
    // hace falta fijar colores + safelistear, igual que en IncomeExpenseChart.
    // LineChart usa `stroke-*` (la línea) y `fill-*` (los puntos), no `fill`
    // para el trazo como BarChart, de ahí el set de clases distinto.
    "stroke-amber-500",
    "dark:stroke-amber-500",
    "fill-amber-500",
    "dark:fill-amber-500",
    "bg-amber-500",
    "dark:bg-amber-500",
    "stroke-gray-500",
    "dark:stroke-gray-500",
    "fill-gray-500",
    "dark:fill-gray-500",
    "bg-gray-500",
    "dark:bg-gray-500",
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: "var(--color-ki-awakening)",
            muted: "var(--color-ki-awakening)",
            subtle: "var(--color-ki-awakening)",
            DEFAULT: "var(--color-ki-awakening)",
            emphasis: "var(--color-ki-awakening)",
            inverted: "var(--color-void)",
          },
          background: {
            muted: "var(--color-surface)",
            subtle: "var(--color-surface)",
            DEFAULT: "transparent",
            emphasis: "var(--color-ink-muted)",
          },
          border: {
            DEFAULT: "var(--color-ink-muted)",
          },
          ring: {
            DEFAULT: "var(--color-ink-muted)",
          },
          content: {
            subtle: "var(--color-ink-muted)",
            DEFAULT: "var(--color-ink-muted)",
            emphasis: "var(--color-ink)",
            strong: "var(--color-ink)",
            inverted: "var(--color-void)",
          },
        },
      },
      boxShadow: {
        "tremor-input": "none",
        "tremor-card": "none",
        "tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.3)",
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem"],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
    },
  },
};
