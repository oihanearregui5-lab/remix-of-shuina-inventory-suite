import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Clock, ShieldCheck, Truck, ClipboardList, LayoutDashboard, CalendarRange, MessageSquare, Fuel, FileText, ReceiptText, NotebookPen, Scale, Download, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardView from "@/components/DashboardView";
import Fichajes from "@/pages/Fichajes";
import AppShell, { type AppShellSection } from "@/components/layout/AppShell";
import WorkspaceSelector from "@/components/WorkspaceSelector";
import SectionFallback from "@/components/shared/SectionFallback";

// Loaders separados para poder hacer prefetch al hover/focus
const loadAdminFichajes = () => import("@/pages/AdminFichajes");
const loadTaskHub = () => import("@/components/TaskHubView");
const loadMachineFleet = () => import("@/components/MachineFleetView");
const loadAdminHub = () => import("@/components/AdminHubView");
const loadStaffHub = () => import("@/components/StaffHubView");
const loadChatHub = () => import("@/components/ChatHubView");
const loadGasolineHub = () => import("@/components/GasolineHubView");
const loadWorkReportsHub = () => import("@/components/WorkReportsHubView");
const loadVacationsJourneys = () => import("@/components/admin/VacationsJourneysView");
const loadAdminAlbaranes = () => import("@/components/admin/AdminAlbaranesView");
const loadPersonalNotes = () => import("@/components/PersonalNotesView");
const loadTonnageTrips = () => import("@/components/TonnageTripsView");
const loadAdminTonnage = () => import("@/components/admin/AdminTonnageView");
const loadReports = () => import("@/components/admin/ReportsView");
const loadAuditLogs = () => import("@/components/admin/AuditLogsView");
const loadUnifiedCalendar = () => import("@/components/UnifiedCalendarView");

const AdminFichajes = lazy(loadAdminFichajes);
const TaskHubView = lazy(loadTaskHub);
const MachineFleetView = lazy(loadMachineFleet);
const AdminHubView = lazy(loadAdminHub);
const StaffHubView = lazy(loadStaffHub);
const ChatHubView = lazy(loadChatHub);
const GasolineHubView = lazy(loadGasolineHub);
const WorkReportsHubView = lazy(loadWorkReportsHub);
const VacationsJourneysView = lazy(loadVacationsJourneys);
const AdminAlbaranesView = lazy(loadAdminAlbaranes);
const PersonalNotesView = lazy(loadPersonalNotes);
const TonnageTripsView = lazy(loadTonnageTrips);
const AdminTonnageView = lazy(loadAdminTonnage);
const ReportsView = lazy(loadReports);
const AuditLogsView = lazy(loadAuditLogs);
const UnifiedCalendarView = lazy(loadUnifiedCalendar);

// Mapa sección → loader. Se invoca al hacer hover/focus en un item de
// navegación para precargar el chunk antes de que el usuario navegue.
const sectionPrefetchers: Partial<Record<string, () => Promise<unknown>>> = {
  fichajes: loadAdminFichajes,
  tasks: loadTaskHub,
  machines: loadMachineFleet,
  admin: loadAdminHub,
  staff: loadStaffHub,
  chat: loadChatHub,
  gasoline: loadGasolineHub,
  workReports: loadWorkReportsHub,
  vacations: loadVacationsJourneys,
  albaranes: loadAdminAlbaranes,
  notes: loadPersonalNotes,
  tonnage: loadTonnageTrips,
  reports: loadReports,
  audit: loadAuditLogs,
  unifiedCalendar: loadUnifiedCalendar,
};

type AppSection = "dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "gasoline" | "workReports" | "admin" | "vacations" | "albaranes" | "notes" | "tonnage" | "reports" | "audit" | "unifiedCalendar";
type WorkspaceMode = "worker" | "admin";

const sections: AppShellSection<AppSection>[] = [
  { key: "dashboard", label: "Inicio", description: "Estado actual y accesos rápidos.", icon: LayoutDashboard, workspace: "worker", mobilePrimary: true },
  { key: "workReports", label: "Parte", description: "Iniciar, seguir y finalizar trabajo.", icon: FileText, workspace: "worker", mobilePrimary: true },
  { key: "tasks", label: "Tareas", description: "Pendientes y prioridades del día.", icon: ClipboardList, workspace: "worker", mobilePrimary: true },
  { key: "chat", label: "Chat", description: "Mensajes internos del equipo.", icon: MessageSquare, workspace: "worker", mobilePrimary: true },
  { key: "notes", label: "Mi espacio", description: "Notas privadas, rápidas y personales.", icon: NotebookPen, workspace: "worker", mobilePrimary: true },
  { key: "machines", label: "Máquinas", description: "Flota, incidencias y mantenimiento.", icon: Truck, workspace: "worker" },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas y movimientos de repostaje.", icon: Fuel, workspace: "worker", mobilePrimary: true },
  { key: "tonnage", label: "Toneladas", description: "Registra los viajes de hoy en pocos segundos.", icon: Scale, workspace: "worker", mobilePrimary: true },
  { key: "staff", label: "Equipo", description: "Vacaciones, turnos y solicitudes.", icon: CalendarRange, workspace: "worker" },
  { key: "unifiedCalendar", label: "Agenda", description: "Tareas, vacaciones, ITV y festivos en un calendario.", icon: CalendarRange, workspace: "worker" },
  { key: "admin", label: "Dashboard", description: "Resumen global y control operativo.", icon: ShieldCheck, workspace: "admin", adminOnly: true, mobilePrimary: true },
  { key: "fichajes", label: "Fichajes", description: "Control y revisión de entradas y salidas.", icon: Clock, workspace: "admin", mobilePrimary: true },
  { key: "workReports", label: "Partes", description: "Seguimiento y corrección de partes.", icon: FileText, workspace: "admin", mobilePrimary: true },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas, gastos y exportación.", icon: Fuel, workspace: "admin", mobilePrimary: true },
  { key: "tonnage", label: "Toneladas", description: "Tabla mensual de viajes y kilos por camión.", icon: Scale, workspace: "admin", mobilePrimary: true },
  { key: "vacations", label: "Vacaciones", description: "Vacaciones, jornadas y calendario global.", icon: CalendarRange, workspace: "admin" },
  { key: "unifiedCalendar", label: "Agenda", description: "Calendario unificado de toda la operativa.", icon: CalendarRange, workspace: "admin" },
  { key: "albaranes", label: "Albaranes", description: "Módulo preparado para gestión documental.", icon: ReceiptText, workspace: "admin", adminOnly: true },
  { key: "reports", label: "Reportes", description: "Exporta fichajes, partes, toneladas y más.", icon: Download, workspace: "admin" },
  { key: "audit", label: "Auditoría", description: "Historial de cambios sensibles.", icon: History, workspace: "admin", adminOnly: true },
  { key: "staff", label: "Trabajadores", description: "Gestión del equipo y solicitudes.", icon: CalendarRange, workspace: "admin" },
];

