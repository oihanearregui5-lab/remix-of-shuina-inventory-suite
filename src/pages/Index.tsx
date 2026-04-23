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
