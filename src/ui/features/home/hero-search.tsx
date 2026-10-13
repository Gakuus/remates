"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/components/button";
import { IconChevronDown, IconSearch } from "@/ui/icons";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { PROPERTY_TYPE_CODES, PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";

const QUICK_LINKS = [
  { label: "Agrícola", params: "tipo=agricola" },
  { label: "Ganadero", params: "tipo=ganadero" },
  { label: "Mixto", params: "tipo=mixto" },
  { label: "+100 ha", params: "ha_min=100" },
  { label: "+500 ha", params: "ha_min=500" },
];

/**
 * Buscador principal del hero (PLAN §4): departamento, localidad,
 * tipo de campo y superficie → navega al catálogo con filtros aplicados.
 */
export function HeroSearch() {
  const router = useRouter();
  const [department, setDepartment] = useState("");

  const localities = LOCALITIES_BY_DEPARTMENT[department] ?? [];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const depto = form.get("depto") as string;
    const localidad = form.get("localidad") as string;
    const tipo = form.get("tipo") as string;
    const haMin = form.get("ha_min") as string;

    if (depto) params.set("depto", depto);
    if (localidad) params.set("localidad", localidad);
    if (tipo) params.set("tipo", tipo);
    if (haMin) params.set("ha_min", haMin);

    const query = params.toString();
    router.push(query ? `/campos?${query}` : "/campos");
  }

  const selectClass =
    "h-12 w-full appearance-none rounded-suave border border-arena bg-blanco-roto px-3.5 pr-8 text-sm text-tinta focus:border-oliva focus:outline-none focus:ring-2 focus:ring-oliva/20";

  return (
    <div className="mt-8">
      <form
        onSubmit={submit}
        className="rounded-mas border-crema-50/15 bg-crema-50/95 shadow-tarjeta border p-4 backdrop-blur-sm md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <label htmlFor="hero-depto" className="sr-only">
              Departamento
            </label>
            <select
              id="hero-depto"
              name="depto"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={selectClass}
            >
              <option value="">Departamento</option>
              {URUGUAY_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={15}
              className="text-gris-calido pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>

          <div className="relative">
            <label htmlFor="hero-localidad" className="sr-only">
              Localidad
            </label>
            <select
              id="hero-localidad"
              name="localidad"
              disabled={localities.length === 0}
              className={`${selectClass} disabled:opacity-60`}
            >
              <option value="">{localities.length === 0 ? "Localidad" : "Todas"}</option>
              {localities.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={15}
              className="text-gris-calido pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>

          <div className="relative">
            <label htmlFor="hero-tipo" className="sr-only">
              Tipo de campo
            </label>
            <select id="hero-tipo" name="tipo" className={selectClass}>
              <option value="">Tipo de campo</option>
              {PROPERTY_TYPE_CODES.map((code) => (
                <option key={code} value={code}>
                  {PROPERTY_TYPE_LABELS[code]}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={15}
              className="text-gris-calido pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>

          <div className="relative">
            <label htmlFor="hero-ha" className="sr-only">
              Superficie desde (hectáreas)
            </label>
            <input
              id="hero-ha"
              name="ha_min"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Superficie (ha)"
              className="tabular rounded-suave border-arena bg-blanco-roto text-tinta placeholder:text-gris-calido-300 focus:border-oliva focus:ring-oliva/20 h-12 w-full border px-3.5 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="mt-3 w-full md:mt-4">
          <IconSearch size={17} />
          Buscar campos
        </Button>
      </form>

      <ul className="mt-4 flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <li key={link.label}>
            <button
              type="button"
              onClick={() => router.push(`/campos?${link.params}`)}
              className="border-crema-50/30 text-crema-50/90 hover:border-crema-50/70 hover:bg-crema-50/10 rounded-full border px-4 py-1.5 text-sm transition-colors"
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Localidades por departamento (catálogo MVP).
 * Se amplía a medida que se cargan propiedades.
 */
const LOCALITIES_BY_DEPARTMENT: Record<string, string[]> = {
  Canelones: ["Canelones", "Florida", "Pando", "Saavedra", "Solís"],
  Colonia: ["Colonia del Sacramento", "Carmelo", "Nueva Palmira", "Juan Lacaze"],
  Maldonado: ["Maldonado", "Punta del Este", "Piriápolis", "San Carlos"],
  Paysandú: ["Paysandú", "Belén", "Guichón", "Tacuarembó"],
  Salto: ["Salto", "Belgrano", "Constitución", "Villa Ernestina"],
  Soriano: ["Mercedes", "Dolores", "Cardonal", "Palmar"],
  Tacuarembó: ["Tacuarembó", "Achara", "Lavalleja", "Paso de los Toros"],
  "Treinta y Tres": ["Treinta y Tres", "Villa Sara", "Gerardo", "Santa Clara"],
  Rocha: ["Rocha", "Chuy", "La Paloma", "Santa Teresa"],
  Durazno: ["Durazno", "Olmos", "Sarandí del Yi", "Carbonera"],
  Florida: ["Florida", "Sarandí Grande", "Casupá"],
  "Río Negro": ["Young", "Fray Bentos", "Nuevo Berlín", "San Javier"],
  "Cerro Largo": ["Melo", "Río Branco", "Villa Serenís"],
  Rivera: ["Rivera", "Artigas da Silva", "Livramento"],
  Artigas: ["Artigas", "Bella Unión", "Tomé Omar"],
  Lavalleja: ["Minas", "Pilla", "Solís de Mataojo"],
  Flores: ["Trinidad", "Alejandro Gallinal"],
  "San José": ["San José de Mayo", "Libertad", "Ciudad del Plata"],
  Montevideo: ["Montevideo"],
};
