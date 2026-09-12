@AGENTS.md

# Zeni — Contexto del proyecto

App de finanzas personales gamificada (temática Dragon Ball) para uso personal. Convierte el manejo de dinero en un sistema de progreso: registrar ingresos/gastos, presupuesto sugerido, metas (Dragons) de ahorro y deuda, y un score de salud financiera (Ki) con niveles de energía.

Proyecto personal, sin usuarios externos por ahora. Prioriza simplicidad y código legible sobre arquitectura enterprise.

## Stack

- Next.js (App Router, TypeScript, `src/`)
- pnpm como gestor de paquetes
- Tailwind CSS + shadcn/ui
- Tremor (`@tremor/react`, instalado — primer uso en `dragons-progress-chart.tsx`) para gráficas; ver nota de integración con Tailwind v4 en "Sistema de diseño"
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

Componentes de marca (KiGauge, AuraIcon/AuraScene) son SVG hechos a mano, no librerías de charts — Tremor/Recharts se reservan para gráficas de datos reales (tendencias, comparativas), no para piezas de identidad visual. Glow permitido en dos lugares únicamente: el arco del KiGauge, y el overlay de Transformación (`transformation-overlay.tsx`, fase 6 — celebración puntual de subir de etiqueta de Ki, reutiliza el mismo lenguaje de glow + AuraIcon en vez de inventar uno nuevo). Ningún otro componente debe llevar esta animación. Iconografía estándar con lucide-react.

**Iconografía temática (Game Icons):** para piezas con carga temática (dragones, ahorro/deuda, entrenamiento) se usa `react-icons/gi` (Game Icons, game-icons.net, CC BY 3.0 — no es arte de Dragon Ball, pero comparte el lenguaje visual de fantasía/RPG). lucide-react sigue siendo la librería para iconografía puramente funcional/UI (menú, cerrar sesión, flechas, mail/lock en formularios, checkmarks, alertas). Atribución requerida por la licencia en el footer compartido (`app-footer.tsx`, montado en `(app)/layout.tsx`). Iconos de Game Icons en uso: `GiDragonHead` (DragonMotif y encabezados de secciones de Dragones), `GiPiggyBank`/`GiHandcuffs` (toggle Ahorro/Deuda al crear un Dragón), `GiFireBowl` (abonar/pagar un Dragón), `GiPayMoney` (detalles de financiamiento de deuda), `GiWeightLiftingUp` (Presupuesto, tema "Cámara de gravedad").

**Vocabulario visual ya establecido (reutilizar, no reinventar):**
- Título de pantalla completa (ej. login): `font-display text-3xl font-semibold text-ink` + subtítulo `mt-1 text-sm text-ink-muted`.
- Encabezado de sección dentro de una pantalla (ej. "Este mes" en el dashboard): `font-display text-sm font-semibold uppercase tracking-widest text-ink-muted`.
- Micro-etiqueta tipo HUD (ej. "PODER" en el scouter, "REGISTRO" en el modal de transacción, labels de paso): `font-mono text-xs tracking-widest uppercase`, opcionalmente con un punto `size-1.5 rounded-full bg-ki-awakening` animado con `scouter-blink` — usar el punto con moderación (un indicador "vivo" por pantalla, no repetido en cada tarjeta de una lista).
- Bloque de contenido interactivo (tarjetas seleccionables, filas de formulario): `rounded-xl border border-ink-muted/15 bg-void/40`.
- Separadores/filas de tabla no interactivas: `border-b border-ink-muted/10`.
- Botón primario: `bg-ki-awakening text-void hover:bg-ki-awakening/90`.
- No usar badges/pills con fondo de color — las etiquetas de estado son texto (mono, uppercase, tracking-widest, coloreado) sin cápsula.

**Navegación del área autenticada:** header compartido en `src/components/app-header.tsx` (logo ZENI + nav Dashboard/Presupuesto/Dragones + botón de cerrar sesión), usado por todas las páginas dentro de `(app)/` en vez de repetir el header por página.

