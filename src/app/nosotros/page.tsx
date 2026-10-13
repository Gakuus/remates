import type { Metadata } from "next";
import { Section } from "@/ui/components/section";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Marca especializada en campos y terrenos rurales a la venta en Uruguay: criterio editorial, datos verificados y acompañamiento de principio a fin.",
  alternates: { canonical: "/nosotros" },
};

export default function AboutPage() {
  return (
    <Section className="pt-28 md:pt-36">
      <p className="etiqueta">Nosotros</p>
      <h1 className="text-titulo mt-3">Una marca especializada en campos uruguayos</h1>
      <p className="text-gris-calido-600 mt-4 max-w-xl">
        Presentación de la empresa: contenido definitivo pendiente de definición.
      </p>
    </Section>
  );
}
