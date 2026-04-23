/**
 * TRANSTUBARI - Parser del Excel de jornadas
 * 
 * Lee el archivo `transtubari-datos-2026.xlsx` y devuelve los datos
 * estructurados listos para usar en el calendario de jornadas.
 * 
 * Requiere: npm install xlsx
 */

import * as XLSX from 'xlsx';

// ============ TIPOS ============

export type TurnoCode = 'M' | 'T' | 'N';

export interface Worker {
  id: string;          // 'fran', 'andriy', etc.
  name: string;        // 'Fran'
  initials: string;    // 'FR'
  color: string;       // '#22c55e'
  defaultShift: string;
  annualHours: number;
}

export interface DayShifts {
  M: string | null;         // id del trabajador o null
  T: string | null;
  N: string | null;
  M_spec?: string;          // 'S', 'SM', 'MS', 'SIL'...
  T_spec?: string;
  N_spec?: string;
  spec?: string;            // cualquiera de los _spec (el primero que exista)
}

export interface Holiday {
  date: string;                             // 'YYYY-MM-DD'
  type: 'nacional' | 'cierre_fabrica' | 'local';
  label: string;
  color: string;
}

export interface Vacation {
  workerId: string;
  startDate: string;   // 'YYYY-MM-DD'
  endDate: string;
  type: string;        // 'Cierre fábrica', 'Baja médica', 'Personal'...
  notes: string;
}

export interface TranstubariData {
  workers: Worker[];
  shifts: Record<string, DayShifts>;  // clave: 'M-D' (ej: '4-23')
  holidays: Record<string, Holiday>;   // clave: 'M-D'
  vacations: Vacation[];
  year: number;
}

// ============ PARSER ============

/**
 * Carga el Excel desde un ArrayBuffer (lo que devuelve un <input type="file">)
 * o desde una URL pública.
 */
export async function loadExcel(source: ArrayBuffer | string): Promise<TranstubariData> {
  let buffer: ArrayBuffer;

  if (typeof source === 'string') {
    const res = await fetch(source);
    buffer = await res.arrayBuffer();
  } else {
    buffer = source;
  }

  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  return {
    workers: parseWorkers(wb),
    shifts: parseShifts(wb),
    holidays: parseHolidays(wb),
    vacations: parseVacations(wb),
    year: 2026,
  };
}

function parseWorkers(wb: XLSX.WorkBook): Worker[] {
  const ws = wb.Sheets['Trabajadores'];
  if (!ws) throw new Error('Hoja "Trabajadores" no encontrada');

  const rows = XLSX.utils.sheet_to_json<any>(ws);
  return rows.map(r => ({
    id: String(r['ID']).toLowerCase().trim(),
    name: String(r['Nombre']).trim(),
    initials: String(r['Iniciales']).trim().toUpperCase(),
    color: String(r['Color']).trim(),
    defaultShift: String(r['Turno por defecto'] || '').trim(),
    annualHours: Number(r['Horas anuales']) || 0,
  }));
}

function parseShifts(wb: XLSX.WorkBook): Record<string, DayShifts> {
  const ws = wb.Sheets['Turnos'];
  if (!ws) throw new Error('Hoja "Turnos" no encontrada');

  const rows = XLSX.utils.sheet_to_json<any>(ws);
  const result: Record<string, DayShifts> = {};

  const shiftMap: Record<string, TurnoCode> = {
    'Mañana': 'M',
    'Tarde': 'T',
    'Noche': 'N',
  };

  for (const r of rows) {
    const mes = Number(r['Mes']);
    const dia = Number(r['Día']);
    if (!mes || !dia) continue;

    const key = `${mes}-${dia}`;
    const turnoStr = String(r['Turno'] || '').trim();
    const code = shiftMap[turnoStr];
    if (!code) continue;

    const trabajador = String(r['Trabajador'] || '').trim().toLowerCase() || null;
    const spec = String(r['Código especial'] || '').trim() || undefined;

    if (!result[key]) {
      result[key] = { M: null, T: null, N: null };
    }

    result[key][code] = trabajador;
    if (spec) {
      result[key][`${code}_spec` as 'M_spec' | 'T_spec' | 'N_spec'] = spec;
      if (!result[key].spec) result[key].spec = spec;
    }
  }

  return result;
}

