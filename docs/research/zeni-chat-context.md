# Investigación: contexto para el futuro chat asistente de Zeni

Investigación de código (no de CLAUDE.md) realizada el 2026-11-02 sobre la rama `feat/cashflow-simulator`. Todo lo afirmado aquí fue verificado leyendo el archivo citado; donde CLAUDE.md decía algo distinto de lo que el código muestra, se marca explícitamente como **discrepancia**.

## 0. Resumen ejecutivo (máximo 15 líneas)

Zeni es una app Next.js App Router 100% Server Components + Server Actions, sin ninguna ruta dinámica (`[id]`) — toda "selección de recurso" se hace por query params (`?month=`, `?period=`, `?tab=`), nunca por path. No existe ningún endpoint de API (`route.ts`) ni integración con Anthropic/OpenAI/ningún SDK de IA, ni `.env.example`, ni tests automatizados (`*.test.*`/`*.spec.*` no existen pese a que CLAUDE.md y un comentario en `src/lib/streak.ts` mencionan un arnés de pruebas). El esquema vive en 28 migraciones SQL (confirmadas una por una); no hay `database.types.ts` generado, así que las migraciones son la única fuente de verdad del esquema. RLS está habilitado en todas las tablas de usuario sin excepción. Las cantidades de dinero se guardan como `numeric(12,2)` en Postgres y se manejan como `number` (decimal) en todo el código TypeScript, **excepto** el motor de proyección (`src/lib/projection/engine.ts`), que opera en centavos enteros internamente — es la única parte del código con esa protección contra errores de punto flotante. Ki, Nivel, Dragones y Presupuesto están completos y funcionando con fórmulas puras bien separadas de las consultas a Supabase (buen punto de apoyo para herramientas del chat). La Fase 14 (Proyección) está más avanzada que lo que CLAUDE.md etiqueta como "3 de 7 partes": ya tiene edición en línea, importación de transacciones reales y comparación presupuesto-vs-real, pero **no tiene gráfica** (CLAUDE.md dice que Recharts se usaría; no hay ningún import de `recharts` en el repo) ni generación automática de líneas desde Recurrentes/Presupuesto/Deudas (el check constraint de `source` admite `'budget'|'recurring'|'debt'` pero ningún código los escribe — solo `'manual'` y `'transaction'`). El catálogo de logros tiene 61 entradas verificadas por conteo de `slug:`, no 59 como afirma CLAUDE.md. Para el chat: hay abundante lógica pura y reutilizable en `src/lib/`, pero todo asume `createClient()` de servidor con cookies de sesión — no hay capa de servicio pensada para ser llamada desde un contexto de "snapshot" fuera de una petición HTTP normal.

## 1. Mapa de pestañas

Todas las rutas viven bajo `src/app/(app)/` (autenticadas, con `layout.tsx` que monta `AppHeader`) o `src/app/(auth)/` (login/signup). Navegación en `src/components/app-nav.tsx` (cliente, `usePathname()` con `startsWith` para resaltar el activo) y `src/components/app-header.tsx` (servidor, muestra Saldo Disponible). No hay ninguna carpeta `[algo]` bajo `src/app` — confirmado con `find`.

