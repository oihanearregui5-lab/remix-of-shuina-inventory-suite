import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, FileText, MessageSquareText, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StaffRequestDialogItem {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  admin_response: string | null;
  created_at: string;
}

interface StaffRequestDetailDialogProps {
  open: boolean;
  request: StaffRequestDialogItem | null;
  onOpenChange: (open: boolean) => void;
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aceptada",
  rejected: "Declinada",
  cancelled: "Cancelada",
};

const typeLabel: Record<string, string> = {
  vacation: "Vacaciones",
  leave: "Asuntos propios",
  medical: "Baja / revisión",
};

const statusTone: Record<string, string> = {
  pending: "bg-warning/15 text-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const StaffRequestDetailDialog = ({ open, request, onOpenChange }: StaffRequestDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-background">
        {!request ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">{typeLabel[request.request_type] ?? request.request_type}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Historial completo de la solicitud con fechas, motivo y respuesta de administración.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Estado actual
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[request.status] ?? "bg-muted text-muted-foreground"}`}>
                  {statusLabel[request.status] ?? request.status}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-secondary" /> Periodo solicitado
                </div>
                <p className="font-semibold text-foreground">
                  {format(new Date(request.start_date), "d MMM yyyy", { locale: es })} → {format(new Date(request.end_date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" /> Motivo / observaciones
              </div>
              <p className="text-sm leading-6 text-foreground">{request.reason?.trim() || "Sin observaciones indicadas."}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareText className="h-4 w-4 text-secondary" /> Respuesta de administración
              </div>
              <p className="text-sm leading-6 text-foreground">{request.admin_response?.trim() || "Aún no hay respuesta registrada."}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Enviada el {format(new Date(request.created_at), "EEEE d MMMM yyyy · HH:mm", { locale: es })}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffRequestDetailDialog;