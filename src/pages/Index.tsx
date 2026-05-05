import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Clock, ShieldCheck, Truck, ClipboardList, LayoutDashboard, CalendarRange, MessageSquare, Fuel, FileText, ReceiptText, NotebookPen, Scale, BarChart3 } from "lucide-react";
import { useUIMode } from "@/hooks/useUIMode";
import { useAuth } from "@/hooks/useAuth";
import { useNavPreferences, applyNavPrefs } from "@/hooks/useNavPreferences";
import DashboardView from "@/components/DashboardView";
import Fichajes from "@/pages/Fichajes";
const AdminFichajes = lazy(() => import("@/pages/AdminFichajes"));
const TaskHubView = lazy(() => import("@/components/TaskHubView"));
const MachineHub = lazy(() => import("@/components/MachineHub"));
const AdminHubView = lazy(() => import("@/components/AdminHubView"));
const StaffHubView = lazy(() => import("@/components/StaffHubView"));
const AdminStaffSimpleView = lazy(() => import("@/components/staff/AdminStaffSimpleView"));
const ChatHubView = lazy(() => import("@/components/ChatHubView"));
const GasolineHubView = lazy(() => import("@/components/GasolineHubView"));
const WorkReportsHubView = lazy(() => import("@/components/WorkReportsHubView"));
const VacationsJourneysView = lazy(() => import("@/components/admin/VacationsJourneysView"));
const AdminAlbaranesView = lazy(() => import("@/components/admin/AdminAlbaranesView"));
const PersonalNotesView = lazy(() => import("@/components/PersonalNotesView"));
const TonnageHub = lazy(() => import("@/components/tonnage/TonnageHub"));
const AccountSettingsView = lazy(() => import("@/components/AccountSettingsView"));
const AnalyticsDashboardView = lazy(() => import("@/components/admin/AnalyticsDashboardView"));
import AppShell, { type AppShellSection } from "@/components/layout/AppShell";
import WorkspaceSelector from "@/components/WorkspaceSelector";

type AppSection = "dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "gasoline" | "workReports" | "admin" | "vacations" | "albaranes" | "notes" | "tonnage" | "account" | "analytics";
type WorkspaceMode = "worker" | "admin";

