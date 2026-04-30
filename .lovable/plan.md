# Plan — Jornadas más rápidas + activar Abel, David y Jon en todas partes

## Diagnóstico

1. **Faltan trabajadores en todas las pantallas (carpetas, chips de Trabajadores, desplegable de Jornadas, Ficha por trabajador).**
   La causa raíz es que esas pantallas leen de la tabla legacy `workers`, que solo tiene 13 personas (Adrián, Aitor, Andriy, Fran, Hamid, Juan, Lyuben, Manuel, Misael, Nelo, Olek, Raquel, Silvio). Abel, David, Jon (y también Andry, Silvestre) sí existen en `staff_directory` pero no en `workers`, así que no aparecen en ninguna lista que se alimente de `workers`. Por eso "ya están activos" en la admin de personal pero no se ven en Fichajes/Jornadas.

2. **Vaciar turno no funciona realmente.**
   `clear_journey_assignment` borra la fila de override, pero entonces la celda vuelve a mostrar lo que viene del Excel original. No hay manera de decir "este turno queda en blanco". Falta un override "vacío" que tenga prioridad sobre el Excel.

3. **Editar jornada es lento.**
   Hoy hay que: activar modo edición → clic en celda → se abre popover → seleccionar trabajador → confirmar. Y los toasts de "Turno asignado/vaciado" añaden ruido.

## Cambios

### 1. Sembrar Abel, David y Jon en `workers` (migración SQL)
Insertar 3 filas en `workers` reutilizando los `id` de `staff_directory` (para que todo cuadre con `assignmentId`) y vinculándolos por `linked_user_id` cuando exista. Color tomado de `staff_directory.color_tag` traducido a hex (Abel `#6366f1` indigo, David `#ef4444` rojo, Jon `#14b8a6` teal). `display_name` con la grafía oficial (Abel, David, Jon — confirmado que Ion = Jon, no se duplica).

Resultado inmediato:
- Aparecen en "Carpetas de fichajes por trabajador" (`VacationClockingsSection`).
- Aparecen en los chips de Trabajadores arriba de Jornadas.
- Aparecen en el desplegable de asignar turno en Jornadas.
- Aparecen en "Ficha por trabajador".
- Aparecen en el panel admin de Fichajes con su color.

### 2. Permitir turnos en blanco a nivel de base de datos
- Migración: hacer `staff_journeys.staff_member_id` **NULLABLE**.
- Reescribir `set_journey_assignment` para aceptar `p_staff_member_id` opcional (NULL = "vacío").
- `clear_journey_assignment` pasa a hacer **upsert con staff_member_id = NULL** (en vez de DELETE), así el override "vacío" gana al Excel.
- Añadir una segunda RPC `delete_journey_assignment` para "restaurar lo del Excel" (borrar el override por completo) — la usaremos desde el botón "Restaurar Excel".

### 3. Edición instantánea en `ShiftPill`
- Quitar el modo "Editar planilla": **cualquier admin puede tocar una celda directamente**. Si no es admin, sigue siendo solo lectura (ya hay `canViewAdmin`).
- Reorganizar el popover para que sea ultrarrápido:
  - Buscador en la cabecera (filtra por nombre al instante).
  - Lista compacta con todos los trabajadores activos del directorio.
  - **Opción "— Dejar en blanco —"** arriba del todo (escribe un override NULL).
  - **Opción "Restaurar Excel"** abajo (borra el override).
  - Al elegir un trabajador: se asigna y se cierra el popover **sin toast** (feedback visual = la celda cambia de color al instante; gracias al realtime ya estaba enganchado).
- Update optimista: aplicamos el cambio en el `OverrideMap` local antes de esperar la respuesta del servidor; si falla, revertimos y enseñamos toast de error.

### 4. Resolución de la celda con overrides "vacíos"
- En `JourneysSection` y vistas (`MonthView`/`WeekView`/`DayView`), cuando exista un override con `staff_member_id = null`, la celda se pinta como **"—"** (vacía) en lugar de caer al valor del Excel. Así "vaciar" funciona de verdad.

### 5. Quitar el botón "Editar planilla"
Pasa a estar siempre activo para admin. Reduce un clic por edición.

## Detalle técnico

```text
DB
├── workers: +3 filas (Abel, David, Jon) con ids = staff_directory.id
├── staff_journeys.staff_member_id  →  NULLABLE
├── set_journey_assignment(p_staff_member_id uuid DEFAULT NULL) — UPSERT
├── clear_journey_assignment        — UPSERT con staff_member_id = NULL  (override vacío)
└── delete_journey_assignment(date, shift) — DELETE de la fila (vuelve al Excel)

Front
├── useJourneyOverrides.ts
│   ├── setAssignment: update optimista + sin toast en éxito
│   ├── clearAssignment: ahora marca el override como vacío (NULL)
│   └── restoreExcel: nueva, llama a delete_journey_assignment
├── ShiftPill.tsx
│   ├── Sin "editMode": admin puede editar siempre
│   ├── Popover con buscador + "Dejar en blanco" + "Restaurar Excel"
│   └── Si override.staff_member_id == null → render "—" (vacío real)
├── views/MonthView/WeekView/DayView: respetar override vacío
└── JourneysSection.tsx: eliminar el botón "Editar planilla" y la barra azul de modo edición
```

## Confirmaciones del usuario ya integradas
- Ion y Jon son la misma persona → solo se añade **Jon** (la fila "Ion" de `staff_directory` se queda como está, sin duplicar).
- Abel, David, Jon ya existen en `staff_directory`; aquí los replicamos en `workers` para que las pantallas legacy los muestren.

## Fuera de alcance
- Migrar todas las pantallas de `workers` a `staff_directory` (refactor grande). Lo hacemos en otra iteración si quieres.
