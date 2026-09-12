@AGENTS.md

# Zeni — Contexto del proyecto

App de finanzas personales gamificada (temática Dragon Ball) para uso personal. Convierte el manejo de dinero en un sistema de progreso: registrar ingresos/gastos, presupuesto sugerido, metas (Dragons) de ahorro y deuda, y un score de salud financiera (Ki) con niveles de energía.

Proyecto personal, sin usuarios externos por ahora. Prioriza simplicidad y código legible sobre arquitectura enterprise.

## Stack

- Next.js (App Router, TypeScript, `src/`)
- pnpm como gestor de paquetes
- Tailwind CSS + shadcn/ui
- Tremor (o Recharts) para gráficas
- Supabase Cloud (Postgres + Auth + Storage) — NO auto-alojado
- Esquema de base de datos gestionado con Supabase CLI (migraciones versionadas en `supabase/migrations/`), no con el SQL Editor manual
- Cliente de Supabase vía `@supabase/ssr` (no uses `@supabase/auth-helpers-nextjs`, está deprecado)
- Deploy en Vercel
- Claves de Supabase: usar `sb_publishable_...` y `sb_secret_...` (formato nuevo). NO usar `anon`/`service_role` (legacy, en deprecación)

## Comandos clave

```bash
pnpm dev                          # desarrollo local
pnpm build                        # build de producción
pnpm lint                         # lint
npx supabase migration new <name> # nueva migración de esquema
npx supabase db push              # aplicar migraciones a Supabase Cloud
```

## Estructura del proyecto

```
src/
  app/                  # rutas (App Router)
  components/           # componentes de UI (shadcn/ui)
  lib/
    supabase/
      client.ts         # cliente para Client Components
      server.ts         # cliente para Server Components/Actions
  proxy.ts              # refresco de sesión de Supabase (antes middleware.ts)
supabase/
  migrations/           # esquema de base de datos versionado
```

## Convenciones de dominio (importante)

Este proyecto usa lenguaje temático Dragon Ball en TODA la app (no solo marketing). Mantener estos términos consistentes en la UI y traducirlos a su nombre técnico en el código:

| Término (UI, en español) | Significado | Nombre técnico (código, en inglés) |
|---|---|---|
| Zeni | Dinero real del usuario | — |
| Ki | Score de salud financiera (etiqueta de energía, no número visible al usuario) | `ki` |
| Nivel | Progreso acumulado del usuario (XP, nunca baja) | `level` |
| Dragón | Meta financiera (tipo `savings` o `debt`) | `dragon` |
| Esfera | Sub-meta/hito dentro de un Dragón | `sphere` |
| Entrenamiento | Hábitos financieros recurrentes | `habit` |
| Transformación | Evento al subir de etiqueta de Ki | `transformation` |

- **Nombres de tablas, columnas, código y entidades de dominio: siempre en inglés** (ej. `categories`, `dragons`, `spheres`, campo `name`, `type`). Solo la documentación en texto (comentarios, este archivo, docs) va en español.
- Todas las tablas de usuario llevan Row Level Security (RLS) con policy `auth.uid() = user_id`. Nunca desactivar RLS en una tabla nueva sin confirmarlo explícitamente conmigo.
- Una migración por cambio conceptual completo (no todas las tablas en una sola migración, no una migración por cada columna suelta). Tablas que nacen juntas y no tienen sentido por separado (ej. `dragons` + `spheres`) sí pueden ir en la misma migración.

## Niveles de Ki (para cuando se implemente el cálculo)

Modo Supervivencia (0–15) → Ki Dormido (16–35) → Ki Despertando (36–50) → Guerrero Z (51–65) → Super Saiyan (66–85) → Super Saiyan 2 (86–100)

Fórmula: `Ki = 0.35 × SaludActual + 0.35 × Momentum + 0.20 × Presupuesto + 0.10 × Constancia`. Salvaguarda: si hay balance negativo 2+ meses seguidos o pago mínimo no cubierto, el Ki se limita a máximo "Ki Dormido".

## Sistema de diseño

Tema oscuro, acento de color dinámico según el nivel de Ki actual (ver tabla de tokens en `globals.css`). Tipografía: Rajdhani (`--font-display`, headlines/números de Ki), IBM Plex Sans (`--font-sans`, UI general), IBM Plex Mono (`--font-mono`, montos y cifras tabulares).

Tokens de texto/fondo: usar `ink` / `ink-muted` (NO `text-primary`/`text-muted`) — shadcn ya reserva `primary` internamente para botones/Card, así que esos nombres chocarían con sus componentes. Tokens de Ki: `ki-survival`, `ki-dormant`, `ki-awakening`, `ki-warrior`, `ki-saiyan`, `ki-saiyan2`.

Componentes de marca (KiGauge, AuraIcon/AuraScene) son SVG hechos a mano, no librerías de charts — Tremor/Recharts se reservan para gráficas de datos reales (tendencias, comparativas), no para piezas de identidad visual. Un solo glow permitido en toda la UI: el arco del KiGauge. Iconografía estándar con lucide-react.

