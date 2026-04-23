import { ReceiptText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

const AdminAlbaranesView = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Administración"
        title="Albaranes"
        description="Módulo reservado dentro del esqueleto general para preparar la gestión documental sin mezclarlo todavía con otros flujos."
      />
      <section className="panel-surface p-6">
        <EmptyState
          icon={ReceiptText}
          title="Sección preparada"
          description="El módulo de albaranes ya queda integrado en la arquitectura general y listo para empezar a rellenarlo cuando toque."
        />
      </section>
    </div>
  );
};

export default AdminAlbaranesView;