**Patrón de formularios de varios campos (wizard):** cuando un modal captura más de un campo en secuencia (crear movimiento, crear Dragón, financiamiento de deuda), usa el patrón wizard de pasos — no un formulario de una sola pantalla con todos los campos apilados. Piezas compartidas en `src/components/wizard-controls.tsx`: `WizardProgress` (barra de puntos, salta a pasos ya visitados), `WizardStepHeader` (chevron atrás + etiqueta uppercase del paso actual) y `WizardSummaryRow` (fila "Campo — valor — Editar" del paso de confirmación). Cada wizard sigue la misma forma: `STEP_LABELS` como tupla `as const`, `step`/`maxReached` en estado, un `goTo(next)` que actualiza ambos, cada paso como su propio componente con un botón "Siguiente" (o auto-avance si el paso es una sola elección tipo tarjeta), último paso "Confirmar" con `WizardSummaryRow` por campo y botón de submit, y `useEffect(() => { if (state.success) onSuccess() }, ...)` para cerrar el diálogo — montado condicionalmente (`{open && <Wizard ... />}`) para que cada apertura reinicie el estado desde cero. Ejemplos: `add-transaction-dialog.tsx`, `create-dragon-dialog.tsx`, `debt-financing-dialog.tsx`. Un modal de un solo campo (`contribute-dragon-dialog.tsx`, `edit-budget-dialog.tsx`) NO necesita este patrón — sigue siendo un solo `AmountKeypad` + botón, sin pasos ni progreso, porque no hay secuencia que mostrar.

**Concepto de Auth ("Scouter"):** el login/signup se piensa como un visor de poder tipo Dragon Ball — "escaneas tu ki" para entrar. Componentes: `scouter-hud.tsx` (radar, barrido, contador de PODER), `hud-frame.tsx` (marco tipo visor con línea de escaneo), `auth-mode-toggle.tsx` (pestañas login/signup). Copy temático en los formularios ("Bienvenido de vuelta, guerrero", "Verificando ki..."). Esta metáfora (escanear/medir poder) es el patrón a seguir para futuras pantallas de "entrada" o verificación en la app — no solo decoración, la metáfora debe ajustarse a la función real de la pantalla.

**Integración de Tremor con Tailwind v4:** Tremor (`@tremor/react` 3.18.7) es un componente v3-era que espera un `tailwind.config.js` clásico con sus tokens `tremor-*` (colores, radios, sombras, tamaños de fuente bajo ese namespace) — Tailwind v4 usa `@theme` en CSS y no lee `tailwind.config.js` por defecto. Puente implementado: `tailwind.config.js` en la raíz define `theme.extend` con los tokens `tremor-*` mapeados a los tokens ya existentes del proyecto (`var(--color-ki-awakening)`, `var(--color-ink)`, `var(--color-ink-muted)`, `var(--color-void)`, `var(--color-surface)`) en vez de la paleta azul/gris por defecto de Tremor, y se carga con `@config "../../tailwind.config.js";` en `globals.css`. Importante para cualquier componente Tremor nuevo: **nunca le pases la prop `color`** (a `BarList`, `BarChart`, etc.) — Tremor construye esas clases dinámicamente en runtime (`` `bg-${color}-${shade}` ``), lo cual Tailwind v4 no puede detectar de forma estática sin un `safelist` exhaustivo que no se configuró; sin `color`, los componentes caen a sus clases `tremor-brand-*`/`tremor-content-*` ya bien mapeadas (verificado que sí se generan revisando el CSS compilado). Para distinguir series (ej. Ahorro vs. Deuda) usa contenedores/headers separados con los iconos y colores ya establecidos (`GiPiggyBank`/`ki-saiyan`, `GiHandcuffs`/`ki-warrior`), no el prop `color` de Tremor.

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

**Fase 1 — Fundamentos:** COMPLETA. Proyecto creado, Supabase Cloud configurado, cliente `@supabase/ssr` listo (`client.ts`, `server.ts`, `proxy.ts`). Supabase CLI vinculado, migración `init_schema` aplicada (tablas `profiles` y `categories` con RLS). Auth (login/signup) implementado con concepto "Scouter". Sistema de diseño base establecido (tokens de Ki, tipografía, KiGauge, AuraScene). Nota de corrección: esta sección originalmente listaba también `DragonMotif` y `SphereOrb` como ya construidos en esta fase, pero no existían en el código — se crearon hasta la Fase 4 parte 3 (ver abajo). Si una fase futura se documenta aquí antes de implementarse, verificar contra el código, no asumir el CLAUDE.md como fuente de verdad ciega.