| Ruta | Propósito | Estado | Datos que usa | Tipo |
|---|---|---|---|---|
| `/dashboard` | Centro de comando: 4 StatTiles (Saldo del periodo/Ingresos/Gastos/Ki), gráfica de tendencia, resumen de Nivel/Dragones/Presupuesto/50-30-20, recurrentes pendientes, movimientos recientes | Implementado | `transactions`, `categories`, `dragons`, `budgets`, `ki_scores`, `recurring_transaction_occurrences`, `user_achievements`, más `calculateKi`/`awardMonthlyXp`/`computeFiftyThirtyTwenty` | Server Component (`src/app/(app)/dashboard/page.tsx`) con varios hijos cliente (diálogo de transacción, toasts) |
| `/transactions` | Historial de movimientos con buscador (`?q=`) server-side (`.ilike`) | Implementado | `transactions` | Server Component |
| `/budget` | Presupuesto por categoría, histórico por semana/mes/año, navegador de mes (`?month=`) | Implementado | `categories`, `budgets`, `transactions` | Server Component |
| `/dragons` | Lista de Dragones activos/completados, tabs (`?tab=savings\|debt`), comparador de estrategias | Implementado | `dragons`, `dragon_contributions` | Server Component |
| `/recurring` | CRUD de recurrentes + bandeja implícita (la bandeja de aprobación vive en el dashboard, no aquí) | Implementado | `recurring_transactions` | Server Component |
| `/projection` | Escenarios de proyección mensual por mes calendario | Implementado parcial (ver sección 4) | `projection_scenarios`, `projection_lines`, `transactions`, `categories` | Server Component |
| `/training` | Pantalla de rachas (`computeCurrentStreak`/`computeBestStreak`), sin relación con el Sistema de Logros | Implementado | `transactions` | Server Component (`src/app/(app)/training/page.tsx`) |
| `/instruments` | Índice de instrumentos (2 tarjetas) | Implementado | — | Server Component |
| `/instruments/50-30-20` | Detalle de la Regla 50/30/20, histórico, navegador de mes | Implementado | `transactions`, `categories`, `dragon_contributions` | Server Component |
| `/instruments/cashflow` | Simulador de flujo de efectivo, 120 buckets de 30 días, todo client-side tras cargar datos base | Implementado | `recurring_transactions`, `dragons`, `dragon_contributions` (carga inicial), luego 100% cliente | Server Component que pasa `getSimulationBaseInput` a un Client Component (`cashflow-simulator.tsx`) |
| `/achievements` | Vitrina de los 61 logros agrupados por 12 categorías | Implementado | `user_achievements` + catálogo estático `achievements.ts` | Server Component |
| `/categories` | CRUD de categorías + clasificación 50/30/20 (`budget_group`) + activar/desactivar | Implementado | `categories` | Server Component |
| `/settings` | Perfil (nombre, avatar), saldo inicial, día de inicio de periodo, reset de cuenta | Implementado | `profiles` | Server Component |
| `/login`, `/signup` | Auth "Scouter" | Implementado | `auth.users` vía Supabase Auth | Server Component wrapper + Client Component de formulario |
| `/` (`src/app/page.tsx`) | No inspeccionado en detalle; probablemente redirección a `/dashboard` o `/login` | No confirmado a fondo | — | — |

No existe ningún `route.ts` (API Handler) en todo `src/app`. No existe ningún "abrir recurso individual" vía URL — abrir el detalle de un Dragón, una transacción o un escenario de proyección siempre es una interacción en la misma página (diálogo, fila expandible, tab seleccionado de la lista ya cargada), nunca una navegación a una URL con el id del recurso. Esto es relevante para el futuro chat: no hay un concepto de "URL canónica de un recurso" al que el chat pueda enlazar o que pueda leer de la URL salvo filtros de lista.

## 2. Esquema de base de datos

28 migraciones (`supabase/migrations/*.sql`), todas leídas íntegras. No hay `database.types.ts` en el repo — no hay forma de contrastar contra tipos generados; las migraciones SQL son la única fuente de verdad. Todas las tablas de usuario tienen RLS habilitado y policy `auth.uid() = user_id` (o `= id` en `profiles`) — ninguna tabla queda sin RLS.

