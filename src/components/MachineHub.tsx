import { lazy, Suspense, useState } from "react";
import { Truck, Wrench, AlertTriangle, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MachineFleetView = lazy(() => import("@/components/MachineFleetView"));
const MaintenanceAnalyticsView = lazy(() => import("@/components/machines/MaintenanceAnalyticsView"));

interface MachineHubProps {
  isAdminView?: boolean;
}

const SubviewLoader = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
    ))}
  </div>
);

const MachineHub = ({ isAdminView = false }: MachineHubProps) => {
  const [tab, setTab] = useState<string>("flota");

  const cols = isAdminView ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className={`!grid w-full ${cols} h-auto`}>
          <TabsTrigger value="flota" className="gap-2 py-2.5">
            <Truck className="h-4 w-4" /> Flota
          </TabsTrigger>
          <TabsTrigger value="averia" className="gap-2 py-2.5">
            <AlertTriangle className="h-4 w-4" /> Avería
          </TabsTrigger>
          <TabsTrigger value="mantenimiento" className="gap-2 py-2.5">
            <Wrench className="h-4 w-4" /> Mantenimiento
          </TabsTrigger>
          {isAdminView && (
            <TabsTrigger value="analisis" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4" /> Análisis
            </TabsTrigger>
          )}
        </TabsList>

        <Suspense fallback={<SubviewLoader />}>
          <TabsContent value="flota" className="mt-0">
            <MachineFleetView />
          </TabsContent>
          <TabsContent value="averia" className="mt-0">
            <MachineFleetView defaultStatusFilter="repair" />
          </TabsContent>
          <TabsContent value="mantenimiento" className="mt-0">
            <MachineFleetView defaultStatusFilter="maintenance" />
          </TabsContent>
          {isAdminView && (
            <TabsContent value="analisis" className="mt-0">
              <MaintenanceAnalyticsView />
            </TabsContent>
          )}
        </Suspense>
      </Tabs>
    </div>
  );
};

export default MachineHub;
