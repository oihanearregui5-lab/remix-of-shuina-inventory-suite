import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isKioskViajes: boolean;
  canViewAdmin: boolean;
  profile: { full_name: string } | null;
  role: "admin" | "secretary" | "worker" | "kiosk_viajes";
  bootstrapUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isKioskViajes: false,
  canViewAdmin: false,
  profile: null,
  role: "worker",
  bootstrapUser: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<"admin" | "secretary" | "worker" | "kiosk_viajes">("worker");
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const canViewAdmin = role === "admin" || role === "secretary";
  const isKioskViajes = role === "kiosk_viajes";

  const bootstrapUser = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;

    await supabase.rpc("ensure_current_user_setup", {
      _full_name: currentUser.user_metadata?.full_name ?? null,
    });

    await fetchUserData(currentUser.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setRole("worker");
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
    ]);

    if (rolesRes.error) {
      console.error("Error cargando roles", rolesRes.error);
    }

    if (profileRes.error) {
      console.error("Error cargando perfil", profileRes.error);
    }

    const roles = rolesRes.data?.map((entry) => entry.role) ?? [];
    const admin = roles.includes("admin");
    const secretary = roles.includes("secretary");
    const kiosk = roles.includes("kiosk_viajes" as never);
    setIsAdmin(admin);
    setRole(admin ? "admin" : secretary ? "secretary" : kiosk ? "kiosk_viajes" : "worker");
    setProfile(profileRes.data ?? null);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, canViewAdmin, profile, role, bootstrapUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
