# Transtubari — Plataforma operativa interna

Aplicación web interna de Transtubari para la gestión integral de la operativa diaria: fichajes, partes de trabajo, vacaciones, flota de maquinaria, albaranes, repostajes, tonelaje, comunicación interna y administración del equipo.

Construida sobre **Lovable Cloud** (backend gestionado con autenticación, base de datos Postgres, RLS y Edge Functions) y un frontend **React + Vite + Tailwind + shadcn/ui**.

---

## Tabla de contenidos

1. [Visión general](#visión-general)
2. [Stack técnico](#stack-técnico)
3. [Arquitectura](#arquitectura)
4. [Módulos funcionales](#módulos-funcionales)
5. [Roles y seguridad](#roles-y-seguridad)
6. [Puesta en marcha local](#puesta-en-marcha-local)
7. [Scripts disponibles](#scripts-disponibles)
8. [Tests](#tests)
9. [Despliegue](#despliegue)
10. [Convenciones de código](#convenciones-de-código)

---

## Visión general

La plataforma centraliza toda la operativa de Transtubari en un único espacio con dos modos:

- **Espacio Trabajador**: fichajes, partes de trabajo, calendario personal, chat, notas y solicitudes de vacaciones.
- **Espacio Administración**: panel de control, gestión de personal, vacaciones y jornadas, albaranes, tonelaje, reportes, auditoría y mantenimiento de la flota.

El usuario alterna entre espacios desde el selector inicial cuando dispone de rol `admin` o `secretary`.

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| UI | Tailwind CSS v3 + shadcn/ui + Radix |
| Estado servidor | TanStack Query v5 |
| Routing | React Router v6 |
| Backend | Lovable Cloud (Supabase gestionado) |
| Autenticación | Supabase Auth (email/contraseña + Google OAuth opcional) |
| Base de datos | PostgreSQL con RLS |
| Tiempo real | Supabase Realtime (chat, notificaciones) |
| Tests | Vitest + Testing Library |
| PWA | Service Worker + manifest |

## Arquitectura

```
src/
├── components/          # Componentes UI por dominio
│   ├── admin/          # Vistas de administración
│   ├── chat/           # Mensajería interna
│   ├── fichajes/       # Control horario
│   ├── machines/       # Flota de maquinaria
│   ├── shared/         # Componentes transversales
│   ├── tasks/          # Gestión de tareas
│   └── ui/             # Primitivas shadcn
├── hooks/              # Hooks reutilizables (auth, datos, UI)
├── lib/                # Utilidades puras y testeadas
├── pages/              # Rutas principales
├── integrations/       # Cliente Supabase autogenerado
└── data/               # Datos estáticos (calendario 2026, etc.)
```

**Principios:**
- Datos servidor vía TanStack Query con `staleTime` 60s y reintentos selectivos para errores transitorios.
- Errores Supabase traducidos por `lib/error-utils.ts` a mensajes amigables.
- Tokens de diseño semánticos (HSL) en `index.css` y `tailwind.config.ts`. Nunca colores literales en componentes.
- Roles en tabla `user_roles` separada y validados con la función `has_role()` (`SECURITY DEFINER`).

## Módulos funcionales

| Módulo | Descripción |
|--------|-------------|
| **Fichajes** | Entrada/salida con GPS, exportación CSV, control desde admin |
| **Partes de trabajo** | Registro de actividad por jornada con observaciones |
| **Vacaciones y jornadas** | Calendario anual, turnos día/tarde/noche, festivos y cierres |
| **Solicitudes** | Workflow de petición → revisión → respuesta con notificaciones |
| **Calendario unificado** | Tareas, eventos, jornadas, ITV y mantenimientos en una vista |
| **Tareas** | Personales y generales con prioridad, checklist y asignación |
| **Chat** | Canales públicos, privados y mensajes directos en tiempo real |
| **Maquinaria** | Inventario, incidencias, mantenimientos, ITV y adjuntos |
| **Albaranes** | Generación, validación y archivo con PDF |
| **Tonelaje** | Viajes por camión y material con histórico |
| **Repostajes** | Tarjetas, tickets, fotos y desglose por vehículo |
| **Personal** | Directorio, asignaciones, supervisores y vinculación con usuarios |
| **Reportes** | Indicadores agregados con exportación |
| **Auditoría** | Registro de cambios sensibles con actor y diff |
| **Notas** | Bloc personal con anclaje y completado |
| **Notificaciones** | Centro unificado en cabecera con marcado de lectura |

## Roles y seguridad

- **admin**: acceso total, gestión de usuarios, datos maestros y auditoría.
- **secretary**: acceso administrativo limitado (sin gestión de roles).
- **worker**: acceso al espacio de trabajador.

Todas las tablas sensibles tienen RLS activo. Las políticas usan `has_role(auth.uid(), 'admin')` para evitar recursión. Se han configurado meta-tags HTTP de defensa en profundidad (`Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`).

## Puesta en marcha local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno (autogeneradas por Lovable Cloud)
# .env contiene VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID

# 3. Arrancar servidor de desarrollo
npm run dev
```

La app se sirve en `http://localhost:8080`.

## Scripts disponibles

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción |
| `npm run preview` | Servir build localmente |
| `npm run lint` | Análisis estático con ESLint |
| `npm run test` | Suite de tests Vitest |

## Tests

Cobertura unitaria en `src/lib/__tests__/` y `src/test/`:

- `time-balance.test.ts` — cálculo de jornadas y balances horarios
- `work-reports.test.ts` — generación CSV y duraciones
- `chat-utils.test.ts` — formateo de fechas y validación de borradores
- `error-utils.test.ts` — mapeo de errores Supabase

```bash
npm run test
```

## Despliegue

El despliegue se gestiona desde Lovable: pulsar **Publish** en el editor para promocionar a producción. Las Edge Functions y migraciones se aplican automáticamente.

Para desplegar a un dominio personalizado, configurarlo en **Project → Settings → Domains**.

## Convenciones de código

- **TypeScript estricto** — sin `any` salvo casos justificados.
- **Componentes pequeños y focalizados** — preferir composición a archivos largos.
- **Tokens de diseño** — colores y sombras siempre vía CSS variables HSL.
- **Mutaciones** — usar `notifyError()` de `lib/error-utils.ts` para feedback consistente.
- **Imports** — alias `@/` para `src/`.
- **Roles** — nunca chequear roles desde `localStorage`; siempre vía `useAuth()` y RLS.

---

© Transtubari · Plataforma interna · Lovable Cloud
