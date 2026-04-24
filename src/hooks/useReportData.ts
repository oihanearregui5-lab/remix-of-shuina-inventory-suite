import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/lib/reports-export";

export type ReportModule = "fichajes" | "partes" | "toneladas" | "gasolina" | "albaranes";

export interface ReportFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  userId?: string | null;
}

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES");
};

const hoursBetween = (start: string | null, end: string | null): string => {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const hours = ms / (1000 * 60 * 60);
  return hours.toFixed(2);
};

// ---- Fetchers por módulo ----------------------------------------------------

async function fetchFichajes(filters: ReportFilters): Promise<Row[]> {
  const startISO = `${filters.startDate}T00:00:00`;
  const endISO = `${filters.endDate}T23:59:59`;
  let query = supabase
    .from("time_entries_with_profiles")
    .select("*")
    .gte("clock_in", startISO)
    .lte("clock_in", endISO)
    .order("clock_in", { ascending: false });
  if (filters.userId) query = query.eq("user_id", filters.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    Trabajador: r.full_name ?? "",
    Entrada: fmtDateTime(r.clock_in),
    Salida: fmtDateTime(r.clock_out),
    Horas: hoursBetween(r.clock_in, r.clock_out),
    "Lat. entrada": r.latitude_in ?? "",
    "Lon. entrada": r.longitude_in ?? "",
    "Lat. salida": r.latitude_out ?? "",
    "Lon. salida": r.longitude_out ?? "",
    Notas: r.notes ?? "",
  }));
}

async function fetchPartes(filters: ReportFilters): Promise<Row[]> {
  let query = supabase
    .from("work_reports")
    .select("*")
    .gte("started_at", `${filters.startDate}T00:00:00`)
    .lte("started_at", `${filters.endDate}T23:59:59`)
    .order("started_at", { ascending: false });
  if (filters.userId) query = query.eq("user_id", filters.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    Trabajador: r.worker_name,
    Inicio: fmtDateTime(r.started_at),
    Fin: fmtDateTime(r.ended_at),
    Horas: hoursBetween(r.started_at, r.ended_at),
    Acción: r.action ?? "",
    Máquina: r.machine ?? "",
    Descripción: r.description,
    Observaciones: r.observations ?? "",
  }));
}

async function fetchToneladas(filters: ReportFilters): Promise<Row[]> {
  const { data, error } = await supabase
    .from("tonnage_trips")
    .select("*, tonnage_trucks(label, truck_number, material)")
    .gte("trip_date", filters.startDate)
    .lte("trip_date", filters.endDate)
    .order("trip_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    Fecha: fmtDate(r.trip_date),
    Hora: r.trip_time ?? "",
    "Camión": r.tonnage_trucks?.label ?? `#${r.tonnage_trucks?.truck_number ?? ""}`,
    Material: r.material_snapshot ?? r.tonnage_trucks?.material ?? "",
    "Kilos": Number(r.weight_kg) || 0,
    Notas: r.notes ?? "",
  }));
}

async function fetchGasolina(filters: ReportFilters): Promise<Row[]> {
  // El módulo de gasolina vive en localStorage hoy. Devolvemos vacío con aviso.
  return [];
}

async function fetchAlbaranes(filters: ReportFilters): Promise<Row[]> {
  const { data, error } = await supabase
    .from("delivery_notes")
    .select("*, staff_directory:driver_staff_id(full_name)")
    .gte("delivery_date", filters.startDate)
    .lte("delivery_date", filters.endDate)
    .order("delivery_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    Fecha: fmtDate(r.delivery_date),
    Número: r.note_number,
    Cliente: r.customer,
    Ruta: r.route ?? "",
    "Conductor": r.staff_directory?.full_name ?? r.driver_name ?? "",
    "Peso (kg)": r.weight_kg ?? "",
    Estado: r.status,
    Observaciones: r.observations ?? "",
  }));
}

// ---- Hook -------------------------------------------------------------------

export function useReportData(modules: ReportModule[], filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", modules, filters],
    enabled,
    queryFn: async () => {
      const result: Record<ReportModule, Row[]> = {
        fichajes: [],
        partes: [],
        toneladas: [],
        gasolina: [],
        albaranes: [],
      };
      const fetchers: Record<ReportModule, () => Promise<Row[]>> = {
        fichajes: () => fetchFichajes(filters),
        partes: () => fetchPartes(filters),
        toneladas: () => fetchToneladas(filters),
        gasolina: () => fetchGasolina(filters),
        albaranes: () => fetchAlbaranes(filters),
      };
      await Promise.all(
        modules.map(async (m) => {
          result[m] = await fetchers[m]();
        }),
      );
      return result;
    },
  });
}

export const MODULE_LABELS: Record<ReportModule, string> = {
  fichajes: "Fichajes",
  partes: "Partes",
  toneladas: "Toneladas",
  gasolina: "Gasolina",
  albaranes: "Albaranes",
};