| Tabla | Columnas clave | RLS |
|---|---|---|
| `profiles` | `id` (=auth.users.id), `name`, `currency` (default MXN, no se usa en ningún lugar visto salvo el formatter hardcodeado `es-MX`/MXN en varios componentes), `avatar_id`, `month_start_day` (1-28, check), `initial_balance` (default 0) | SELECT propio + UPDATE propio (migración separada corrigió un olvido de policy de UPDATE) |
| `categories` | `user_id`, `name`, `type` (`income`\|`expense`, check), `active` (default true), `budget_group` (`necesidad`\|`deseo`\|`ahorro`\|null, check, reemplazado dos veces) | ALL propio |
| `transactions` | `user_id`, `category_id` (FK on delete set null), `type`, `amount` (check > 0), `occurred_on`, `dragon_id` (FK on delete set null), `recurring_transaction_id` (FK on delete set null) | ALL propio |
| `budgets` | `user_id`, `category_id` (FK on delete cascade), `amount` (check > 0), unique(user_id, category_id) | ALL propio |
| `dragons` | `user_id`, `name`, `type` (`savings`\|`debt`), `target_amount`, `current_amount`, `status` (`active`\|`completed`), `priority`, `institution`, `interest_rate`, `minimum_payment`, `extra_payment`, `payment_schedule` (`amortized`\|`fixed_plan`\|`fixed_weekly`), `principal_amount`, `weekly_payment`, `total_installments`, `payment_day_of_week`, `disbursement_date`, `payoff_today_amount`, `payoff_today_updated_at` | ALL propio |
| `dragon_contributions` | `dragon_id` (FK cascade), `user_id`, `amount` (check > 0), `transaction_id` (FK on delete cascade, unique — ancla 1:1 con la transacción) | ALL propio |
| `ki_scores` | `user_id`, `year_month` (día 1 del mes), `score` numeric(5,2), `level_label`, unique(user_id, year_month) | ALL propio |
| `xp_events` | `user_id`, `type`, `amount` integer, `dedupe_key`, unique(user_id, dedupe_key) | ALL propio |
| `user_achievements` | `user_id`, `achievement_slug`, `unlocked_at`, unique(user_id, achievement_slug) | SELECT propio + INSERT propio (sin UPDATE/DELETE) |
| `recurring_transactions` | `user_id`, `name`, `type`, `amount`, `category_id`, `frequency` (`weekly`\|`biweekly`\|`monthly`), `day_of_week`, `day_of_month`, `next_occurrence_date`, `auto_apply`, `active` | ALL propio |
| `recurring_transaction_occurrences` | `recurring_transaction_id` (FK cascade), `user_id`, `scheduled_date`, `status` (`pending`\|`applied`\|`rejected`\|`insufficient_funds`), `transaction_id` (FK set null), `resolved_at` | ALL propio |
| `projection_scenarios` | `user_id`, `month`, `name`, `opening_balance`, `buffer_percent` (check >= 0) | ALL propio |
| `projection_lines` | `scenario_id` (FK cascade), `user_id` (denormalizado), `kind` (`income`\|`expense`), `label`, `amount` (check > 0), `actual_amount` (nullable, check >= 0 o null), `expected_date`, `category_id` (FK set null), `source` (`manual`\|`budget`\|`recurring`\|`debt`\|`transaction`, check — solo `manual`/`transaction` se escriben en código), `source_ref`, `included`, `sort_order` | ALL propio |

Funciones/triggers SQL:
- `handle_new_user()` (trigger `on_auth_user_created` en `auth.users`): crea `profiles` + 9 categorías por defecto (`20260909045156_init_schema.sql`, ampliado en `20260909064717_seed_default_categories.sql`).
- `reset_account()` (`20260914033818_add_reset_account_function.sql`): `security invoker`, borra todo el historial financiero del usuario autenticado (orden: `dragon_contributions`, `recurring_transaction_occurrences`, `transactions`, `recurring_transactions`, `dragons`, `budgets`, `ki_scores`, `xp_events`, `user_achievements`, `categories`) y recrea las categorías por defecto. No toca `profiles`.
- `pg_cron`/`pg_net`: job `process-recurring-transactions-daily` (todos los días 6:00am UTC) que llama a la Edge Function vía `net.http_post`, leyendo `apikey` desde `vault.decrypted_secrets` (`process_recurring_project_url`, `process_recurring_secret_key` — nombres de secreto, no valores). Dos migraciones: la versión inicial usaba el nombre equivocado `project_url` y se corrigió con un segundo `cron.schedule` (upsert por nombre de job), sin editar la migración original.

No hay vistas ni RPCs expuestas además de `reset_account`. El catálogo de instituciones (`src/lib/institutions.ts`) y el catálogo de logros (`src/lib/achievements.ts`) viven en código, no en tablas — son listas estáticas `as const`.

## 3. Reglas de negocio implementadas vs. especificadas

