import { useMemo, useState } from "react";
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
  { key: "fichajes", label: "Fichar", description: "Entrada, salida e historial de jornada.", icon: Clock },
  { key: "dashboard", label: "Inicio", description: "Estado actual y accesos rápidos.", icon: LayoutDashboard },
  { key: "tasks", label: "Tareas", description: "Agenda operativa, prioridades y calendario.", icon: ClipboardList },
  { key: "machines", label: "Máquinas", description: "Flota, averías, mantenimiento y observaciones.", icon: Truck },
  { key: "staff", label: "Personal", description: "Turnos, vacaciones y solicitudes del equipo.", icon: CalendarRange },
  { key: "chat", label: "Chat", description: "Canales internos para coordinar la operación.", icon: MessageSquare },
  { key: "admin", label: "Administración", description: "Control centralizado de validaciones y alertas.", icon: ShieldCheck, adminOnly: true },
];

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<AppSection>("fichajes");
  const { canViewAdmin, profile, signOut } = useAuth();

  const handleSectionChange = (section: AppSection) => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const visibleSections = useMemo(
    () => sections.filter((section) => !section.adminOnly || canViewAdmin),
    [canViewAdmin]
  );

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
        return <AdminFichajes />;
      case "fichajes":
      default:
        return <Fichajes />;
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
      profileName={profile?.full_name}
      onSignOut={signOut}
    >
      {renderCurrentSection()}
    </AppShell>
  );
};

export default Index;