**Fase 2 — Registro/Dashboard:** en curso. Tabla `transactions` + categorías por defecto vía trigger. Modal de registro rápido y dashboard con datos reales implementados y funcionando, con el diseño afinado directamente en Claude Code (no necesariamente idéntico a lo último descrito en el chat — el código es la fuente de verdad, ver regla de consistencia visual arriba).

**Fase 3 — Presupuesto:** implementada. Tabla `budgets` (solo overrides manuales; migración `add_budgets` creada pero pendiente de `db push` — la CLI no tuvo permisos para aplicarla directamente, aplicar manualmente). `src/lib/budget.ts` calcula la sugerencia (promedio de los últimos 3 meses calendario completos). Decisiones no obvias tomadas:
- Una categoría sin ningún gasto en la ventana de 3 meses se trata como "sin historial suficiente" (no como sugerencia de $0) — un promedio de cero no es un presupuesto útil.
- El header de nav compartido (`app-header.tsx`) se extrajo del dashboard en esta fase; el dashboard ahora también lo usa.
- Primera versión de esta pantalla usó un patrón visual nuevo (tarjetas con badges/pills, `bg-surface/40`, h1 grande y bold) que no seguía el vocabulario ya establecido en login/scouter y el modal de transacciones — se corrigió para reusar las convenciones listadas arriba (título de pantalla, encabezado de sección uppercase, tarjetas `bg-void/40`, etiquetas de texto sin cápsula). Ver vocabulario visual en "Sistema de diseño" antes de construir la siguiente pantalla.

**Fase 4 — Dragones:** COMPLETA (3 de 3 partes). Tabla `dragons` con `institution`, `interest_rate`, `minimum_payment`, `extra_payment` (migraciones `add_dragons`, `add_debt_financing_fields`, `add_dragon_institution`, todas aplicadas — el `db push` de `add_budgets`/`add_dragons` que en su momento falló por permisos de la CLI sí se aplicó correctamente al reintentar, confirmado con `supabase migration list`). Página `src/app/(app)/dragons/page.tsx` lista Dragones activos/completados; `create-dragon-dialog.tsx` crea (toggle Ahorro/Deuda, meta, monto inicial opcional); `contribute-dragon-dialog.tsx` registra abonos/pagos; `debt-financing-dialog.tsx` edita el financiamiento de una deuda y contiene el simulador "¿Y si pago extra?" (slider client-side, sin persistir). Todo vía Server Actions en `src/app/(app)/dragons/actions.ts`.
- `src/lib/debt-projection.ts`: motor puro de amortización (meses restantes, interés total, o estado "no pagable"/"falta definir pago"), usado tanto en `dragon-card.tsx` (proyección guardada) como en el simulador (cálculo en vivo).
- `src/lib/institutions.ts`: catálogo estático de instituciones (bancos/fintech con tasa de referencia, o planes de pago fijo tipo Kueski/Aplazo que no usan tasa anual — su `minimum_payment` se deriva de `monto total / plazo` al guardar, calculado en el Server Action para mantener esa lógica en un solo lugar).
- `src/lib/spheres.ts`: función pura `getSphereProgress` que deriva 7 hitos booleanos de `current_amount`/`target_amount` — no se persiste, siempre se calcula al vuelo.
- `DragonMotif` (`dragon-motif.tsx`, icono `GiDragonHead` de Game Icons — ver sección de iconografía) y `SphereOrb` (`sphere-orb.tsx`, SVG original) están integrados en `dragon-card.tsx`. Decisión de diseño: su color es **independiente del Ki global del usuario** (no el color dinámico por nivel de Ki que sí usa el KiGauge) — cada Dragón es una meta con su propia identidad visual, y atarla al Ki global haría que todas las tarjetas cambiaran de color juntas según la salud financiera general; además evita competir con el KiGauge como único elemento con esa semántica de "color = nivel de Ki". Tampoco llevan glow — esa regla queda exclusiva al arco del KiGauge. En vez de un acento único, `src/lib/dragon-accent.ts` define una paleta fija de 3 colores (no personalizable por el usuario) según tipo/estado del Dragón — ahorro activo, deuda activa, completado — aplicada al DragonMotif, las SphereOrb, la barra superior de acento y la barra de progreso de cada tarjeta:
  - Ahorro (activo): `ki-saiyan` (dorado)
  - Deuda (activa): `ki-warrior` (naranja) — deliberadamente distinto de `ki-survival` (rojo), que queda reservado exclusivamente para alertas (presupuesto excedido, deuda no pagable); si la deuda usara el mismo rojo que su propia alerta, esta perdería contraste
  - Completado (cualquier tipo): `ki-saiyan2` (cian) — el estado tiene prioridad visual sobre el tipo
