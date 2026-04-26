import { lazy, Suspense, useState } from "react";
import { BarChart3, Calendar, MapPin, Plus, Truck, ListChecks } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";

// Las cargo lazy: la subpestaña que el usuario abra al entrar es la única que se carga.
const TonnageRegisterTrip = lazy(() => import("@/components/tonnage/TonnageRegisterTrip"));
const TonnageMyTrips = lazy(() => import("@/components/tonnage/TonnageMyTrips"));
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
  /**
   * Si es true → muestra las pestañas de admin.
   * Si es false → muestra solo "Registrar viaje" + "Mis viajes".
   */
  asAdmin?: boolean;
}

const TonnageHub = ({ asAdmin = false }: TonnageHubProps) => {
  const { canViewAdmin } = useAuth();
  const isAdminView = asAdmin && canViewAdmin;

  // Pestaña inicial: el trabajador siempre arranca en "registrar"; el admin en "dashboard"
  const [tab, setTab] = useState<string>(isAdminView ? "dashboard" : "registrar");

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Viajes"
        title={isAdminView ? "Panel de viajes" : "Mis viajes"}
        description={
          isAdminView
            ? "Análisis, seguimiento por zona, tabla mensual y gestión de la flota."
            : "Registra los viajes del día y consulta tu actividad."
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
            <TabsTrigger value="registrar" className="gap-2 py-2.5">
              <Plus className="h-4 w-4" /> Registrar
            </TabsTrigger>
            <TabsTrigger value="mis-viajes" className="gap-2 py-2.5">
              <ListChecks className="h-4 w-4" /> Mis viajes
            </TabsTrigger>
            <TabsTrigger value="camiones" className="gap-2 py-2.5">
              <Truck className="h-4 w-4" /> Camiones
            </TabsTrigger>
          </TabsList>
        )}

        <Suspense fallback={<SubviewLoader />}>
          {/* Trabajador */}
          {!isAdminView && (
            <>
              <TabsContent value="registrar" className="mt-0">
                <TonnageRegisterTrip />
              </TabsContent>
              <TabsContent value="mis-viajes" className="mt-0">
                <TonnageMyTrips />
              </TabsContent>
              <TabsContent value="camiones" className="mt-0">
                <TonnageTrucksManager />
              </TabsContent>
            </>
          )}

          {/* Admin */}
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
    </div>
  );
};

export default TonnageHub;
