import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SearchResultCategory = "task" | "machine" | "worker" | "workReport" | "note" | "fuelCard";

export interface SearchResult {
  id: string;
  category: SearchResultCategory;
  title: string;
  subtitle?: string;
  navigate: string; // section key in Index
}

interface UseGlobalSearchOptions {
  query: string;
  enabled?: boolean;
}

export const useGlobalSearch = ({ query, enabled = true }: UseGlobalSearchOptions) => {
  const { user } = useAuth();
  const trimmed = query.trim();

  return useQuery<SearchResult[]>({
    queryKey: ["global-search", trimmed, user?.id ?? "anon"],
    enabled: enabled && !!user && trimmed.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const results: SearchResult[] = [];
      const like = `%${trimmed}%`;

      // Tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, priority")
        .ilike("title", like)
        .limit(8);
      tasks?.forEach((t) => {
        results.push({
          id: `task-${t.id}`,
          category: "task",
          title: t.title,
          subtitle: `Tarea · ${t.status}`,
          navigate: "tasks",
        });
      });

      // Machines
      const { data: machines } = await supabase
        .from("machine_assets")
        .select("id, display_name, asset_family, license_plate")
        .or(`display_name.ilike.${like},asset_family.ilike.${like},license_plate.ilike.${like}`)
        .limit(8);
      machines?.forEach((m) => {
        results.push({
          id: `machine-${m.id}`,
          category: "machine",
          title: m.display_name,
          subtitle: [m.asset_family, m.license_plate].filter(Boolean).join(" · "),
          navigate: "machines",
        });
      });

      // Workers
      const { data: workers } = await supabase
        .from("staff_directory")
        .select("id, full_name, position")
        .ilike("full_name", like)
        .eq("active", true)
        .limit(8);
      workers?.forEach((w) => {
        results.push({
          id: `worker-${w.id}`,
          category: "worker",
          title: w.full_name,
          subtitle: w.position ?? "Equipo",
          navigate: "staff",
        });
      });

      // Work reports
      const { data: reports } = await supabase
        .from("work_reports")
        .select("id, worker_name, description, machine")
        .or(`description.ilike.${like},worker_name.ilike.${like},machine.ilike.${like}`)
        .order("started_at", { ascending: false })
        .limit(6);
      reports?.forEach((r) => {
        results.push({
          id: `report-${r.id}`,
          category: "workReport",
          title: r.description.slice(0, 60),
          subtitle: `${r.worker_name}${r.machine ? ` · ${r.machine}` : ""}`,
          navigate: "workReports",
        });
      });

      // Personal notes (own only via RLS)
      const { data: notes } = await supabase
        .from("personal_notes")
        .select("id, title, content")
        .or(`title.ilike.${like},content.ilike.${like}`)
        .limit(6);
      notes?.forEach((n) => {
        results.push({
          id: `note-${n.id}`,
          category: "note",
          title: n.title || n.content.slice(0, 50),
          subtitle: "Nota personal",
          navigate: "notes",
        });
      });

      // Fuel cards
      const { data: cards } = await supabase
        .from("fuel_cards")
        .select("id, alias, assigned_vehicle")
        .or(`alias.ilike.${like},assigned_vehicle.ilike.${like}`)
        .limit(5);
      cards?.forEach((c) => {
        results.push({
          id: `card-${c.id}`,
          category: "fuelCard",
          title: c.alias,
          subtitle: c.assigned_vehicle ? `Tarjeta · ${c.assigned_vehicle}` : "Tarjeta combustible",
          navigate: "gasoline",
        });
      });

      return results;
    },
  });
};

export const CATEGORY_LABELS: Record<SearchResultCategory, string> = {
  task: "Tareas",
  machine: "Máquinas",
  worker: "Equipo",
  workReport: "Partes",
  note: "Notas",
  fuelCard: "Combustible",
};