| Regla | Dónde está en el código | Diferencia con la spec (CLAUDE.md), si hay |
|---|---|---|
| Saldo Total/Disponible | `src/lib/total-balance.ts` (`getTotalBalance`, `getAvailableBalanceAsOf`) | Coincide con CLAUDE.md Fase 11 |
| Colchón de balance del periodo | `src/lib/monthly-balance.ts` (`computeNetBalanceWithCushion`) | Coincide; el intento anterior con `reserved_for_next_period` fue revertido por una migración que elimina la columna (`20260916192325_drop_reserved_income_flag.sql`) — la columna física sigue en la base hasta aplicar esa migración (pendiente de `db push` manual según CLAUDE.md, no verificable desde el código) |
| Fórmula de Ki | `src/lib/ki-calculations.ts` (`computeFinalScore`: 0.35 Salud + 0.35 Momentum + 0.20 Presupuesto + 0.10 Constancia) | Coincide exactamente con CLAUDE.md |
| Niveles/etiquetas de Ki | `src/lib/ki.ts` (`KI_LEVELS`, 6 niveles 0-15/16-35/36-50/51-65/66-85/86-100) | Coincide |
| Salvaguarda de Ki | `src/lib/ki-calculations.ts` (`applySafeguard`, tope 35) + `ki-engine.ts` (`bothMonthsNegative`, `missedMinimumPayment`) | Coincide |
| Nivel/XP | `src/lib/level.ts` (`100 + (N-1)*50` por nivel) | Coincide |
| Logros: "53 logros" | `src/lib/achievements.ts` | **Discrepancia confirmada por conteo real: 61 entradas con `slug:`**, no 59 (como dice el propio comentario del archivo, que a su vez corrige el "53" original) ni 53 |
| Proyección: motor en centavos | `src/lib/projection/engine.ts` (`toCents`/`fromCents`) | Coincide; es la única parte del código con esta protección |
| Proyección: generación automática de líneas desde Recurrentes/Presupuesto/Deudas | — | **No implementado.** El check constraint de `source` admite `budget`/`recurring`/`debt`, pero solo `addProjectionLine` (`source: "manual"`) y `addProjectionLinesFromTransactions` (`source: "transaction"`) insertan filas en `projection_lines`. Confirmado con grep de `source:` en `projection/actions.ts` |
| Proyección: gráfica de saldo diario (Recharts) | — | **No implementado.** No hay ningún import de `recharts` en el repo (`grep -rl "recharts" src` vacío) |
| Dragones de deuda: 3 modalidades de pago | `dragons.payment_schedule` (`amortized`/`fixed_plan`/`fixed_weekly`), `src/lib/debt-projection.ts`, `src/lib/fixed-weekly-debt.ts` | Coincide |
| Simulador avalancha/bola de nieve | `src/lib/debt-payoff-simulator.ts` (`simulateDebtPayoff`, tope 600 meses) | Coincide |
| Simulador de flujo de efectivo (buckets de 30 días) | `src/lib/cashflow-simulation.ts` + `cashflow-simulation-data.ts` | Coincide con la decisión explícita de CLAUDE.md de usar buckets, no meses calendario |
| Edge Function de recurrentes (`auth: "secret"`, `withSupabase`) | `supabase/functions/process-recurring-transactions/index.ts` | Coincide con la descripción de CLAUDE.md, incluida la duplicación intencional de `computeNextOccurrenceDate` |
| "Fase 14, 3 de 7 partes" | `src/app/(app)/projection/*` | El código real va más allá de la "parte 3" descrita (edición en línea, importación de transacciones, `actual_amount`, resumen conectado al motor) pero sin la gráfica ni la generación automática — es un estado intermedio no descrito limpiamente por ninguna de las etiquetas de parte en CLAUDE.md |

## 4. Ki, Nivel, Dragones, presupuesto y proyección: estado actual

- **Ki**: completo. `calculateKi(userId, referenceDate)` en `src/lib/ki-engine.ts:98` hace todas las consultas (transacciones de 3 meses, dragones, contribuciones, categorías, presupuestos) y delega la aritmética a `ki-calculations.ts`. Se persiste en `ki_scores` vía upsert desde `dashboard/page.tsx:192`. `awardMonthlyXp` (`ki-engine.ts:270`) otorga XP de mes-en-presupuesto y Transformación, y dispara varios evaluadores de logros.
- **Nivel/XP**: completo. `getLevelFromXp`/`getXpNeededForNextLevel` en `src/lib/level.ts`; fuente de XP: diario, semanal (`weekly-xp.ts`), esferas, logros, bono de "garantizar nivel" (`grant-achievement.ts`), mes en presupuesto, Transformación.
- **Dragones**: completo. Ahorro y deuda, 3 modalidades de pago para deuda, esferas (`spheres.ts`, 7 hitos derivados, nunca persistidos), orden de ataque (`dragon-priority.ts`), acento visual por tipo/estado (`dragon-accent.ts`), reconciliación transacción↔Dragón (`sync-dragon-link.ts`) con ajuste por diferencia en los 4 casos (crear/quitar/mismo Dragón monto distinto/cambio de Dragón).
- **Presupuesto**: completo. Sugerencia = promedio de 3 meses calendario completos (`budget.ts:getSuggestedBudget`), override manual en `budgets`, histórico por semana/mes/año (`getCategorySpendingHistory`).
- **Proyección mensual**: parcial, más avanzada que "3 de 7" pero sin gráfica ni generación automática (ver sección 3). El motor puro (`engine.ts`) ya soporta presupuesto vs. real (`actualAmount`), pero la UI de daily balance chart que pedía la especificación original no existe.

## 5. Funciones de cálculo disponibles (base de las herramientas del chat)

