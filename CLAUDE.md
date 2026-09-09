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

**Concepto de Auth ("Scouter"):** el login/signup se piensa como un visor de poder tipo Dragon Ball — "escaneas tu ki" para entrar. Componentes: `scouter-hud.tsx` (radar, barrido, contador de PODER), `hud-frame.tsx` (marco tipo visor con línea de escaneo), `auth-mode-toggle.tsx` (pestañas login/signup). Copy temático en los formularios ("Bienvenido de vuelta, guerrero", "Verificando ki..."). Esta metáfora (escanear/medir poder) es el patrón a seguir para futuras pantallas de "entrada" o verificación en la app — no solo decoración, la metáfora debe ajustarse a la función real de la pantalla.

## Cosas a evitar

- No agregar dependencias nuevas sin confirmarlo primero (proyecto personal, se prefiere mantener el stack acotado)
- No usar `service_role`/`anon` legacy keys
- No exponer la `secret key` (`sb_secret_...`) en ningún archivo con prefijo `NEXT_PUBLIC_`
- No usar `middleware.ts` — el proyecto usa `proxy.ts` (convención renombrada en Next.js 16)
- No editar una migración ya aplicada con `db push` — crear una migración nueva que corrija lo necesario

## Fase actual

**Fase 1 — Fundamentos:** COMPLETA. Proyecto creado, Supabase Cloud configurado, cliente `@supabase/ssr` listo (`client.ts`, `server.ts`, `proxy.ts`). Supabase CLI vinculado, migración `init_schema` aplicada (tablas `profiles` y `categories` con RLS). Auth (login/signup) implementado con concepto "Scouter". Sistema de diseño base establecido (tokens de Ki, tipografía, KiGauge, AuraScene, DragonMotif, SphereOrb).

Roadmap completo: Fundamentos → Registro/Dashboard → Presupuesto → Dragones → Ki → Nivel/Transformaciones → Pulido.