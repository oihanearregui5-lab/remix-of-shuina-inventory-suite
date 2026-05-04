import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardPlus, Loader2, NotebookPen, Pin, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PersonalNote = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  is_pinned: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

type NoteDraft = {
  title: string;
  content: string;
};

const emptyDraft: NoteDraft = {
  title: "",
  content: "",
};

const PersonalNotesView = () => {
  const { user, isAdmin } = useAuth();
  const db = supabase as any;
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [ownStaffId, setOwnStaffId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await db
      .from("personal_notes")
      .select("id, user_id, title, content, is_pinned, is_completed, created_at, updated_at")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("No se pudieron cargar tus notas");
      setLoading(false);
      return;
    }

    setNotes((data ?? []) as PersonalNote[]);
    setLoading(false);
  };

  const loadOwnStaff = async () => {
    if (!user) return;

    const { data } = await db
      .from("staff_directory")
      .select("id")
      .eq("linked_user_id", user.id)
      .limit(1)
      .maybeSingle();

    setOwnStaffId(data?.id ?? null);
  };

  useEffect(() => {
    void loadNotes();
    void loadOwnStaff();
  }, [user]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const title = note.title?.toLowerCase() ?? "";
      const content = note.content.toLowerCase();
      return title.includes(query) || content.includes(query);
    });
  }, [notes, search]);

  const resetComposer = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setComposerOpen(false);
  };

  const handleSave = async () => {
    if (!user || !draft.content.trim()) {
      toast.error("Escribe algo antes de guardar");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error } = await db
        .from("personal_notes")
        .update({
          title: draft.title.trim() || null,
          content: draft.content.trim(),
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        toast.error("No se pudo guardar la nota");
        setSaving(false);
        return;
      }

      toast.success("Nota actualizada");
    } else {
      const { error } = await db.from("personal_notes").insert({
        user_id: user.id,
        title: draft.title.trim() || null,
        content: draft.content.trim(),
      });

      if (error) {
        toast.error("No se pudo crear la nota");
        setSaving(false);
        return;
      }

      toast.success("Nota guardada");
    }

    resetComposer();
    setSaving(false);
    void loadNotes();
  };

  const handleEdit = (note: PersonalNote) => {
    setEditingId(note.id);
    setDraft({
      title: note.title ?? "",
      content: note.content,
    });
    setComposerOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!user) return;
    const { error } = await db.from("personal_notes").delete().eq("id", noteId).eq("user_id", user.id);
    if (error) {
      toast.error("No se pudo borrar la nota");
      return;
    }
    toast.success("Nota eliminada");
    void loadNotes();
  };

  const togglePinned = async (note: PersonalNote) => {
    if (!user) return;
    const { error } = await db
      .from("personal_notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("No se pudo fijar la nota");
      return;
    }

    void loadNotes();
  };

  const toggleCompleted = async (note: PersonalNote) => {
    if (!user) return;
    const { error } = await db
      .from("personal_notes")
      .update({ is_completed: !note.is_completed })
      .eq("id", note.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("No se pudo actualizar la nota");
      return;
    }

    void loadNotes();
  };

  const convertToTask = async (note: PersonalNote) => {
    if (!user) return;

    const normalizedTitle = note.title?.trim() || note.content.trim().slice(0, 60) || "Tarea desde nota";
    const payload = {
      title: normalizedTitle,
      description: note.content.trim(),
      category: "nota personal",
      priority: "medium",
      status: "planned",
      created_by_user_id: user.id,
      assigned_staff_id: ownStaffId,
    };

    const { error } = await db.from("tasks").insert(payload);

    if (error) {
      toast.error("No se pudo convertir la nota en tarea");
      return;
    }

    await db
      .from("personal_notes")
      .update({ is_completed: true, is_pinned: false })
      .eq("id", note.id)
      .eq("user_id", user.id);

    toast.success("Nota convertida en tarea");
    void loadNotes();
  };

  const pinnedCount = notes.filter((note) => note.is_pinned).length;
  const completedCount = notes.filter((note) => note.is_completed).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Trabajador"
        title="Mi espacio"
        description="Tu bloc personal, privado y rápido para guardar ideas, recordatorios y notas del día."
        actions={
          <Button size="lg" className="min-w-[160px]" onClick={() => setComposerOpen((current) => !current)}>
            <Plus className="h-4 w-4" />
            Nueva nota
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tus notas</p><p className="mt-2 text-lg font-semibold text-foreground">{notes.length}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fijadas</p><p className="mt-2 text-lg font-semibold text-foreground">{pinnedCount}</p></div>
        <div className="panel-surface p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Completadas</p><p className="mt-2 text-lg font-semibold text-foreground">{completedCount}</p></div>
      </section>

      <Card className="border-border/80 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en tus notas" className="pl-10" />
            </div>
            <p className="text-sm text-muted-foreground">Privado solo para ti</p>
          </div>

          {composerOpen ? (
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="grid gap-3">
                <Input
                  placeholder="Título opcional"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
                <Textarea
                  placeholder="Escribe una idea, una nota rápida o algo que no quieras olvidar"
                  className="min-h-[140px]"
                  value={draft.content}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" className="min-w-[160px]" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                    {editingId ? "Guardar nota" : "Crear nota"}
                  </Button>
                  <Button variant="outline" size="lg" onClick={resetComposer}>Cancelar</Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted/60" />)}
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState icon={NotebookPen} title="Sin notas todavía" description="Abre, escribe y guarda. Tu espacio queda listo para usar todos los días sin pasos intermedios." />
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className={cn("border-border/80 shadow-[var(--shadow-soft)]", note.is_completed && "opacity-80") }>
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base text-foreground">
                      {note.title?.trim() || "Nota rápida"}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(note.updated_at), "d MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void togglePinned(note)} aria-label="Fijar nota">
                      <Pin className={cn("h-4 w-4", note.is_pinned && "fill-current text-primary")} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void toggleCompleted(note)} aria-label="Completar nota">
                      <CheckCircle2 className={cn("h-4 w-4", note.is_completed && "fill-current text-primary")} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void convertToTask(note)} aria-label="Convertir en tarea">
                      <ClipboardPlus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(note)} aria-label="Editar nota">
                      <NotebookPen className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void handleDelete(note.id)} aria-label="Borrar nota">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn("whitespace-pre-wrap text-sm leading-6 text-foreground", note.is_completed && "text-muted-foreground line-through")}>
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
};

export default PersonalNotesView;