const sections: AppShellSection<AppSection>[] = [
  { key: "dashboard", label: "Inicio", description: "Estado actual y accesos rápidos.", icon: LayoutDashboard, workspace: "worker", mobilePrimary: true },
  { key: "workReports", label: "Parte", description: "Iniciar, seguir y finalizar trabajo.", icon: FileText, workspace: "worker", mobilePrimary: true },
  { key: "tasks", label: "Tareas", description: "Pendientes y prioridades del equipo.", icon: ClipboardList, workspace: "admin", mobilePrimary: true },
  { key: "chat", label: "Chat", description: "Mensajes internos del equipo.", icon: MessageSquare, workspace: "worker", mobilePrimary: true },
  { key: "tonnage", label: "Viajes", description: "Registra viajes durante el día y consulta tu actividad.", icon: Scale, workspace: "worker", mobilePrimary: true },
  { key: "notes", label: "Mi espacio", description: "Notas privadas, rápidas y personales.", icon: NotebookPen, workspace: "worker", mobilePrimary: true },
  { key: "machines", label: "Máquinas", description: "Flota, incidencias y mantenimiento.", icon: Truck, workspace: "worker" },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas y movimientos de repostaje.", icon: Fuel, workspace: "worker", mobilePrimary: true },
  { key: "staff", label: "Calendario", description: "Vacaciones, turnos y solicitudes.", icon: CalendarRange, workspace: "worker" },
  { key: "albaranes", label: "Albaranes", description: "Sube facturas y albaranes de tus compras.", icon: ReceiptText, workspace: "worker" },
  { key: "admin", label: "Resumen", description: "Visión global del día y control operativo.", icon: ShieldCheck, workspace: "admin", adminOnly: true, mobilePrimary: true },
  { key: "fichajes", label: "Fichajes", description: "Control y revisión de entradas y salidas.", icon: Clock, workspace: "admin", mobilePrimary: true },
  { key: "workReports", label: "Partes", description: "Seguimiento y corrección de partes.", icon: FileText, workspace: "admin", mobilePrimary: true },
  { key: "tonnage", label: "Viajes", description: "Análisis, zonas, tabla mensual y camiones.", icon: Scale, workspace: "admin", mobilePrimary: true },
  { key: "machines", label: "Máquinas", description: "Flota, consumibles y mantenimiento.", icon: Truck, workspace: "admin" },
  { key: "gasoline", label: "Gasolina", description: "Tarjetas, gastos y exportación.", icon: Fuel, workspace: "admin", mobilePrimary: true },
  { key: "vacations", label: "Calendario", description: "Vacaciones, jornadas y calendario global.", icon: CalendarRange, workspace: "admin" },
  { key: "albaranes", label: "Albaranes", description: "Registro de pedidos por proveedor, destino y máquina.", icon: ReceiptText, workspace: "admin" },
  { key: "staff", label: "Trabajadores", description: "Gestión del equipo y solicitudes.", icon: CalendarRange, workspace: "admin" },
  { key: "analytics", label: "Analítica", description: "KPIs, gráficas y alertas operativas.", icon: BarChart3, workspace: "admin", adminOnly: true },
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
  const { canViewAdmin, isAdmin, isKioskViajes, profile, role, signOut } = useAuth();
  const { prefs: navPrefs } = useNavPreferences(workspaceMode === "admin" && canViewAdmin ? "admin" : "worker");
  const { isSimple } = useUIMode();

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
    // Orden unificado: secciones comunes primero, exclusivas al final, mismo orden en ambos workspaces.
    const unifiedOrder: AppSection[] = [
      "dashboard",      // worker
      "admin",          // admin
      "fichajes",       // admin
      "workReports",    // ambos
      "tasks",          // worker
      "chat",           // worker
      "tonnage",        // ambos
      "notes",          // worker
      "machines",       // ambos
      "gasoline",       // ambos
      "staff",          // ambos
      "vacations",      // admin
      "albaranes",      // ambos
      "analytics",      // admin
    ];
    const workerAllowed = new Set<AppSection>(["dashboard", "workReports", "chat", "tonnage", "notes", "machines", "gasoline", "staff", "albaranes"]);
    const adminAllowed = new Set<AppSection>(role === "admin"
      ? ["fichajes", "admin", "workReports", "tasks", "tonnage", "machines", "gasoline", "vacations", "albaranes", "staff", "analytics"]
      : ["fichajes", "workReports", "tonnage", "machines", "gasoline", "vacations", "staff"]);
    const allowedSet = workspaceMode === "admin" && canViewAdmin ? adminAllowed : workerAllowed;
    const allowed = unifiedOrder.filter((k) => allowedSet.has(k));
    const filtered = sections.filter((section) => {
      const sectionWorkspace = section.workspace ?? "worker";
      const matchesWorkspace = workspaceMode === "admin" ? sectionWorkspace === "admin" : sectionWorkspace === "worker";
      return matchesWorkspace && allowed.includes(section.key) && (!section.adminOnly || canViewAdmin);
    });
    // Reordenar según el orden unificado para que worker y admin compartan secuencia.
    const baseOrdered = allowed
      .map((k) => filtered.find((s) => s.key === k))
      .filter((s): s is typeof filtered[number] => Boolean(s));
    // Aplicar preferencias del usuario (oculto + orden) sobre el orden unificado.
    const orderedKeys = applyNavPrefs(baseOrdered.map((s) => s.key), navPrefs);
    return orderedKeys
      .map((k) => baseOrdered.find((s) => s.key === k))
      .filter((s): s is typeof baseOrdered[number] => Boolean(s));
  }, [canViewAdmin, role, workspaceMode, isSimple, navPrefs]);

  // Todas las secciones permitidas por rol/workspace SIN aplicar el filtro de "ocultas".
  // Esto se usa en el panel "Personalizar menú" para que el usuario pueda volver a mostrar
  // secciones que había ocultado previamente.
  const allAllowedSections = useMemo(() => {
    if (!workspaceMode) return [];
    const unifiedOrder: AppSection[] = [
      "dashboard", "admin", "fichajes", "workReports", "tasks", "chat", "tonnage",
      "notes", "machines", "gasoline", "staff", "vacations", "albaranes", "analytics",
    ];
    const workerAllowed = new Set<AppSection>(["dashboard", "workReports", "chat", "tonnage", "notes", "machines", "gasoline", "staff", "albaranes"]);
    const adminAllowed = new Set<AppSection>(role === "admin"
      ? ["fichajes", "admin", "workReports", "tasks", "tonnage", "machines", "gasoline", "vacations", "albaranes", "staff", "analytics"]
      : ["fichajes", "workReports", "tonnage", "machines", "gasoline", "vacations", "staff"]);
    const allowedSet = workspaceMode === "admin" && canViewAdmin ? adminAllowed : workerAllowed;
    const allowed = unifiedOrder.filter((k) => allowedSet.has(k));
    const filtered = sections.filter((section) => {
      const sectionWorkspace = section.workspace ?? "worker";
      const matchesWorkspace = workspaceMode === "admin" ? sectionWorkspace === "admin" : sectionWorkspace === "worker";
      return matchesWorkspace && allowed.includes(section.key) && (!section.adminOnly || canViewAdmin);
    });
    return allowed
      .map((k) => filtered.find((s) => s.key === k))
      .filter((s): s is typeof filtered[number] => Boolean(s));
  }, [canViewAdmin, role, workspaceMode]);

  useEffect(() => {
    if (!visibleSections.length) return;
    // "account" se accede desde el dialog y no aparece en visibleSections — permitirla.
    if (currentSection === "account") return;
    if (!visibleSections.some((section) => section.key === currentSection)) {
      setCurrentSection(visibleSections[0]?.key ?? "dashboard");
    }
  }, [currentSection, visibleSections]);

  const handleSelectWorkspace = (mode: WorkspaceMode) => {
    if (mode === "admin" && !canViewAdmin) return;
    setWorkspaceMode(mode);
    if (typeof window !== "undefined") window.sessionStorage.setItem(WORKSPACE_KEY, mode);
    setCurrentSection(mode === "admin" ? "fichajes" : "dashboard");
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
        return <MachineHub isAdminView={workspaceMode === "admin" && canViewAdmin} />;
      case "staff":
        return workspaceMode === "admin" && canViewAdmin ? <AdminStaffSimpleView /> : <StaffHubView />;
      case "chat":
        return <ChatHubView />;
      case "notes":
        return <PersonalNotesView />;
      case "tonnage":
        return <TonnageHub asAdmin={workspaceMode === "admin"} />;
      case "albaranes":
        return <AdminAlbaranesView isAdminView={workspaceMode === "admin" && canViewAdmin} />;
      case "account":
        return <AccountSettingsView />;
      case "admin":
        return <AdminHubView />;
      case "vacations":
        return <VacationsJourneysView />;
      case "analytics":
        return <AnalyticsDashboardView />;
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
      allSections={allAllowedSections}
      canViewAdmin={canViewAdmin}
      isAdmin={isAdmin}
      workspaceMode={workspaceMode}
      profileName={profile?.full_name}
      onSignOut={signOut}
      onChangeWorkspace={handleChangeWorkspace}
    >
      <Suspense fallback={<section className="panel-surface px-5 py-8 text-sm text-muted-foreground">Cargando módulo…</section>}>
        {renderCurrentSection()}
      </Suspense>
    </AppShell>
  );
};

export default Index;