**Vocabulario visual ya establecido (reutilizar, no reinventar):**
- Título de pantalla completa (ej. login): `font-display text-3xl font-semibold text-ink` + subtítulo `mt-1 text-sm text-ink-muted`.
- Encabezado de sección dentro de una pantalla (ej. "Este mes" en el dashboard): `font-display text-sm font-semibold uppercase tracking-widest text-ink-muted`.
- Micro-etiqueta tipo HUD (ej. "PODER" en el scouter, "REGISTRO" en el modal de transacción, labels de paso): `font-mono text-xs tracking-widest uppercase`, opcionalmente con un punto `size-1.5 rounded-full bg-ki-awakening` animado con `scouter-blink` — usar el punto con moderación (un indicador "vivo" por pantalla, no repetido en cada tarjeta de una lista).
- Bloque de contenido interactivo (tarjetas seleccionables, filas de formulario): `rounded-xl border border-ink-muted/15 bg-void/40`.
- Separadores/filas de tabla no interactivas: `border-b border-ink-muted/10`.
- Botón primario: `bg-ki-awakening text-void hover:bg-ki-awakening/90`.
- No usar badges/pills con fondo de color — las etiquetas de estado son texto (mono, uppercase, tracking-widest, coloreado) sin cápsula.

**Navegación del área autenticada:** header compartido en `src/components/app-header.tsx` (logo ZENI + nav Dashboard/Presupuesto + botón de cerrar sesión), usado por todas las páginas dentro de `(app)/` en vez de repetir el header por página.

**Concepto de Auth ("Scouter"):** el login/signup se piensa como un visor de poder tipo Dragon Ball — "escaneas tu ki" para entrar. Componentes: `scouter-hud.tsx` (radar, barrido, contador de PODER), `hud-frame.tsx` (marco tipo visor con línea de escaneo), `auth-mode-toggle.tsx` (pestañas login/signup). Copy temático en los formularios ("Bienvenido de vuelta, guerrero", "Verificando ki..."). Esta metáfora (escanear/medir poder) es el patrón a seguir para futuras pantallas de "entrada" o verificación en la app — no solo decoración, la metáfora debe ajustarse a la función real de la pantalla.

**Regla de consistencia visual (importante):** el diseño real del proyecto es el que vive en el código, no el que se describe en un prompt nuevo. Antes de construir cualquier UI nueva:
1. Revisa los componentes y patrones ya existentes en `src/components/` y las pantallas ya implementadas — reutilízalos y sigue su estilo, no inventes un patrón visual distinto para la misma necesidad.
2. Si en el proceso decides o el usuario pide un patrón visual nuevo (ej. el concepto "Scouter"), documéntalo brevemente en esta sección del `CLAUDE.md` al terminar, para que la siguiente sesión (de Claude Code o de este chat) parta del diseño real y no de una versión desactualizada.
3. Los prompts que vienen de las sesiones de chat (fuera de Claude Code) especifican qué debe hacer la funcionalidad, no necesariamente el detalle visual exacto — si algo ahí choca con un patrón ya establecido en el código (colores, componentes, tono del copy), prioriza lo que ya existe en el proyecto y avisa del ajuste en el resumen final.

## Cosas a evitar

- No agregar dependencias nuevas sin confirmarlo primero (proyecto personal, se prefiere mantener el stack acotado)
- No usar `service_role`/`anon` legacy keys
- No exponer la `secret key` (`sb_secret_...`) en ningún archivo con prefijo `NEXT_PUBLIC_`
- No usar `middleware.ts` — el proyecto usa `proxy.ts` (convención renombrada en Next.js 16)
- No editar una migración ya aplicada con `db push` — crear una migración nueva que corrija lo necesario

## Fase actual

**Fase 1 — Fundamentos:** COMPLETA. Proyecto creado, Supabase Cloud configurado, cliente `@supabase/ssr` listo (`client.ts`, `server.ts`, `proxy.ts`). Supabase CLI vinculado, migración `init_schema` aplicada (tablas `profiles` y `categories` con RLS). Auth (login/signup) implementado con concepto "Scouter". Sistema de diseño base establecido (tokens de Ki, tipografía, KiGauge, AuraScene, DragonMotif, SphereOrb).

**Fase 2 — Registro/Dashboard:** en curso. Tabla `transactions` + categorías por defecto vía trigger. Modal de registro rápido y dashboard con datos reales implementados y funcionando, con el diseño afinado directamente en Claude Code (no necesariamente idéntico a lo último descrito en el chat — el código es la fuente de verdad, ver regla de consistencia visual arriba).

**Fase 3 — Presupuesto:** implementada. Tabla `budgets` (solo overrides manuales; migración `add_budgets` creada pero pendiente de `db push` — la CLI no tuvo permisos para aplicarla directamente, aplicar manualmente). `src/lib/budget.ts` calcula la sugerencia (promedio de los últimos 3 meses calendario completos). Decisiones no obvias tomadas:
- Una categoría sin ningún gasto en la ventana de 3 meses se trata como "sin historial suficiente" (no como sugerencia de $0) — un promedio de cero no es un presupuesto útil.
- El header de nav compartido (`app-header.tsx`) se extrajo del dashboard en esta fase; el dashboard ahora también lo usa.
- Primera versión de esta pantalla usó un patrón visual nuevo (tarjetas con badges/pills, `bg-surface/40`, h1 grande y bold) que no seguía el vocabulario ya establecido en login/scouter y el modal de transacciones — se corrigió para reusar las convenciones listadas arriba (título de pantalla, encabezado de sección uppercase, tarjetas `bg-void/40`, etiquetas de texto sin cápsula). Ver vocabulario visual en "Sistema de diseño" antes de construir la siguiente pantalla.

Roadmap completo: Fundamentos → Registro/Dashboard → Presupuesto → Dragones → Ki → Nivel/Transformaciones → Pulido.