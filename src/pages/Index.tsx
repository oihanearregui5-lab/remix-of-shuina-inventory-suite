import { useEffect, useMemo, useState } from "react";
import { Clock, ShieldCheck, Truck, ClipboardList, LayoutDashboard, CalendarRange, MessageSquare, Fuel, FileText, ReceiptText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Fichajes from "@/pages/Fichajes";
import AdminFichajes from "@/pages/AdminFichajes";
import TaskHubView from "@/components/TaskHubView";
import MachineFleetView from "@/components/MachineFleetView";
import DashboardView from "@/components/DashboardView";
import AdminHubView from "@/components/AdminHubView";
import StaffHubView from "@/components/StaffHubView";
import ChatHubView from "@/components/ChatHubView";
import GasolineHubView from "@/components/GasolineHubView";
import WorkReportsHubView from "@/components/WorkReportsHubView";
import VacationsJourneysView from "@/components/admin/VacationsJourneysView";
import AdminAlbaranesView from "@/components/admin/AdminAlbaranesView";
import AppShell, { type AppShellSection } from "@/components/layout/AppShell";

type AppSection = "dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "gasoline" | "workReports" | "admin" | "vacations" | "albaranes";

const sections: AppShellSection<AppSection>[] = [
  { key: "dashboard", label: "Inicio", description: "Vista general del día y accesos clave.", icon: LayoutDashboard, workspace: "shared", mobilePrimary: true },
  { key: "fichajes", label: "Fichar", description: "Entrada, salida e historial.", icon: Clock, workspace: "shared", mobilePrimary: true },
  { key: "workReports", label: "Parte de trabajo", description: "Iniciar, retomar y cerrar partes.", icon: FileText, workspace: "shared", mobilePrimary: true },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas y repostajes asociados.", icon: Fuel, workspace: "shared", mobilePrimary: true },
  { key: "tasks", label: "Tareas", description: "Agenda y prioridades.", icon: ClipboardList, workspace: "worker" },
  { key: "machines", label: "Máquinas", description: "Flota y mantenimiento.", icon: Truck, workspace: "worker" },
  { key: "staff", label: "Personal", description: "Turnos, vacaciones y solicitudes.", icon: CalendarRange, workspace: "worker" },
  { key: "chat", label: "Chat", description: "Mensajes internos.", icon: MessageSquare, workspace: "worker" },
  { key: "vacations", label: "Vacaciones", description: "Calendario, jornadas y fichas.", icon: CalendarRange, workspace: "admin" },
  { key: "albaranes", label: "Albaranes", description: "Módulo reservado para gestión documental.", icon: ReceiptText, workspace: "admin", adminOnly: true },
  { key: "admin", label: "Admin", description: "Control general y validaciones.", icon: ShieldCheck, workspace: "admin", adminOnly: true },
];

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<AppSection>("dashboard");
  const [workspaceMode, setWorkspaceMode] = useState<"worker" | "admin">("worker");
  const { canViewAdmin, isAdmin, profile, role, signOut } = useAuth();

  useEffect(() => {
    if (!canViewAdmin && workspaceMode === "admin") {
      setWorkspaceMode("worker");
      setCurrentSection("dashboard");
    }
  }, [canViewAdmin, workspaceMode]);

  const handleSectionChange = (section: AppSection) => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const visibleSections = useMemo(() => {
    const workerSections: AppSection[] = ["dashboard", "fichajes", "workReports", "gasoline", "tasks", "machines", "staff", "chat"];
    const adminSections: AppSection[] = role === "admin"
      ? ["dashboard", "workReports", "gasoline", "vacations", "albaranes", "admin", "fichajes", "staff", "tasks", "machines", "chat"]
      : ["dashboard", "workReports", "gasoline", "vacations", "fichajes", "staff", "tasks", "machines", "chat"];
    const allowed = workspaceMode === "admin" && canViewAdmin ? adminSections : workerSections;
    return sections.filter((section) => allowed.includes(section.key) && (!section.adminOnly || canViewAdmin));
  }, [canViewAdmin, role, workspaceMode]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === currentSection)) {
      setCurrentSection(visibleSections[0]?.key ?? "fichajes");
    }
  }, [currentSection, visibleSections]);

  const handleWorkspaceModeChange = (mode: "worker" | "admin") => {
    setWorkspaceMode(mode);
    setCurrentSection(mode === "admin" ? (role === "admin" ? "admin" : "vacations") : "dashboard");
    setMobileMenuOpen(false);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "dashboard":
        return <DashboardView onNavigate={handleSectionChange} canViewAdmin={canViewAdmin} />;
      case "tasks":
        return <TaskHubView />;
      case "gasoline":
        return <GasolineHubView isAdminView={workspaceMode === "admin" && canViewAdmin} />;
      case "workReports":
        return <WorkReportsHubView isAdminView={workspaceMode === "admin" && canViewAdmin} />;
      case "machines":
        return <MachineFleetView />;
      case "staff":
        return <StaffHubView />;
      case "chat":
        return <ChatHubView />;
      case "albaranes":
        return <AdminAlbaranesView />;
      case "admin":
        return <AdminHubView />;
      case "vacations":
        return <VacationsJourneysView />;
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
      isAdmin={isAdmin}
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
