import type { Metadata } from "next";
import Link from "next/link";
import { InquiryForm } from "@/ui/features/property/inquiry-form";
import { IconArrowRight } from "@/ui/icons";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Consultá por un campo o publicá tu propiedad en el catálogo. Respondemos consultas en menos de 24 h hábiles.",
  alternates: { canonical: "/contacto" },
};

/** Contacto: consultas generales y publicación de campos (PLAN §8.7). */
export default function ContactPage() {
  return (
    <div className="bg-crema pt-24 md:pt-28">
      <div className="contenedor py-12 md:py-16">
        <p className="etiqueta">Contacto</p>
        <h1 className="text-titulo text-monte-950 mt-3">Consultas y publicaciones</h1>
        <p className="text-gris-calido-600 mt-4 max-w-xl leading-relaxed">
          Escribinos para conocer un campo del catálogo o para sumar tu propiedad. Respondemos
          dentro de las 24 h hábiles.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-mas border-arena bg-crema-50 border p-6 md:p-8">
            <InquiryForm
              subject={{ type: "property", id: null }}
              heading="Envianos tu consulta"
              intro="Contanos qué estás buscando o qué campo querés publicar."
              defaultMessage="Hola, quiero consultar por un campo del catálogo."
            />
          </div>

          <aside className="rounded-mas border-arena bg-beige-200 border p-6 lg:sticky lg:top-24 lg:h-fit">
            <p className="etiqueta">¿Sos dueño de un campo?</p>
            <h2 className="font-display text-monte-950 mt-2 text-xl">Publicá tu propiedad</h2>
            <p className="text-tinta-suave mt-3 text-sm leading-relaxed">
              Sumamos tu campo al catálogo con fotografías, ubicación y datos productivos para que
              lo vean compradores en todo el país.
            </p>
            <Link
              href="/publicar"
              className="border-monte/30 text-monte hover:bg-salvia-100 rounded-suave mt-5 inline-flex h-11 w-full items-center justify-center gap-2 border px-5 text-sm font-medium transition-colors"
            >
              Publicá tu campo
              <IconArrowRight size={16} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
