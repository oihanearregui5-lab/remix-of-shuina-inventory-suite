import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { evaluateExpiry, severityRank, type ExpirySeverity } from "@/lib/machine-expiry";
import { cn } from "@/lib/utils";

interface MachineExpiryRow {
  id: string;
  display_name: string;
  license_plate: string | null;
  itv_next_date: string | null;
  insurance_expiry_date: string | null;
}

interface ExpiryEntry {
  id: string;
  machineName: string;
  plate: string | null;
  type: "ITV" | "Seguro";
  date: string;
  severity: ExpirySeverity;
  days: number | null;
}

const toneClass = (sev: ExpirySeverity) =>
  sev === "expired"
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : sev === "urgent"
      ? "bg-warning/15 text-foreground border-warning/40"
      : "bg-secondary/15 text-foreground border-secondary/40";

const MachineExpiriesWidget = () => {
  const [entries, setEntries] = useState<ExpiryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("machine_assets")
      .select("id, display_name, license_plate, itv_next_date, insurance_expiry_date");
    const rows = (data ?? []) as MachineExpiryRow[];
    const items: ExpiryEntry[] = [];
    for (const m of rows) {
      const itv = evaluateExpiry(m.itv_next_date);
      if (itv.severity === "expired" || itv.severity === "urgent" || itv.severity === "soon") {
        items.push({
          id: `${m.id}-itv`,
          machineName: m.display_name,
          plate: m.license_plate,
          type: "ITV",
          date: m.itv_next_date!,
          severity: itv.severity,
          days: itv.days,
        });
      }
      const ins = evaluateExpiry(m.insurance_expiry_date);
      if (ins.severity === "expired" || ins.severity === "urgent" || ins.severity === "soon") {
        items.push({
          id: `${m.id}-ins`,
          machineName: m.display_name,
          plate: m.license_plate,
          type: "Seguro",
          date: m.insurance_expiry_date!,
          severity: ins.severity,
          days: ins.days,
        });
      }
    }
    items.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || (a.days ?? 9999) - (b.days ?? 9999));
    setEntries(items.slice(0, 8));
    setLoading(false);
  };

  return (
    <section className="panel-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Vencimientos técnicos</h3>
        </div>
        <span className="text-xs text-muted-foreground">ITV y seguros próximos</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin vencimientos próximos. ✅</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                toneClass(e.severity),
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {e.machineName} <span className="text-xs text-muted-foreground">· {e.plate ?? "Sin matrícula"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.type} · {format(parseISO(e.date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold">
                {e.severity === "expired" ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Vencido {e.days !== null ? `${Math.abs(e.days)}d` : ""}
                  </>
                ) : (
                  <>En {e.days}d</>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MachineExpiriesWidget;
