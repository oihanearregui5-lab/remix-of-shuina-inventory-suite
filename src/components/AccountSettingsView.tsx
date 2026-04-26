import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2, Save, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileRow {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

const AccountSettingsView = () => {
  const { user, bootstrapUser } = useAuth();
  const db = supabase as any;
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileRow>({ full_name: "", avatar_url: null, phone: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await db
        .from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("user_id", user.id)
        .single();
      setProfile({
        full_name: data?.full_name ?? "",
        avatar_url: data?.avatar_url ?? null,
        phone: data?.phone ?? null,
      });
      setLoading(false);
    };
    void load();
  }, [user, db]);

  const initials = profile.full_name
    .split(" ")
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const saveProfile = async () => {
    if (!user) return;
    if (!profile.full_name.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        phone: profile.phone?.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el perfil");
      return;
    }
    toast.success("Perfil actualizado");
    await bootstrapUser();
  };

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast.error("No se pudo subir la foto");
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await db.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setUploading(false);
    if (updErr) {
      toast.error("No se pudo actualizar el perfil");
      return;
    }
    setProfile((p) => ({ ...p, avatar_url: url }));
    toast.success("Foto actualizada");
    await bootstrapUser();
  };

  const changePassword = async () => {
    if (pwd.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (pwd !== pwd2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo cambiar la contraseña");
      return;
    }
    toast.success("Contraseña actualizada");
    setPwd("");
    setPwd2("");
  };

  if (loading) {
    return (
      <div className="panel-surface p-8 text-center text-sm text-muted-foreground">Cargando…</div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader eyebrow="Cuenta" title="Mi perfil" description="Foto, nombre, contacto y contraseña." />

      <section className="panel-surface p-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition hover:scale-105 disabled:opacity-60"
              aria-label="Cambiar foto"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAvatar(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-foreground">{profile.full_name || "Sin nombre"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Toca el icono de la cámara para cambiar la foto.</p>
          </div>
        </div>
      </section>

      <section className="panel-surface space-y-3 p-5">
        <header className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Datos personales</h2>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Nombre completo</Label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Teléfono</Label>
            <Input
              type="tel"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input value={user?.email ?? ""} disabled />
            <p className="mt-1 text-[11px] text-muted-foreground">El email no se puede cambiar desde aquí.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void saveProfile()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>
      </section>

      <section className="panel-surface space-y-3 p-5">
        <header className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Cambiar contraseña</h2>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Nueva contraseña</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Repetir contraseña</Label>
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => void changePassword()} disabled={pwdSaving || !pwd}>
            {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Actualizar contraseña
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AccountSettingsView;