Todas son funciones puras de TypeScript salvo donde se indica que reciben un `SupabaseClient` (en ese caso hacen I/O a Postgres respetando RLS porque siempre usan el cliente de sesión del usuario — nunca hay un cliente `service_role`/admin en el código Next.js, solo en la Edge Function vía `ctx.supabaseAdmin`).

| Función | Archivo | Firma | Entradas | Salidas |
|---|---|---|---|---|
| `calculateKi` | `src/lib/ki-engine.ts:98` | `(userId: string, referenceDate?: Date) => Promise<KiCalculationResult>` | userId, fecha de referencia (default hoy) | `{ score, level, breakdown, safeguardApplied }` |
| `awardMonthlyXp` | `src/lib/ki-engine.ts:270` | `(userId, currentLevelLabel, referenceDate?) => Promise<{transformationJustHappened, achievements}>` | userId, etiqueta de Ki actual | XP otorgado + logros desbloqueados |
| `computeFinalScore`/`computeSaludActual`/`computeMomentum`/`computePresupuesto`/`computeConstancia`/`applySafeguard` | `src/lib/ki-calculations.ts` | aritmética pura, ver firmas en el archivo | números/breakdowns | número 0-100 |
| `getKiLevel`/`getKiProgressToNextLevel`/`getKiLevelRank` | `src/lib/ki.ts` | `(score: number) => KiLevel` / etc. | score | nivel/etiqueta/rank |
| `getLevelFromXp` | `src/lib/level.ts:14` | `(totalXp: number) => LevelInfo` | XP total | `{ level, xpIntoLevel, xpForNextLevel }` |
| `getXpNeededForNextLevel` | `src/lib/level.ts:33` | `(totalXp: number) => number` | XP total | XP faltante |
| `getTotalXp` | `src/lib/grant-xp.ts:27` | `(supabase, userId) => Promise<number>` | — | suma de `xp_events.amount` |
| `grantXp` | `src/lib/grant-xp.ts:11` | `(supabase, userId, type, amount, dedupeKey) => Promise<{granted}>` | — | idempotente vía unique constraint |
| `grantAchievement` | `src/lib/grant-achievement.ts:21` | `(supabase, userId, slug) => Promise<GrantAchievementResult>` | — | `{granted:true, achievement}` o `{granted:false}` |
| `getTotalBalance` | `src/lib/total-balance.ts:22` | `(supabase, userId) => Promise<TotalBalance>` | — | `{totalBalance, availableBalance, savedInDragons}` |
| `getAvailableBalanceAsOf` | `src/lib/total-balance.ts:69` | `(supabase, userId, asOfDate: Date) => Promise<number>` | fecha de corte | saldo disponible histórico |
| `computeNetBalanceWithCushion` | `src/lib/monthly-balance.ts:9` | `(rawBalance, availableBalanceEndOfPreviousPeriod) => number` | balance bruto, colchón disponible | balance neto |
| `getSuggestedBudget` | `src/lib/budget.ts:92` | `(supabase, userId, categoryId, now?) => Promise<SuggestedBudget>` | — | `{available:true, amount}` o `{available:false}` |
| `getAverageMonthlyExpense` | `src/lib/budget.ts:104` | `(supabase, userId, now?) => Promise<SuggestedBudget>` | — | gasto promedio total, misma regla de 3 meses |
| `wasMonthWithinBudget` | `src/lib/budget.ts:118` | `(supabase, userId, monthStart: Date) => Promise<boolean>` | mes | sí/no cumplió presupuesto |
| `getCategorySpendingHistory` | `src/lib/budget.ts:208` | `(supabase, userId) => Promise<SpendingHistory>` | — | buckets semana/mes/año |
| `resolveBudgetedAmount` | `src/lib/budget.ts:16` | `(category: BudgetCategory) => number \| null` | — | monto aplicable (override o sugerencia) |
| `computeFiftyThirtyTwenty` | `src/lib/fifty-thirty-twenty.ts:91` | `(supabase, userId, month: Date) => Promise<FiftyThirtyTwentyResult \| null>` | mes calendario | porcentajes necesidad/deseo/ahorro |
| `getFiftyThirtyTwentyHistory` | `src/lib/fifty-thirty-twenty.ts:143` | `(supabase, userId, months?) => Promise<FiftyThirtyTwentyMonth[]>` | — | histórico mensual |
| `projectDebt` | `src/lib/debt-projection.ts:13` | `(DebtProjectionInput) => DebtProjection` | saldo, tasa, pago min/extra | meses restantes/interés o estado "no pagable" |
| `simulateDebtPayoff` | `src/lib/debt-payoff-simulator.ts:19` | `(debts: DebtPayoffInput[], strategy) => DebtPayoffResult` | lista de deudas, estrategia | meses totales, interés, orden de liquidación (o `not_converged`) |
| `computeFixedWeeklyTotals`/`deriveInstallmentsPaid`/`computePayoffTodaySavings` | `src/lib/fixed-weekly-debt.ts` | puras | — | totales de deuda de plazo fijo semanal |
| `getSphereProgress` | `src/lib/spheres.ts:3` | `(currentAmount, targetAmount) => boolean[]` | montos | 7 hitos booleanos |
| `assignMissingPriorities`/`getAttackOrder` | `src/lib/dragon-priority.ts` | puras | lista de Dragones | asignaciones/orden de ataque |
| `getDragonAccent` | `src/lib/dragon-accent.ts:17` | `(dragon) => DragonAccent` | — | `"savings"\|"debt"\|"completed"` |
| `computeProjection` | `src/lib/projection/engine.ts:51` | `(ProjectionScenarioInput, today?) => ProjectionResult` | líneas + balance inicial + colchón% | totales presupuesto/real, balance diario, alertas |
| `runCashflowSimulation` | `src/lib/cashflow-simulation.ts` (no leído completo, firma visible por tipos) | `(SimulationInput) => ...` | recurrentes/deudas/ahorros habilitados + horizonte | proyección mensual hasta 120 meses |
| `getSimulationBaseInput` | `src/lib/cashflow-simulation-data.ts:47` | `(supabase, userId) => Promise<Omit<SimulationInput,"horizonMonths">>` | — | input real del usuario para el simulador |
| `computeActiveStreakDays` | `src/lib/streak.ts:65` | `(activityDates: Date[], today: Date) => number` | fechas de actividad | racha flexible (7+ días de hueco rompe) |
| `computeCurrentStreak`/`computeBestStreak` | `src/lib/streak.ts` | puras, racha estricta | fechas | racha actual/mejor histórica (usadas solo por `/training`) |
| `computeNextOccurrenceDate` | `src/lib/recurring-schedule.ts:9` | `(frequency, fromDate, dayOfWeek?, dayOfMonth?) => Date` | — | próxima fecha de ocurrencia (duplicada en la Edge Function) |
| `insertTransaction` | `src/lib/create-transaction.ts:26` | `(supabase, InsertTransactionParams) => Promise<InsertTransactionResult>` | — | único punto de inserción en `transactions`, dispara logros secretos |
| `syncDragonLinkForTransaction`/`revertDragonLinkForTransaction` | `src/lib/sync-dragon-link.ts` | ver firmas en archivo | — | reconciliación de vínculo transacción↔Dragón |
| `computePeriodStart`/`periodRangeFromStart`/`shiftPeriodStart` | `src/lib/period.ts` | puras | fecha, día de inicio de periodo | rango/fecha de periodo configurable |
| `getMonthlyIncomeExpenseSeries` | `src/lib/monthly-summary.ts` (no leído completo) | `(supabase, userId) => Promise<MonthlyFlow[]>` | — | serie de 6 meses ingresos/gastos |
| `sanitizeAmountInput` | `src/lib/amount.ts:3` | `(raw: string) => string` | input crudo | string numérico saneado (UI) |