function parseHolidays(wb: XLSX.WorkBook): Record<string, Holiday> {
  const ws = wb.Sheets['Festivos'];
  if (!ws) throw new Error('Hoja "Festivos" no encontrada');

  const rows = XLSX.utils.sheet_to_json<any>(ws);
  const result: Record<string, Holiday> = {};

  for (const r of rows) {
    const rawDate = r['Fecha'];
    if (!rawDate) continue;

    let dateStr: string;
    if (rawDate instanceof Date) {
      const y = rawDate.getFullYear();
      const m = String(rawDate.getMonth() + 1).padStart(2, '0');
      const d = String(rawDate.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    } else {
      dateStr = String(rawDate);
    }

    const [, mes, dia] = dateStr.split('-').map(Number);
    const key = `${mes}-${dia}`;

    result[key] = {
      date: dateStr,
      type: String(r['Tipo']).trim() as Holiday['type'],
      label: String(r['Etiqueta']).trim(),
      color: String(r['Color']).trim(),
    };
  }

  return result;
}

function parseVacations(wb: XLSX.WorkBook): Vacation[] {
  const ws = wb.Sheets['Vacaciones'];
  if (!ws) return [];

  const rows = XLSX.utils.sheet_to_json<any>(ws);

  return rows.map(r => ({
    workerId: String(r['Trabajador']).toLowerCase().trim(),
    startDate: formatDate(r['Fecha inicio']),
    endDate: formatDate(r['Fecha fin']),
    type: String(r['Tipo'] || '').trim(),
    notes: String(r['Notas'] || '').trim(),
  }));
}

function formatDate(val: any): string {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

// ============ HELPERS ============

/**
 * Devuelve los turnos de un día concreto.
 * Ejemplo: getShiftsForDay(data, 4, 23) -> { M: 'fran', T: 'andriy', N: 'lyuben', ... }
 */
export function getShiftsForDay(
  data: TranstubariData,
  month: number,
  day: number
): DayShifts | null {
  return data.shifts[`${month}-${day}`] || null;
}

/**
 * Devuelve todos los turnos asignados a un trabajador en un mes.
 */
export function getWorkerMonthShifts(
  data: TranstubariData,
  workerId: string,
  month: number
): Array<{ day: number; shift: TurnoCode; spec?: string }> {
  const result: Array<{ day: number; shift: TurnoCode; spec?: string }> = [];
  const daysInMonth = new Date(data.year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${d}`;
    const s = data.shifts[key];
    if (!s) continue;
    (['M', 'T', 'N'] as TurnoCode[]).forEach(code => {
      if (s[code] === workerId) {
        result.push({
          day: d,
          shift: code,
          spec: s[`${code}_spec` as 'M_spec' | 'T_spec' | 'N_spec'],
        });
      }
    });
  }
  return result;
}

/**
 * Estadísticas anuales de un trabajador.
 */
export function getWorkerYearStats(data: TranstubariData, workerId: string) {
  let totalShifts = 0;
  let specialShifts = 0;

  for (const key in data.shifts) {
    const s = data.shifts[key];
    (['M', 'T', 'N'] as TurnoCode[]).forEach(code => {
      if (s[code] === workerId) {
        totalShifts++;
        if (s[`${code}_spec` as 'M_spec' | 'T_spec' | 'N_spec']) specialShifts++;
      }
    });
  }

  return {
    totalShifts,
    totalHours: totalShifts * 8,
    specialShifts,
  };
}

/**
 * Comprueba si una fecha es festivo.
 */
export function isHoliday(
  data: TranstubariData,
  month: number,
  day: number
): Holiday | null {
  return data.holidays[`${month}-${day}`] || null;
}

/**
 * Comprueba si hoy es el día (month, day) del año (data.year).
 */
export function isToday(data: TranstubariData, month: number, day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === data.year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
}