- Decisión no obvia (parte 1): para ambos tipos el progreso se deriva como `current_amount / target_amount`; en deuda, `current_amount` representa lo ya pagado (no el saldo restante) para que la fórmula de progreso sea simétrica entre `savings` y `debt`.
- Orden de ataque (columna `priority`, existía desde la parte 1 pero no tenía UI): `src/lib/dragon-priority.ts` tiene dos funciones puras — `assignMissingPriorities` (a los Dragones de deuda activos sin prioridad les asigna un secuencial por `created_at`, respetando los que ya se reordenaron a mano) y `getAttackOrder` (deriva posición/total/vecinos a partir de una lista ya ordenada). `src/app/(app)/dragons/page.tsx` normaliza y persiste las prioridades faltantes en cada carga de la página antes de renderizar; `swapDragonPriority` (Server Action en `dragons/actions.ts`, llamada directa sin formulario, como `resetBudget`) intercambia la prioridad entre dos Dragones adyacentes. `attack-order-controls.tsx` (cliente) dibuja "Orden de ataque #N de M" + flechas subir/bajar en `dragon-card.tsx`, solo cuando hay 2+ deudas activas.
- Comparador de estrategias (avalancha vs. bola de nieve), puramente informativo — no toca `priority` ni el orden manual de ataque de arriba. `src/lib/debt-payoff-simulator.ts` expone `simulateDebtPayoff(debts, strategy)`, un simulador puro mes a mes (tope de 600 meses, devuelve `not_converged` explícito si no liquida en ese plazo en vez de un loop infinito): concentra el pago extra combinado de todas las deudas en la deuda objetivo actual (mayor tasa primero en avalancha, menor saldo primero en bola de nieve) y, al liquidarse una, libera su pago mínimo al pool de la siguiente (cascada). Nota: el prompt original omitió `extraPayment` del tipo de entrada del simulador, pero el propio algoritmo lo requiere ("pool de extra combinado") — se agregó al tipo `DebtPayoffInput`. `debt-strategy-comparison.tsx` (Server Component, sin interactividad — es una comparación estática, no un simulador en vivo) corre ambas estrategias sobre los Dragones de deuda activos con pago definido y muestra meses/interés/orden de liquidación lado a lado más una línea de diferencia; se oculta si hay menos de 2 deudas activas, y muestra un mensaje explicativo (sin ocultar del todo) si hay 2+ pero menos de 2 con pago definido.
- Tabla `dragon_contributions` (migración `add_dragon_contributions`, **pendiente de `db push`** — la CLI volvió a fallar por permisos, mismo error 403 que `add_budgets`/`add_dragons`; aplicar manualmente). Se agregó porque un prompt pidió mostrar "último abono" por Dragón asumiendo que esta tabla ya existía — no era así (`contributeToDragon` solo actualizaba `dragons.current_amount`); se confirmó con el usuario antes de crear la tabla y ahora `contributeToDragon` también inserta una fila aquí en cada abono/pago. `dragons-summary.tsx` (resumen agregado arriba de la lista: total ahorrado, deuda total pendiente, interés total proyectado — excluye deudas sin pago definido o no pagables y lo indica con una nota) y el texto "Último abono: hace N días" en `dragon-card.tsx` (vía `src/lib/relative-time.ts`, función pura `formatRelativeDays`) leen de esta tabla. Como la tabla es nueva, cualquier Dragón con abonos previos a esta migración mostrará "Sin abonos registrados" hasta su próximo abono — es una limitación esperada, no un bug.
- `dragons-progress-chart.tsx`: gráfica comparativa de % de progreso (Tremor `BarList`, ver nota de integración arriba), plegada por defecto, dos listas separadas (Ahorro/Deuda) en vez de una sola con colores por barra (limitación deliberada de la integración de Tremor, ver nota); se omite si hay menos de 2 Dragones activos. `dragons-empty-state.tsx`: estado vacío cuando no hay Dragones activos, reutiliza `AuraScene` + `DragonMotif` ya existentes (no arte nuevo) y un botón que abre el mismo modal de creación — `create-dragon-dialog.tsx` ahora acepta `variant: "fab" | "inline"` para reusar el mismo `Dialog`/wizard con un trigger visual distinto según el contexto (FAB flotante vs. botón dentro del estado vacío).

