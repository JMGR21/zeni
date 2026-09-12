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
