import { useEffect, useMemo, useState } from "react";
import { Hash, Lock, MessageCircle, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatPersonOption } from "./chat-types";

export type ChatComposerMode = "channel" | "group" | "direct";

interface ChatComposerDialogProps {
  open: boolean;
  loading: boolean;
  isAdmin: boolean;
  people: ChatPersonOption[];
  onOpenChange: (open: boolean) => void;
  onCreateChannel: (values: { name: string; description: string }) => void;
  onCreateGroup: (values: { name: string; description: string; memberIds: string[] }) => void;
  onCreateDirect: (recipientUserId: string) => void;
}

const ChatComposerDialog = ({ open, loading, isAdmin, people, onOpenChange, onCreateChannel, onCreateGroup, onCreateDirect }: ChatComposerDialogProps) => {
  const [mode, setMode] = useState<ChatComposerMode>(isAdmin ? "channel" : "direct");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setSearch("");
      setSelected({});
      setMode(isAdmin ? "channel" : "direct");
    }
  }, [open, isAdmin]);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => person.full_name.toLowerCase().includes(q));
  }, [people, search]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const handleSubmit = () => {
    if (mode === "channel") {
      if (!name.trim()) return;
      onCreateChannel({ name, description });
      return;
    }
    if (mode === "group") {
      if (!name.trim() || selectedIds.length === 0) return;
      onCreateGroup({ name, description, memberIds: selectedIds });
      return;
    }
    if (selectedIds.length !== 1) return;
    onCreateDirect(selectedIds[0]);
  };

  const submitDisabled = loading
    || (mode === "channel" && !name.trim())
    || (mode === "group" && (!name.trim() || selectedIds.length === 0))
    || (mode === "direct" && selectedIds.length !== 1);

  const submitLabel = mode === "channel" ? "Crear canal" : mode === "group" ? "Crear grupo" : "Abrir conversación";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-border bg-background p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base text-foreground">Nueva conversación</DialogTitle>
          <DialogDescription>Elige el tipo de chat que quieres iniciar.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {isAdmin ? (
            <button type="button" onClick={() => setMode("channel")} className={cn("flex flex-1 min-w-[120px] flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-medium transition", mode === "channel" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
              <Hash className="h-4 w-4" /> Canal público
            </button>
          ) : null}
          <button type="button" onClick={() => setMode("group")} className={cn("flex flex-1 min-w-[120px] flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-medium transition", mode === "group" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
            <Users className="h-4 w-4" /> Grupo privado
          </button>
          <button type="button" onClick={() => setMode("direct")} className={cn("flex flex-1 min-w-[120px] flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-medium transition", mode === "direct" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
            <MessageCircle className="h-4 w-4" /> Mensaje directo
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {mode !== "direct" ? (
            <>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "channel" ? "Nombre del canal" : "Nombre del grupo"} className="h-12 rounded-2xl" />
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción corta (opcional)" className="h-12 rounded-2xl" />
            </>
          ) : null}

          {mode !== "channel" ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4 text-primary" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === "direct" ? "Buscar persona" : "Añadir personas al grupo"} className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
              </label>
              <div className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-2">
                {filteredPeople.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No hay compañeros que coincidan.</p>
                ) : filteredPeople.map((person) => {
                  const isSelected = !!selected[person.user_id];
                  return (
                    <button
                      key={person.user_id}
                      type="button"
                      onClick={() => {
                        if (mode === "direct") {
                          setSelected({ [person.user_id]: true });
                        } else {
                          setSelected((current) => ({ ...current, [person.user_id]: !current[person.user_id] }));
                        }
                      }}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition", isSelected ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-card")}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-xs font-semibold text-primary">{person.full_name.slice(0, 2).toUpperCase()}</span>
                      <span className="flex-1 truncate">{person.full_name}</span>
                      {isSelected ? <span className="text-[11px] font-semibold text-primary">{mode === "direct" ? "Seleccionado" : "Añadido"}</span> : null}
                    </button>
                  );
                })}
              </div>
              {mode === "group" ? (
                <p className="text-[11px] text-muted-foreground">{selectedIds.length} miembros añadidos · serás incluido automáticamente</p>
              ) : null}
            </div>
          ) : null}

          {mode === "channel" ? <p className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-[11px] text-muted-foreground"><Hash className="mt-0.5 h-3.5 w-3.5" /> Visible para todo el equipo. Solo administradores pueden crearlos.</p> : null}
          {mode === "group" ? <p className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-[11px] text-muted-foreground"><Lock className="mt-0.5 h-3.5 w-3.5" /> Privado: solo los miembros que añadas verán el grupo.</p> : null}
          {mode === "direct" ? <p className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-[11px] text-muted-foreground"><MessageCircle className="mt-0.5 h-3.5 w-3.5" /> Conversación 1 a 1, privada.</p> : null}
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button className="h-12 flex-1 rounded-2xl" disabled={submitDisabled} onClick={handleSubmit}>{submitLabel}</Button>
          <Button variant="outline" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatComposerDialog;
