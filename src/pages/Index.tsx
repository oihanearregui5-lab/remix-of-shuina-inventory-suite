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
  { key: "dashboard", label: "Inicio", description: "Estado actual y accesos rápidos.", icon: LayoutDashboard, workspace: "worker", mobilePrimary: true },
  { key: "workReports", label: "Parte", description: "Iniciar, seguir y finalizar trabajo.", icon: FileText, workspace: "worker", mobilePrimary: true },
  { key: "tasks", label: "Tareas", description: "Pendientes y prioridades del día.", icon: ClipboardList, workspace: "worker", mobilePrimary: true },
  { key: "chat", label: "Chat", description: "Mensajes internos del equipo.", icon: MessageSquare, workspace: "worker", mobilePrimary: true },
  { key: "machines", label: "Máquinas", description: "Flota, incidencias y mantenimiento.", icon: Truck, workspace: "worker" },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas y movimientos de repostaje.", icon: Fuel, workspace: "worker", mobilePrimary: true },
  { key: "staff", label: "Calendario", description: "Vacaciones, turnos y solicitudes.", icon: CalendarRange, workspace: "worker" },
  { key: "admin", label: "Dashboard", description: "Resumen global y control operativo.", icon: ShieldCheck, workspace: "admin", adminOnly: true, mobilePrimary: true },
  { key: "fichajes", label: "Fichajes", description: "Control y revisión de entradas y salidas.", icon: Clock, workspace: "admin", mobilePrimary: true },
  { key: "workReports", label: "Partes", description: "Seguimiento y corrección de partes.", icon: FileText, workspace: "admin", mobilePrimary: true },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas, gastos y exportación.", icon: Fuel, workspace: "admin", mobilePrimary: true },
  { key: "vacations", label: "Calendario", description: "Vacaciones, jornadas y calendario global.", icon: CalendarRange, workspace: "admin" },
  { key: "albaranes", label: "Albaranes", description: "Módulo preparado para gestión documental.", icon: ReceiptText, workspace: "admin", adminOnly: true },
  { key: "staff", label: "Trabajadores", description: "Gestión del equipo y solicitudes.", icon: CalendarRange, workspace: "admin" },
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
    const workerSections: AppSection[] = ["dashboard", "workReports", "tasks", "chat", "machines", "gasoline", "staff"];
    const adminSections: AppSection[] = role === "admin"
      ? ["admin", "fichajes", "workReports", "gasoline", "vacations", "albaranes", "staff"]
      : ["fichajes", "workReports", "gasoline", "vacations", "staff"];
    const allowed = workspaceMode === "admin" && canViewAdmin ? adminSections : workerSections;
    return sections.filter((section) => {
      const sectionWorkspace = section.workspace ?? "worker";
      const matchesWorkspace = workspaceMode === "admin" ? sectionWorkspace === "admin" : sectionWorkspace === "worker";
      return matchesWorkspace && allowed.includes(section.key) && (!section.adminOnly || canViewAdmin);
    });
  }, [canViewAdmin, role, workspaceMode]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === currentSection)) {
      setCurrentSection(visibleSections[0]?.key ?? "fichajes");
    }
  }, [currentSection, visibleSections]);

  const handleWorkspaceModeChange = (mode: "worker" | "admin") => {
    setWorkspaceMode(mode);
    setCurrentSection(mode === "admin" ? (role === "admin" ? "admin" : "fichajes") : "dashboard");
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
