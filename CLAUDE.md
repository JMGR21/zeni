@AGENTS.md

# Zeni — Contexto del proyecto

App de finanzas personales gamificada (temática Dragon Ball) para uso personal. Convierte el manejo de dinero en un sistema de progreso: registrar ingresos/gastos, presupuesto sugerido, metas (Dragones) de ahorro y deuda, y un score de salud financiera (Ki) con niveles de energía.

Proyecto personal, sin usuarios externos por ahora. Prioriza simplicidad y código legible sobre arquitectura enterprise.

## Stack

- Next.js (App Router, TypeScript, `src/`)
- pnpm como gestor de paquetes
- Tailwind CSS + shadcn/ui
- Tremor (o Recharts) para gráficas
- Supabase Cloud (Postgres + Auth + Storage) — NO auto-alojado
- Cliente de Supabase vía `@supabase/ssr` (no uses `@supabase/auth-helpers-nextjs`, está deprecado)
- Deploy en Vercel
- Claves de Supabase: usar `sb_publishable_...` y `sb_secret_...` (formato nuevo). NO usar `anon`/`service_role` (legacy, en deprecación)

## Comandos clave

```bash
pnpm dev      # desarrollo local
pnpm build    # build de producción
pnpm lint     # lint
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
  middleware.ts          # refresco de sesión de Supabase
```

## Convenciones de dominio (importante)

Este proyecto usa lenguaje temático Dragon Ball en TODA la app (no solo marketing). Mantener estos términos consistentes en nombres de tablas, columnas y UI:

| Término | Significado |
|---|---|
| Zeni | Dinero real del usuario |
| Ki | Score de salud financiera (etiqueta de energía, no número visible al usuario) |
| Nivel | Progreso acumulado del usuario (XP, nunca baja) |
| Dragón | Meta financiera (tipo `ahorro` o `deuda`) |
| Esfera | Sub-meta/hito dentro de un Dragón |
| Entrenamiento | Hábitos financieros recurrentes |
| Transformación | Evento al subir de etiqueta de Ki |

- Nombres de tablas, columnas y entidades de dominio: **en español** (ej. `categorias`, `dragones`, `esferas`, campo `nombre`, `tipo`) — así ya se definió en el esquema base.
- Código genérico (funciones, componentes, variables técnicas): en inglés, siguiendo convención estándar de la comunidad Next.js/React.
- Todas las tablas de usuario llevan Row Level Security (RLS) con policy `auth.uid() = user_id`. Nunca desactivar RLS en una tabla nueva sin confirmarlo explícitamente conmigo.

## Niveles de Ki (para cuando se implemente el cálculo)

Modo Supervivencia (0–15) → Ki Dormido (16–35) → Ki Despertando (36–50) → Guerrero Z (51–65) → Super Saiyan (66–85) → Super Saiyan 2 (86–100)

Fórmula: `Ki = 0.35 × SaludActual + 0.35 × Momentum + 0.20 × Presupuesto + 0.10 × Constancia`. Salvaguarda: si hay balance negativo 2+ meses seguidos o pago mínimo no cubierto, el Ki se limita a máximo "Ki Dormido".

## Cosas a evitar

- No agregar dependencias nuevas sin confirmarlo primero (proyecto personal, se prefiere mantener el stack acotado)
- No usar `service_role`/`anon` legacy keys
- No exponer la `secret key` (`sb_secret_...`) en ningún archivo con prefijo `NEXT_PUBLIC_`
- No sobre-diseñar: este es un proyecto personal, no enterprise — preferir la solución simple

## Fase actual

**Fase 1 — Fundamentos:** proyecto creado, Supabase Cloud configurado, cliente `@supabase/ssr` en construcción (client.ts, server.ts, middleware.ts). Siguiente paso: esquema base de datos (tablas `profiles` y `categorias` con RLS) en el SQL Editor de Supabase.

Roadmap completo: Fundamentos → Registro/Dashboard → Presupuesto → Dragones → Ki → Nivel/Transformaciones → Pulido.