**Fase 5 — Ki:** implementada (ver commit "feat: implement Ki score calculations and database integration"). Tabla `ki_scores` (migración `add_ki_scores`, un registro por usuario/mes, guarda `score` + `level_label`) alimentada desde el dashboard vía upsert. `src/lib/ki-calculations.ts` (aritmética pura de la fórmula de CLAUDE.md) + `src/lib/ki-engine.ts` (`calculateKi`, consultas a Supabase y ensamblado de insumos). Nota: esta sección no se documentó en su momento — si algo de esta fase choca con el código actual, el código es la fuente de verdad.

**Fase 6 — Nivel/Transformaciones:** en curso (4 de 4 partes, completa). Tabla `xp_events` (migración `add_xp_events`, **pendiente de `db push`** — mismo error 403 de permisos de la CLI que fases anteriores; aplicar manualmente) — una fila por concesión de XP, deduplicada con `unique(user_id, dedupe_key)` para que otorgar XP sea idempotente sin verificar manualmente en cada sitio. `src/lib/grant-xp.ts` (`grantXp` inserta y traga la violación de unique constraint devolviendo `granted: false`; `getTotalXp` suma XP total del usuario). `src/lib/level.ts` (`getLevelFromXp`, función pura, curva `100 + (N-1)×50` por nivel).
- XP diario (+10, dedupe por fecha) y semanal (+10/25/50/90 según días activos de la semana lunes-domingo, con lógica de "subir de tramo" sin duplicar el evento — `src/lib/weekly-xp.ts`, funciones puras separadas de las llamadas a Supabase) otorgados desde `addTransaction` (`dashboard/actions.ts`) al registrar cualquier movimiento.
- XP por Esfera completada (+50, dedupe `sphere:{dragon_id}:{sphere_index}`) otorgado desde `contributeToDragon` (`dragons/actions.ts`), comparando `getSphereProgress` antes/después del abono — si un abono cruza varias esferas de golpe se otorgan todas.
- XP por mes cerrado en presupuesto (+100, dedupe `budget:{primer_día_del_mes}`) y XP por Transformación (+300, dedupe `transformation:{primer_día_del_mes}`) otorgados desde `src/lib/ki-engine.ts` (`awardMonthlyXp`, llamada desde el dashboard justo después del upsert a `ki_scores`) — Transformación compara el `level_label` de `ki_scores` del mes anterior contra el actual usando el orden de `KI_LEVELS` (`src/lib/ki.ts`, ahora exportado, más `getKiLevelRank`); `wasMonthWithinBudget` (`src/lib/budget.ts`) reutiliza la misma lógica de `budget-summary.tsx` para el mes ya cerrado.
- `LevelBadge` (`level-badge.tsx`): Nivel + barra de XP + XP total, en la sección hero del dashboard junto al KiGauge pero en su propia tarjeta con acento `ki-saiyan2` — deliberadamente no comparte el color dinámico del KiGauge porque Nivel y Ki son conceptos distintos (Nivel nunca baja, Ki fluctúa).
- `TransformationOverlay` (`transformation-overlay.tsx`, cliente): celebración de pantalla completa cuando `awardMonthlyXp` devuelve `transformationJustHappened`, con auto-cierre (~4.5s) o clic para cerrar. Como el XP de Transformación ya está deduplicado por mes, la propia dedupe hace que el overlay solo aparezca una vez por Transformación real, sin necesidad de un estado adicional de "ya se mostró". Ver excepción de glow documentada arriba en "Sistema de diseño".

Roadmap completo: Fundamentos → Registro/Dashboard → Presupuesto → Dragones → Ki → Nivel/Transformaciones → Pulido.