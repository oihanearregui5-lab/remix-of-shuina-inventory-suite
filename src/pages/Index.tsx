import { useState } from "react";
import { Menu, Clock } from "lucide-react";
import InventorySidebar from "@/components/InventorySidebar";
import DashboardView from "@/components/DashboardView";
import CategoryView from "@/components/CategoryView";
import Fichajes from "@/pages/Fichajes";
import AdminFichajes from "@/pages/AdminFichajes";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<"inventory" | "fichajes" | "admin">("inventory");

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategory(id);
    setMobileMenuOpen(false);
  };

  const handleSectionChange = (section: "inventory" | "fichajes" | "admin") => {
    setCurrentSection(section);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentSection) {
      case "fichajes":
        return <Fichajes />;
      case "admin":
        return <AdminFichajes />;
      default:
        return selectedCategory ? (
          <CategoryView categoryId={selectedCategory} />
        ) : (
          <DashboardView />
        );
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

      <div className="hidden md:block h-screen sticky top-0">
        <InventorySidebar
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <InventorySidebar
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          collapsed={false}
          onToggleCollapse={() => {}}
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      <main className="flex-1 min-h-screen">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <span className="font-bold text-foreground tracking-wider">SUHI</span>
            <span className="font-bold text-primary tracking-wider">NA</span>
          </div>
          <div className="w-9" />
        </header>

        <div className="p-4 md:p-8 max-w-7xl">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
