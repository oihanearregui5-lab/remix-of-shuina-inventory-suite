import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ChatChannelDialogProps {
  open: boolean;
  loading: boolean;
  mode: "create" | "edit";
  initialValues: { name: string; description: string };
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; description: string }) => void;
}

const ChatChannelDialog = ({ open, loading, mode, initialValues, onOpenChange, onSubmit }: ChatChannelDialogProps) => {
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);

  useEffect(() => {
    setName(initialValues.name);
    setDescription(initialValues.description);
  }, [initialValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-border bg-background p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base text-foreground">{mode === "create" ? "Nuevo canal" : "Editar canal"}</DialogTitle>
          <DialogDescription>Nombre claro y una descripción breve para identificarlo rápido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del canal" className="h-12 rounded-2xl" />
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción corta" className="h-12 rounded-2xl" />
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button className="h-12 flex-1 rounded-2xl" disabled={loading || !name.trim()} onClick={() => onSubmit({ name, description })}>
            {mode === "create" ? "Crear canal" : "Guardar cambios"}
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