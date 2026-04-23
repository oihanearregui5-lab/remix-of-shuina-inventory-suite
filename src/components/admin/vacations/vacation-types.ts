export type VacationViewMode = "day" | "week" | "month" | "year";
export type ShiftSlot = "dia" | "tarde" | "noche";
export type HolidayType = "festivo_nacional" | "cierre_fabrica" | "festivo_local" | "otro";

export interface WorkerItem {
  id: string;
  name: string;
  display_name: string;
  color_hex: string;
  shift_default: "dia" | "tarde" | "noche" | "variable";
  annual_contract_hours: number;
  company_vacation_hours: number;
  worker_vacation_days: number;
  total_annual_hours: number;
  extra_vacation_days: number;
  extra_vacation_reason: string | null;
  linked_user_id: string | null;
  is_active: boolean;
}

export interface HolidayItem {
  id: string;
  date: string;
  type: HolidayType;
  label: string;
  color_hex: string;
}

export interface VacationSlotItem {
  id: string;
  worker_id: string;
  date: string;
  shift: ShiftSlot;
  note: string | null;
}

export interface WorkerYearSummaryItem {
  worker_id: string;
  year: number;
  total_annual_hours: number | null;
  worked_hours: number | null;
  remaining_hours: number | null;
  vacation_days_total: number | null;
  vacation_days_used: number | null;
  extra_days: number | null;
}

export interface TimeEntryItem {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  created_at: string;
}

export interface FichajeRow extends TimeEntryItem {
  worker_id: string | null;
  worker_name: string;
  hours: number;
  source: string;
}
