import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/ui/icons";

export const metadata: Metadata = {
  title: "Publicá tu campo",
  description:
    "Sumá tu propiedad al catálogo de campos rurales a la venta en Uruguay: fotografías, ubicación y datos productivos.",
  alternates: { canonical: "/publicar" },
};

const STEPS = [
  {
    title: "Escribinos",
    text: "Contanos dónde está el campo, cuántas hectáreas tiene y cómo es el terreno.",
  },
  {
    title: "Armamos la ficha",
    text: "Visitamos la propiedad, tomamos fotos y preparamos la publicación completa.",
  },
  {
    title: "Publicamos",
    text: "Tu campo queda en el catálogo, filtrable por departamento, superficie y tipo.",
  },
];

/** Publicación de campos: flujo asistido en el MVP (Sprint 5). */
export default function PublishPage() {
  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor py-12 md:py-16">
        <p className="etiqueta">Publicá tu campo</p>
        <h1 className="text-titulo text-monte-950 mt-3 max-w-2xl">Sumá tu propiedad al catálogo</h1>
        <p className="text-gris-calido-600 mt-4 max-w-xl leading-relaxed">
          Publicamos campos rurales seleccionados de todo el Uruguay. El proceso es asistido: vos
          contás el campo, nosotros preparamos la ficha completa.
        </p>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-mas border-arena bg-crema-50 border p-6">
              <span className="font-display text-oliva tabular text-2xl">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="font-display text-monte-950 mt-2 text-xl">{step.title}</h2>
              <p className="text-tinta-suave mt-2 text-sm leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-mas border-arena bg-beige-200 mt-10 border p-6 md:p-8">
          <h2 className="font-display text-monte-950 text-xl">Qué necesitamos saber</h2>
          <ul className="text-tinta-suave mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              "Departamento y localidad",
              "Superficie en hectáreas",
              "Tipo de uso (agrícola, ganadero o mixto)",
              "Acceso, agua y mejoras existentes",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <IconCheck size={18} className="text-oliva mt-0.5 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/contacto"
            className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 mt-6 inline-flex h-12 items-center justify-center gap-2 px-6 text-sm font-semibold transition-colors"
          >
            Consultar por publicar mi campo
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
