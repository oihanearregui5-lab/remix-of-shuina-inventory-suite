import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StaffMemberOption } from "./chat-types";

export type ChatChannelDialogMode = "create-group" | "create-direct" | "edit";

export interface ChatChannelDialogSubmitValues {
  mode: ChatChannelDialogMode;
  name: string;
  description: string;
  memberUserIds: string[];
}

interface ChatChannelDialogProps {
  open: boolean;
  loading: boolean;
  mode: ChatChannelDialogMode;
  initialValues: { name: string; description: string; memberUserIds: string[] };
  staff: StaffMemberOption[];
  currentUserId: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChatChannelDialogSubmitValues) => void;
}

const ChatChannelDialog = ({ open, loading, mode, initialValues, staff, currentUserId, onOpenChange, onSubmit }: ChatChannelDialogProps) => {
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialValues.memberUserIds);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setName(initialValues.name);
    setDescription(initialValues.description);
    setSelectedUserIds(initialValues.memberUserIds);
    setQuery("");
  }, [initialValues, open]);

  // Excluimos al usuario actual de la lista (siempre se añade automáticamente)
  const availableStaff = useMemo(
    () =>
      staff
        .filter((person) => person.linked_user_id && person.linked_user_id !== currentUserId)
        .filter((person) => (query ? person.full_name.toLowerCase().includes(query.toLowerCase()) : true)),
    [staff, query, currentUserId],
  );

  const toggleMember = (userId: string, singleSelect = false) => {
    setSelectedUserIds((current) => {
      if (singleSelect) return current.includes(userId) ? [] : [userId];
      return current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
    });
  };

  const handleSubmit = () => {
    onSubmit({ mode, name, description, memberUserIds: selectedUserIds });
  };

  const title =
    mode === "create-group" ? "Nuevo grupo" : mode === "create-direct" ? "Chat directo" : "Editar grupo";
  const description_ =
    mode === "create-group"
      ? "Crea un grupo privado con los miembros que elijas."
      : mode === "create-direct"
      ? "Elige a una persona para conversar en privado."
      : "Ajusta el nombre, descripción y miembros.";

  const canSubmit =
    mode === "create-direct"
      ? selectedUserIds.length === 1
      : mode === "create-group"
      ? name.trim().length > 0 && selectedUserIds.length >= 1
      : name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-border bg-background p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground">
            {mode === "create-direct" ? <MessageCircle className="h-4 w-4 text-secondary-foreground" /> : <Users className="h-4 w-4 text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description_}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {mode !== "create-direct" && (
            <>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre del grupo"
                className="h-12 rounded-2xl"
              />
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descripción (opcional)"
                className="h-12 rounded-2xl"
              />
            </>
          )}

          {(mode === "create-group" || mode === "create-direct") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "create-direct" ? "Elige a una persona" : `Miembros (${selectedUserIds.length})`}
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar trabajador"
                  className="h-11 rounded-2xl pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-background">
                {availableStaff.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No hay trabajadores con cuenta enlazada que coincidan.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {availableStaff.map((person) => {
                      const isSelected = selectedUserIds.includes(person.linked_user_id!);
                      return (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => toggleMember(person.linked_user_id!, mode === "create-direct")}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                              isSelected && "bg-primary/5",
                            )}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {person.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="flex-1 text-sm font-medium text-foreground">{person.full_name}</span>
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {mode === "create-group" && selectedUserIds.length === 0 && (
                <p className="text-xs text-muted-foreground">Selecciona al menos una persona.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button className="h-12 flex-1 rounded-2xl" disabled={loading || !canSubmit} onClick={handleSubmit}>
            {mode === "edit" ? "Guardar cambios" : mode === "create-direct" ? "Abrir chat" : "Crear grupo"}
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatChannelDialog;
