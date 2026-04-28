import { lazy, Suspense, useState } from "react";
import { BarChart3, Calendar, History, MapPin, Plus, Truck, ListChecks } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import TonnageQuickTripDialog from "@/components/tonnage/TonnageQuickTripDialog";

const TonnageMyTrips = lazy(() => import("@/components/tonnage/TonnageMyTrips"));
const TonnageHistory = lazy(() => import("@/components/tonnage/TonnageHistory"));
const TonnageDashboard = lazy(() => import("@/components/tonnage/TonnageDashboard"));
const TonnageZoneTracking = lazy(() => import("@/components/tonnage/TonnageZoneTracking"));
const TonnageMonthlyTable = lazy(() => import("@/components/tonnage/TonnageMonthlyTable"));
const TonnageTrucksManager = lazy(() => import("@/components/tonnage/TonnageTrucksManager"));

const SubviewLoader = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
    ))}
  </div>
);

interface TonnageHubProps {
  asAdmin?: boolean;
}

const TonnageHub = ({ asAdmin = false }: TonnageHubProps) => {
  const { canViewAdmin } = useAuth();
  const isAdminView = asAdmin && canViewAdmin;

  const [tab, setTab] = useState<string>(isAdminView ? "dashboard" : "hoy");
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Viajes"
        title={isAdminView ? "Panel de viajes" : "Viajes del equipo"}
        description={
          isAdminView
            ? "Análisis, seguimiento por zona, tabla mensual y gestión de la flota."
            : "Consulta los viajes del día y el histórico. Registra los tuyos al final del día."
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        {isAdminView ? (
          <TabsList className="!grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="zonas" className="gap-2 py-2.5">
              <MapPin className="h-4 w-4" /> Por zona
            </TabsTrigger>
            <TabsTrigger value="mensual" className="gap-2 py-2.5">
              <Calendar className="h-4 w-4" /> Tabla mensual
            </TabsTrigger>
            <TabsTrigger value="camiones" className="gap-2 py-2.5">
              <Truck className="h-4 w-4" /> Camiones
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="!grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="hoy" className="gap-2 py-2.5">
              <ListChecks className="h-4 w-4" /> Viajes del día
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2 py-2.5">
              <History className="h-4 w-4" /> Historial
            </TabsTrigger>
            <TabsTrigger value="camiones" className="gap-2 py-2.5">
              <Truck className="h-4 w-4" /> Camiones
            </TabsTrigger>
          </TabsList>
        )}

        <Suspense fallback={<SubviewLoader />}>
          {!isAdminView && (
            <>
              <TabsContent value="hoy" className="mt-0">
                <TonnageMyTrips />
              </TabsContent>
              <TabsContent value="historial" className="mt-0">
                <TonnageHistory />
              </TabsContent>
              <TabsContent value="camiones" className="mt-0">
                <TonnageTrucksManager />
              </TabsContent>
            </>
          )}

          {isAdminView && (
            <>
              <TabsContent value="dashboard" className="mt-0">
                <TonnageDashboard />
              </TabsContent>
              <TabsContent value="zonas" className="mt-0">
                <TonnageZoneTracking />
              </TabsContent>
              <TabsContent value="mensual" className="mt-0">
                <TonnageMonthlyTable />
              </TabsContent>
              <TabsContent value="camiones" className="mt-0">
                <TonnageTrucksManager />
              </TabsContent>
            </>
          )}
        </Suspense>
      </Tabs>

      {/* FAB Nuevo viaje (solo trabajador) */}
      {!isAdminView && (
        <Button
          onClick={() => setQuickOpen(true)}
          size="lg"
          className="fixed bottom-20 right-4 z-40 h-14 rounded-full px-5 shadow-xl bg-success text-white hover:bg-success/90 md:bottom-6"
        >
          <Plus className="h-5 w-5" />
          Nuevo viaje
        </Button>
      )}

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar viaje</DialogTitle>
          </DialogHeader>
          <TonnageQuickTripDialog onClose={() => setQuickOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TonnageHub;
