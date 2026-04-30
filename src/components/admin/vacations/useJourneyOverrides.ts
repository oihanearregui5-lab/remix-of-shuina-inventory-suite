import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "./vacation-utils";
import type { ShiftCode } from "./journeys-constants";

export interface JourneyOverride {
  id: string;
  journey_date: string;
  shift: ShiftCode;
  staff_member_id: string | null;
  color: string | null;
  badge_label: string | null;
}

export type OverrideMap = Map<string, JourneyOverride>;

const overrideKey = (date: string, shift: ShiftCode) => `${date}__${shift}`;

export const useJourneyOverrides = (visibleDates: Date[]) => {
  const [overrides, setOverrides] = useState<OverrideMap>(new Map());

  const range = useMemo(() => {
    if (visibleDates.length === 0) return null;
    const sorted = [...visibleDates].sort((a, b) => a.getTime() - b.getTime());
    return { start: toDateKey(sorted[0]), end: toDateKey(sorted[sorted.length - 1]) };
  }, [visibleDates]);

  const fetchOverrides = useCallback(async () => {
    if (!range) return;
    const { data, error } = await supabase
      .from("staff_journeys")
      .select("id, journey_date, shift, staff_member_id, color, badge_label")
      .gte("journey_date", range.start)
      .lte("journey_date", range.end);
    if (error) {
      console.error("Error cargando overrides de jornadas", error);
      return;
    }
    const map: OverrideMap = new Map();
    (data ?? []).forEach((row) => {
      const shift = row.shift as ShiftCode;
      if (!["M", "T", "N"].includes(shift)) return;
      map.set(overrideKey(row.journey_date, shift), {
        id: row.id,
        journey_date: row.journey_date,
        shift,
        staff_member_id: row.staff_member_id,
        color: row.color,
        badge_label: row.badge_label,
      });
    });
    setOverrides(map);
  }, [range]);

  useEffect(() => {
    void fetchOverrides();
  }, [fetchOverrides]);

  useEffect(() => {
    const channel = supabase
      .channel("staff-journeys-overrides")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_journeys" }, () => {
        void fetchOverrides();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchOverrides]);

  const getOverride = useCallback(
    (date: string, shift: ShiftCode) => overrides.get(overrideKey(date, shift)) ?? null,
    [overrides],
  );

  const setAssignment = useCallback(
    async (date: string, shift: ShiftCode, staffMemberId: string, color?: string | null) => {
      const { error } = await supabase.rpc("set_journey_assignment", {
        p_journey_date: date,
        p_shift: shift,
        p_staff_member_id: staffMemberId,
        p_color: color ?? null,
        p_badge_label: null,
      });
      if (error) {
        console.error("Error asignando turno", error);
        toast.error(error.message ?? "No se pudo asignar el turno");
        throw error;
      }
      toast.success("Turno asignado");
      await fetchOverrides();
    },
    [fetchOverrides],
  );

  const clearAssignment = useCallback(
    async (date: string, shift: ShiftCode) => {
      const { error } = await supabase.rpc("clear_journey_assignment", {
        p_journey_date: date,
        p_shift: shift,
      });
      if (error) {
        console.error("Error limpiando turno", error);
        toast.error(error.message ?? "No se pudo vaciar el turno");
        throw error;
      }
      toast.success("Turno vaciado");
      await fetchOverrides();
    },
    [fetchOverrides],
  );

  return { overrides, getOverride, setAssignment, clearAssignment, refetch: fetchOverrides };
};