## 6. Propuesta de tipos TypeScript para el snapshot del chat

Basado estrictamente en lo que existe hoy. Todo lo marcado **PLANEADO** no tiene código de respaldo confirmado.

```typescript
// Identidad y preferencia
type ChatProfileSnapshot = {
  userId: string; // auth.uid(), NUNCA enviar el email fuera de lo necesario para el propio modelo de datos
  name: string | null;
  currency: string; // hoy siempre "MXN" en la práctica; profiles.currency existe pero no se usa condicionalmente en el código visto
  monthStartDay: number; // 1-28
};

// Saldo
type ChatBalanceSnapshot = {
  totalBalance: number;       // getTotalBalance
  availableBalance: number;   // getTotalBalance / getAvailableBalanceAsOf
  savedInDragons: number;
};

// Ki (del mes calendario real, no del "periodo")
type ChatKiSnapshot = {
  score: number; // 0-100
  levelLabel: string; // una de KI_LEVELS
  breakdown: { saludActual: number; momentum: number; presupuesto: number; constancia: number };
  safeguardApplied: boolean;
};

// Nivel/XP
type ChatLevelSnapshot = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp: number;
};

// Periodo actual (el "mes" financiero configurable, Fase 10)
type ChatPeriodSnapshot = {
  start: string; // ISO date
  end: string;   // ISO date, exclusivo
  income: number;
  expenses: number;
  rawBalance: number;
  netBalance: number; // tras colchón
  cushionApplied: number;
  uncoveredShortfall: number;
};

// Dragones (lista resumida, sin exponer cada fila completa de la tabla)
type ChatDragonSnapshot = {
  id: string;
  name: string;
  type: "savings" | "debt";
  status: "active" | "completed";
  progressPct: number; // current_amount/target_amount
  attackOrderRank?: number; // solo deudas activas con 2+ deudas
};

// Presupuesto
type ChatBudgetCategorySnapshot = {
  categoryId: string;
  name: string;
  spent: number;
  budgeted: number | null; // resolveBudgetedAmount; null = sin historial suficiente
};

// Regla 50/30/20
type ChatFiftyThirtyTwentySnapshot = {
  necessityPct: number;
  wantPct: number;
  savingsPct: number;
  unclassifiedPct: number;
} | null; // null si no hay ingreso ese mes

// Contexto de navegación — LA PARTE MÁS INCIERTA, ver sección 9
type ChatCurrentViewSnapshot = {
  pathname: string; // ej. "/dragons", "/budget" — usePathname ya existe en AppNav, reutilizable
  // PLANEADO: ningún mecanismo existente expone al chat "qué escenario de
  // proyección", "qué mes del histórico" o "qué tab de Dragones" está viendo
  // el usuario sin construir un puente nuevo (ver sección 9).
};

// Logros (solo lo desbloqueado — ver sección 7 sobre logros secretos)
type ChatAchievementSnapshot = {
  slug: string;
  name: string;
  category: string;
  unlockedAt: string;
};

type ChatSnapshot = {
  profile: ChatProfileSnapshot;
  balance: ChatBalanceSnapshot;
  ki: ChatKiSnapshot;
  level: ChatLevelSnapshot;
  period: ChatPeriodSnapshot;
  dragons: ChatDragonSnapshot[];
  budgetCategories: ChatBudgetCategorySnapshot[];
  fiftyThirtyTwenty: ChatFiftyThirtyTwentySnapshot;
  achievements: ChatAchievementSnapshot[];
  currentView?: ChatCurrentViewSnapshot; // PLANEADO: mecanismo de captura no existe todavía
  // PLANEADO — nada de esto tiene función/endpoint dedicado hoy, habría que
  // construirlo: histórico conversacional, "resumen del escenario de
  // proyección activo", "resultado del simulador de flujo de efectivo en
  // curso" (ese vive 100% en estado de cliente, nunca se persiste).
};
```