const WORKSPACE_KEY = "transtubari-workspace-mode";

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<AppSection>("dashboard");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.sessionStorage.getItem(WORKSPACE_KEY);
    return stored === "worker" || stored === "admin" ? (stored as WorkspaceMode) : null;
  });
  const { canViewAdmin, isAdmin, profile, role, signOut } = useAuth();

  // Si pierde permisos admin mientras estaba en admin, vuelve al selector
  useEffect(() => {
    if (workspaceMode === "admin" && !canViewAdmin) {
      setWorkspaceMode(null);
      if (typeof window !== "undefined") window.sessionStorage.removeItem(WORKSPACE_KEY);
    }
  }, [canViewAdmin, workspaceMode]);

  const handleSectionChange = (section: AppSection) => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const visibleSections = useMemo(() => {
    if (!workspaceMode) return [];
    const workerSections: AppSection[] = ["dashboard", "workReports", "tasks", "chat", "notes", "machines", "gasoline", "tonnage", "staff", "unifiedCalendar"];
    const adminSections: AppSection[] = role === "admin"
      ? ["admin", "fichajes", "workReports", "gasoline", "tonnage", "vacations", "unifiedCalendar", "albaranes", "reports", "audit", "staff"]
      : ["fichajes", "workReports", "gasoline", "tonnage", "vacations", "unifiedCalendar", "reports", "staff"];
    const allowed = workspaceMode === "admin" && canViewAdmin ? adminSections : workerSections;
    return sections.filter((section) => {
      const sectionWorkspace = section.workspace ?? "worker";
      const matchesWorkspace = workspaceMode === "admin" ? sectionWorkspace === "admin" : sectionWorkspace === "worker";
      return matchesWorkspace && allowed.includes(section.key) && (!section.adminOnly || canViewAdmin);
    });
  }, [canViewAdmin, role, workspaceMode]);

  useEffect(() => {
    if (!visibleSections.length) return;
    if (!visibleSections.some((section) => section.key === currentSection)) {
      setCurrentSection(visibleSections[0]?.key ?? "dashboard");
    }
  }, [currentSection, visibleSections]);

  const handleSelectWorkspace = (mode: WorkspaceMode) => {
    if (mode === "admin" && !canViewAdmin) return;
    setWorkspaceMode(mode);
    if (typeof window !== "undefined") window.sessionStorage.setItem(WORKSPACE_KEY, mode);
    setCurrentSection(mode === "admin" ? (role === "admin" ? "admin" : "fichajes") : "dashboard");
    setMobileMenuOpen(false);
  };

  const handleChangeWorkspace = () => {
    setWorkspaceMode(null);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(WORKSPACE_KEY);
    setMobileMenuOpen(false);
  };

  // Sin espacio elegido → muestra el selector
  if (!workspaceMode) {
    return (
      <WorkspaceSelector
        profileName={profile?.full_name}
        canViewAdmin={canViewAdmin}
        onSelect={handleSelectWorkspace}
        onSignOut={signOut}
      />
    );
  }

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
      case "notes":
        return <PersonalNotesView />;
      case "tonnage":
        return workspaceMode === "admin" && canViewAdmin ? <AdminTonnageView /> : <TonnageTripsView />;
      case "albaranes":
        return <AdminAlbaranesView />;
      case "admin":
        return <AdminHubView />;
      case "vacations":
        return <VacationsJourneysView />;
      case "unifiedCalendar":
        return <UnifiedCalendarView />;
      case "reports":
        return <ReportsView />;
      case "audit":
        return <AuditLogsView />;
      case "fichajes":
      default:
        return workspaceMode === "admin" && canViewAdmin ? <AdminFichajes /> : <Fichajes />;
    }
  };

  const handleNotificationNavigate = (link: string) => {
    const map: Record<string, AppSection> = {
      tasks: "tasks",
      chat: "chat",
      staff: workspaceMode === "admin" && canViewAdmin ? "vacations" : "staff",
      machines: workspaceMode === "admin" && canViewAdmin ? "admin" : "machines",
      workReports: "workReports",
      gasoline: "gasoline",
      tonnage: "tonnage",
      albaranes: "albaranes",
    };
    const target = map[link];
    if (target && visibleSections.some((s) => s.key === target)) {
      handleSectionChange(target);
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
      profileName={profile?.full_name}
      onSignOut={signOut}
      onChangeWorkspace={handleChangeWorkspace}
      onNotificationNavigate={handleNotificationNavigate}
    >
      <Suspense fallback={<section className="panel-surface px-5 py-8 text-sm text-muted-foreground">Cargando módulo…</section>}>
        {renderCurrentSection()}
      </Suspense>
    </AppShell>
  );
};

export default Index;
