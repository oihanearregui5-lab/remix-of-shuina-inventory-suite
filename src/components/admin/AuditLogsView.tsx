import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: "insert" | "update" | "delete";
  entity_table: string;
  entity_id: string | null;
  summary: string | null;
  changed_fields: string[] | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  time_entries: "Fichajes",
  work_reports: "Partes",
  tonnage_trips: "Toneladas",
  delivery_notes: "Albaranes",
  user_roles: "Roles",
};

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  insert: { label: "Creado", variant: "default" },
  update: { label: "Editado", variant: "secondary" },
  delete: { label: "Borrado", variant: "destructive" },
};

const AuditLogsView = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (tableFilter !== "all") query = query.eq("entity_table", tableFilter);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
    if (toDate) query = query.lte("created_at", `${toDate}T23:59:59`);

    const { data, error } = await query;
    if (error) {
      console.error("Error cargando logs", error);
      setLogs([]);
    } else {
      setLogs((data ?? []) as unknown as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter, actionFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (log) =>
        (log.actor_name ?? "").toLowerCase().includes(q) ||
        (log.summary ?? "").toLowerCase().includes(q) ||
        (log.entity_id ?? "").toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Auditoría y registros</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por persona, resumen o ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {Object.entries(TABLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="insert">Creaciones</SelectItem>
                <SelectItem value="update">Ediciones</SelectItem>
                <SelectItem value="delete">Borrados</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Resumen</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin registros para los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">{log.actor_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ACTION_LABELS[log.action]?.variant ?? "outline"}>
                          {ACTION_LABELS[log.action]?.label ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TABLE_LABELS[log.entity_table] ?? log.entity_table}
                      </TableCell>
                      <TableCell className="text-sm max-w-md truncate">{log.summary}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Mostrando hasta 500 registros más recientes. Refina con los filtros para acotar.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del cambio</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Fecha:</span> {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</div>
                <div><span className="text-muted-foreground">Quién:</span> {selectedLog.actor_name ?? "—"}</div>
                <div><span className="text-muted-foreground">Módulo:</span> {TABLE_LABELS[selectedLog.entity_table] ?? selectedLog.entity_table}</div>
                <div><span className="text-muted-foreground">Acción:</span> {ACTION_LABELS[selectedLog.action]?.label}</div>
                <div className="col-span-2"><span className="text-muted-foreground">ID registro:</span> <code className="text-xs">{selectedLog.entity_id}</code></div>
              </div>
              {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Campos modificados</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.changed_fields.map((f) => (
                      <Badge key={f} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedLog.old_data && (
                <div>
                  <p className="font-medium mb-1">Antes</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(selectedLog.old_data, null, 2)}</pre>
                </div>
              )}
              {selectedLog.new_data && (
                <div>
                  <p className="font-medium mb-1">Después</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(selectedLog.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsView;