## 7. Datos sensibles que NO deberían enviarse al modelo

- `profiles.id` / `auth.users.id` (UUID): identificador interno, no debería aparecer en el texto visible al modelo salvo como clave opaca de uso interno de la herramienta, nunca en el prompt narrado.
- Ningún email ni dato de autenticación vive en las tablas de `public` inspeccionadas — Auth lo maneja Supabase (`auth.users`), fuera del esquema público. Aun así, si el snapshot alguna vez toca `auth.users` (no lo hace hoy en ningún archivo leído), el email no debería pasar al modelo sin necesidad explícita.
- `dragons.institution`: id de banco/fintech (`src/lib/institutions.ts`) — es información financiera real del usuario (con qué banco tiene una deuda), sensible aunque no sea un "secreto técnico"; considerar si el chat debe verla sin más contexto.
- `transactions.description` / `dragons.name`: texto libre escrito por el usuario — puede contener cualquier cosa (nombres de terceros, notas personales). Debe tratarse como dato de usuario, no como metadata segura de enviar sin filtrar.
- Nombres de secretos de Vault (`process_recurring_project_url`, `process_recurring_secret_key`) y cualquier variable de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) — nunca deben aparecer en un snapshot de chat ni en logs compartidos con el modelo.
- Logros "secretos" (categoría L, `secret: true` en `achievements.ts`): su `description` no debe mostrarse al usuario hasta desbloquearlos (`achievement-card.tsx` ya respeta esto en la UI) — el chat debería seguir la misma regla y no filtrar la condición de desbloqueo de un logro secreto todavía no obtenido.
- `recurring_transaction_occurrences`/`xp_events`/`user_achievements` no tienen columnas sensibles por sí mismas, pero son historial de comportamiento financiero del usuario — tratar con el mismo cuidado que `transactions`.

## 8. Riesgos y huecos

