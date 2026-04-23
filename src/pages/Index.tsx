import { useEffect, useMemo, useState } from "react";
import { Clock, ShieldCheck, Truck, ClipboardList, LayoutDashboard, CalendarRange, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Fichajes from "@/pages/Fichajes";
import AdminFichajes from "@/pages/AdminFichajes";
import TaskHubView from "@/components/TaskHubView";
import MachineFleetView from "@/components/MachineFleetView";
import DashboardView from "@/components/DashboardView";
import AdminHubView from "@/components/AdminHubView";
import StaffHubView from "@/components/StaffHubView";
import ChatHubView from "@/components/ChatHubView";
import AppShell, { type AppShellSection } from "@/components/layout/AppShell";

type AppSection = "dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "admin";

const sections: AppShellSection<AppSection>[] = [
  { key: "fichajes", label: "Fichar", description: "Entrada, salida e historial.", icon: Clock },
  { key: "dashboard", label: "Inicio", description: "Estado y accesos directos.", icon: LayoutDashboard },
  { key: "tasks", label: "Tareas", description: "Agenda y prioridades.", icon: ClipboardList },
  { key: "machines", label: "Máquinas", description: "Flota y mantenimiento.", icon: Truck },
  { key: "staff", label: "Personal", description: "Turnos y vacaciones.", icon: CalendarRange },
  { key: "chat", label: "Chat", description: "Mensajes internos.", icon: MessageSquare },
  { key: "admin", label: "Admin", description: "Validaciones y control.", icon: ShieldCheck, adminOnly: true },
];

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<AppSection>("fichajes");
  const [workspaceMode, setWorkspaceMode] = useState<"worker" | "admin">("worker");
  const { canViewAdmin, profile, signOut } = useAuth();

  useEffect(() => {
    if (!canViewAdmin && workspaceMode === "admin") {
      setWorkspaceMode("worker");
      setCurrentSection("fichajes");
    }
  }, [canViewAdmin, workspaceMode]);

  const handleSectionChange = (section: AppSection) => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const visibleSections = useMemo(() => {
    const workerSections: AppSection[] = ["fichajes", "dashboard", "tasks", "machines", "staff", "chat"];
    const adminSections: AppSection[] = ["admin", "fichajes", "staff", "tasks", "machines", "chat"];
    const allowed = workspaceMode === "admin" && canViewAdmin ? adminSections : workerSections;
    return sections.filter((section) => allowed.includes(section.key) && (!section.adminOnly || canViewAdmin));
  }, [canViewAdmin, workspaceMode]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === currentSection)) {
      setCurrentSection(visibleSections[0]?.key ?? "fichajes");
    }
  }, [currentSection, visibleSections]);

  const handleWorkspaceModeChange = (mode: "worker" | "admin") => {
    setWorkspaceMode(mode);
    setCurrentSection(mode === "admin" ? "admin" : "fichajes");
    setMobileMenuOpen(false);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "dashboard":
        return <DashboardView onNavigate={handleSectionChange} canViewAdmin={canViewAdmin} />;
      case "tasks":
        return <TaskHubView />;
      case "machines":
        return <MachineFleetView />;
      case "staff":
        return <StaffHubView />;
      case "chat":
        return <ChatHubView />;
      case "admin":
        return <AdminHubView />;
      case "fichajes":
      default:
        return workspaceMode === "admin" && canViewAdmin ? <AdminFichajes /> : <Fichajes />;
    }
  };

  return (
    <AppShell
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpenChange={setMobileMenuOpen}
      currentSection={currentSection}
      onSectionChange={handleSectionChange}
      sections={visibleSections}
      canViewAdmin={canViewAdmin}
      workspaceMode={workspaceMode}
      onWorkspaceModeChange={canViewAdmin ? handleWorkspaceModeChange : undefined}
      profileName={profile?.full_name}
      onSignOut={signOut}
    >
      <section className="panel-surface px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Espacio activo</p>
            <p className="text-sm font-semibold text-foreground">{workspaceMode === "admin" ? "Administración" : "Trabajador"}</p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {workspaceMode === "admin"
              ? "Control global, calendarios y revisión"
              : "Tus fichajes, tareas y vacaciones"}
          </p>
        </div>
      </section>
      {renderCurrentSection()}
    </AppShell>
  );
};

export default Index;
