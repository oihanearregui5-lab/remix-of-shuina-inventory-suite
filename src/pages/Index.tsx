import { useState } from "react";
import { Menu, Clock, ShieldCheck, LogOut, Truck, ClipboardList, LayoutDashboard, CalendarRange, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Fichajes from "@/pages/Fichajes";
import AdminFichajes from "@/pages/AdminFichajes";
import TaskHubView from "@/components/TaskHubView";
import MachineFleetView from "@/components/MachineFleetView";
import AdminHubView from "@/components/AdminHubView";
import StaffHubView from "@/components/StaffHubView";
import ChatHubView from "@/components/ChatHubView";

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<"dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "admin">("dashboard");
  const { canViewAdmin, profile, signOut } = useAuth();

  const handleSectionChange = (section: "dashboard" | "fichajes" | "tasks" | "machines" | "staff" | "chat" | "admin") => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "dashboard":
        return <AdminHubView />;
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
    <div className="min-h-screen flex w-full">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 w-64 bg-primary flex-col border-r border-primary/20">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-primary-foreground/10">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Truck className="w-5 h-5 text-secondary-foreground" />
          </div>
          <span className="font-extrabold text-primary-foreground tracking-wider text-lg">TRANSTUBARI</span>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-4 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
              Secciones
            </span>
          </div>

          <button
            onClick={() => handleSectionChange("dashboard")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "dashboard"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span>Resumen</span>
          </button>

          <button
            onClick={() => handleSectionChange("fichajes")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "fichajes"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span>Fichajes</span>
          </button>

          <button
            onClick={() => handleSectionChange("tasks")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "tasks"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            <span>Tareas</span>
          </button>

          <button
            onClick={() => handleSectionChange("machines")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "machines"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <Truck className="w-5 h-5 flex-shrink-0" />
            <span>Máquinas</span>
          </button>

          <button
            onClick={() => handleSectionChange("staff")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "staff"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <CalendarRange className="w-5 h-5 flex-shrink-0" />
            <span>Personal</span>
          </button>

          <button
            onClick={() => handleSectionChange("chat")}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              currentSection === "chat"
                ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
            }`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <span>Chat</span>
          </button>

          {canViewAdmin && (
            <button
              onClick={() => handleSectionChange("admin")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "admin"
                  ? "text-secondary bg-primary-foreground/10 border-l-3 border-secondary"
                  : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
              }`}
            >
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>Admin Fichajes</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-primary-foreground/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary-foreground truncate">
                {profile?.full_name ?? "Usuario"}
              </p>
              <p className="text-xs text-primary-foreground/50">Transtubari v1.0</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-md text-primary-foreground/50 hover:text-destructive hover:bg-primary-foreground/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <aside className="h-full w-64 bg-primary flex flex-col">
          <div className="h-16 flex items-center gap-3 px-5 border-b border-primary-foreground/10">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Truck className="w-5 h-5 text-secondary-foreground" />
            </div>
            <span className="font-extrabold text-primary-foreground tracking-wider">TRANSTUBARI</span>
          </div>

          <nav className="flex-1 py-4">
            <button
              onClick={() => handleSectionChange("dashboard")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "dashboard"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Resumen</span>
            </button>

            <button
              onClick={() => handleSectionChange("fichajes")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "fichajes"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Fichajes</span>
            </button>

            <button
              onClick={() => handleSectionChange("tasks")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "tasks"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Tareas</span>
            </button>

            <button
              onClick={() => handleSectionChange("machines")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "machines"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <Truck className="w-5 h-5" />
              <span>Máquinas</span>
            </button>

            <button
              onClick={() => handleSectionChange("staff")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "staff"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <CalendarRange className="w-5 h-5" />
              <span>Personal</span>
            </button>

            <button
              onClick={() => handleSectionChange("chat")}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                currentSection === "chat"
                  ? "text-secondary bg-primary-foreground/10"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat</span>
            </button>

            {canViewAdmin && (
              <button
                onClick={() => handleSectionChange("admin")}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  currentSection === "admin"
                    ? "text-secondary bg-primary-foreground/10"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Admin Fichajes</span>
              </button>
            )}
          </nav>

          <div className="p-4 border-t border-primary-foreground/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary-foreground truncate">
                {profile?.full_name ?? "Usuario"}
              </p>
              <button onClick={signOut} className="p-2 text-primary-foreground/50 hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center">
              <Truck className="w-4 h-4 text-secondary-foreground" />
            </div>
            <span className="font-extrabold text-foreground tracking-wider text-sm">TRANSTUBARI</span>
          </div>
          <div className="w-9" />
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderCurrentSection()}
        </div>
      </main>
    </div>
  );
};

export default Index;