- **No hay infraestructura de IA en absoluto todavía**: sin SDK de Anthropic instalado, sin rutas de streaming, sin runtime edge/node configurado explícitamente para esto (`next.config.ts` solo tiene `reactCompiler: true`), sin variables de entorno relacionadas. Todo el trabajo de integración del chat empieza desde cero.
- **Sin capa de servicio reutilizable fuera de Server Components/Actions**: cada función de `src/lib` espera un `SupabaseClient` ya autenticado vía cookies (`createClient()` de `src/lib/supabase/server.ts`). Para que el chat llame estas funciones como "herramientas", hay que decidir cómo obtiene ese cliente (¿dentro de la misma petición Next.js? ¿una Route Handler nueva que arme el cliente de sesión?) — no hay precedente de llamarlas fuera de ese contexto.
- **Sin tests**: no hay ningún archivo `*.test.*`/`*.spec.*` en el repo a pesar de que CLAUDE.md y un comentario en `src/lib/streak.ts` ("ver también src/lib/streak.test.ts") lo mencionan — ese archivo no existe. Cualquier herramienta nueva para el chat no tendrá cobertura de regresión previa que la respalde.
- **Sin "vista actual" capturable de forma genérica**: `usePathname()` solo existe en `AppNav` (cliente). No hay un mecanismo compartido para que un componente de chat (probablemente también cliente, flotante) sepa en qué pestaña/tab/mes/escenario está parado el usuario sin instrumentar cada página.
- **Dos columnas "fantasma" pendientes de migración manual** (según CLAUDE.md, no verificable desde el código si ya se aplicaron en la nube): `transactions.reserved_for_next_period` (debería estar eliminada) y varias migraciones marcadas "pendiente de db push" en fases anteriores. Si el chat alguna vez lee el esquema real de Supabase Cloud en vez de las migraciones locales, podría encontrar columnas que el código ya no usa, o le falten columnas que el código sí espera.
- **`profiles.currency` no se usa dinámicamente**: el formateo de moneda está hardcodeado a `es-MX`/`MXN` en varios componentes (`dashboard/page.tsx:36-40` y otros) — si el chat alguna vez narra montos, debe asumir MXN, no leer `currency` como si fuera respetada en todo el código.
- **Inconsistencia de conteo de logros**: 61 reales vs. "59" (comentario del propio archivo) vs. "53" (documento fuente citado por CLAUDE.md). Cualquier herramienta de chat que cuente logros debe usar `ACHIEVEMENTS.length` en runtime, nunca un número hardcodeado de la documentación.
- **Proyección sin gráfica ni generación automática**: si el chat necesita explicar "cómo va tu mes proyectado", solo puede apoyarse en `computeProjection` (totales, alertas, día a día en memoria) — no hay una superficie visual de la que extraer contexto adicional más allá de lo que ya calcula el motor.

## 9. Preguntas abiertas

- ¿`src/app/page.tsx` (ruta raíz) redirige a `/dashboard` o `/login`? No se inspeccionó su contenido completo — relevante para saber qué ve un usuario sin sesión.
- No se confirmó el contenido completo de `src/lib/cashflow-simulation.ts` (el motor del simulador de flujo) más allá de sus tipos de entrada; sus funciones exactas (`runCashflowSimulation` y posibles auxiliares) no se leyeron línea por línea.
- No se confirmó el contenido completo de `src/lib/monthly-summary.ts` (`getMonthlyIncomeExpenseSeries`) más allá de su uso desde `dashboard/page.tsx`.
- No se confirmó si las migraciones marcadas por CLAUDE.md como "pendientes de `db push` manual" (ej. `drop_reserved_income_flag`, `add_profile_month_start_day` en su momento, etc.) ya se aplicaron en Supabase Cloud — el código local asume que sí, pero esto es un estado de infraestructura externo al repo, no verificable solo con los archivos.
- No se revisó `achievement-engine.ts` línea por línea (es un archivo grande con ~12 categorías de evaluadores) — se confirmó su existencia y los puntos de llamada documentados por CLAUDE.md, pero no cada regla individual de cada logro.
- No se abrió `src/app/page.tsx`, `src/app/(app)/training/page.tsx` en detalle, ni los componentes de UI (`*.tsx` en `src/components/`) salvo los pocos citados arriba — el inventario de componentes de presentación queda fuera de esta pasada (se priorizó rutas, esquema y lógica de cálculo, como pedía el encargo).
- No se intentó conectar a Supabase Cloud ni correr `supabase migration list` (fuera del alcance, tarea estrictamente de solo lectura de archivos locales) — cualquier afirmación sobre el estado real de la base en la nube proviene únicamente de las notas de CLAUDE.md, no de verificación directa.
