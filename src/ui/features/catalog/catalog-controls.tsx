"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Chip } from "@/ui/components/chip";
import { Button } from "@/ui/components/button";
import { IconChevronDown, IconSearch, IconSliders, IconX } from "@/ui/icons";
import { buildActiveFilters } from "@/adapters/presentation/active-filters";

export interface FilterOption {
  value: string;
  label: string;
}

export interface CatalogToolbarData {
  departments: FilterOption[];
  types: FilterOption[];
  resultCount: number;
  sort: string;
}

const SORT_OPTIONS: FilterOption[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "hectareas_asc", label: "Superficie: menor a mayor" },
  { value: "hectareas_desc", label: "Superficie: mayor a menor" },
];

const ADVANCED_FEATURES: Array<{ code: string; label: string }> = [
  { code: "casa", label: "Casa" },
  { code: "galpon", label: "Galpón" },
  { code: "corrales", label: "Corrales" },
  { code: "agua", label: "Agua" },
  { code: "arroyo_rio", label: "Arroyo / río" },
  { code: "monte", label: "Monte" },
  { code: "alambrados", label: "Alambrados" },
  { code: "electricidad", label: "Electricidad" },
  { code: "acceso_ruta", label: "Acceso por ruta" },
];

/** Hook compartido: escribe filtros en la URL y deja que el servidor re-renderice. */
function useCatalogApply() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page");

      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  return { apply, clearAll, isPending, searchParams };
}

function readActive(searchParams: URLSearchParams) {
  return buildActiveFilters({
    q: searchParams.get("q") ?? "",
    depto: searchParams.get("depto") ?? "",
    localidad: searchParams.get("localidad") ?? "",
    tipo: searchParams.get("tipo") ?? "",
    precioMin: searchParams.get("precio_min") ?? "",
    precioMax: searchParams.get("precio_max") ?? "",
    haMin: searchParams.get("ha_min") ?? "",
    haMax: searchParams.get("ha_max") ?? "",
    features: Object.fromEntries([...searchParams.entries()].filter(([k]) => k.startsWith("f_"))),
  });
}

/**
 * Barra del catálogo: búsqueda, orden, contador, chips activos y apertura
 * de filtros en un modal (discreto, no empuja el contenido). PLAN §5, §7.
 */
export function CatalogToolbar({ data }: { data: CatalogToolbarData }) {
  const { apply, clearAll, isPending, searchParams } = useCatalogApply();
  const [showFilters, setShowFilters] = useState(false);
  const active = readActive(searchParams);

  useEffect(() => {
    if (!showFilters) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFilters(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showFilters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            apply({ q: typeof value === "string" ? value : "" });
          }}
        >
          <label htmlFor="catalog-search" className="sr-only">
            Buscar campos
          </label>
          <IconSearch
            size={17}
            className="text-gris-calido pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            id="catalog-search"
            name="q"
            type="search"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Buscar por nombre, departamento o localidad…"
            className="rounded-suave border-arena bg-crema-50 text-tinta placeholder:text-gris-calido-300 focus:border-oliva focus:ring-oliva/20 h-11 w-full border pr-3.5 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3">
          <label htmlFor="catalog-sort" className="sr-only">
            Ordenar
          </label>
          <div className="relative">
            <select
              id="catalog-sort"
              value={data.sort}
              onChange={(event) => apply({ orden: event.target.value })}
              className="rounded-suave border-arena bg-crema-50 text-tinta focus:border-oliva focus:ring-oliva/20 h-11 appearance-none border pr-9 pl-3.5 text-sm focus:ring-2 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={15}
              className="text-gris-calido pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>

          <Button
            variant="secondary"
            size="md"
            aria-expanded={showFilters}
            onClick={() => setShowFilters(true)}
          >
            <IconSliders size={16} />
            Filtros
            {active.length > 0 ? (
              <span className="bg-monte text-crema-50 tabular rounded-full px-2 py-0.5 text-xs">
                {active.length}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-tinta-suave text-sm">
            <span className="tabular text-monte-950 font-semibold">{data.resultCount}</span>{" "}
            {data.resultCount === 1 ? "campo encontrado" : "campos encontrados"}
            {isPending ? <span className="text-gris-calido ml-2">…</span> : null}
          </p>

          {active.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-oliva-600 text-sm underline-offset-2 hover:underline"
            >
              Limpiar todos
            </button>
          ) : null}
        </div>

        {active.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {active.map((filter) => (
              <li key={filter.key}>
                <Chip onRemove={() => apply({ [filter.param]: null })}>{filter.label}</Chip>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showFilters ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:items-center">
          <div
            className="bg-tinta/40 fixed inset-0"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros de catálogo"
            className="bg-crema-50 rounded-mas border-arena relative my-auto w-full max-w-lg border shadow-2xl"
          >
            <div className="border-arena flex items-center justify-between border-b px-5 py-3.5">
              <div>
                <p className="etiqueta">Filtros</p>
                <p className="text-tinta-suave text-sm">
                  {data.resultCount}{" "}
                  {data.resultCount === 1 ? "campo encontrado" : "campos encontrados"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar filtros"
                onClick={() => setShowFilters(false)}
                className="rounded-suave text-tinta-suave hover:bg-salvia-100 grid size-9 place-items-center"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-5">
              <FilterForm data={data} onDone={() => setShowFilters(false)} showResultCount={null} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CurrentFilters {
  depto: string;
  tipo: string;
  haMin: string;
  haMax: string;
  precioMin: string;
  precioMax: string;
  features: Set<string>;
}

function readCurrent(searchParams: URLSearchParams): CurrentFilters {
  return {
    depto: searchParams.get("depto") ?? "",
    tipo: searchParams.get("tipo") ?? "",
    haMin: searchParams.get("ha_min") ?? "",
    haMax: searchParams.get("ha_max") ?? "",
    precioMin: searchParams.get("precio_min") ?? "",
    precioMax: searchParams.get("precio_max") ?? "",
    features: new Set(
      [...searchParams.keys()].filter((k) => k.startsWith("f_")).map((k) => k.slice(2)),
    ),
  };
}

function FilterForm({
  data,
  onDone,
  showResultCount,
}: {
  data: CatalogToolbarData;
  onDone?: () => void;
  showResultCount: number | null;
}) {
  const { apply, searchParams } = useCatalogApply();
  const current = readCurrent(searchParams);
  const [advancedOpen, setAdvancedOpen] = useState(current.features.size > 0);

  return (
    <form
      className="rounded-mas border-arena bg-crema-50 space-y-4 border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        const updates: Record<string, string | null> = {
          depto: (form.get("depto") as string) || null,
          tipo: (form.get("tipo") as string) || null,
          ha_min: (form.get("ha_min") as string) || null,
          ha_max: (form.get("ha_max") as string) || null,
          precio_min: (form.get("precio_min") as string) || null,
          precio_max: (form.get("precio_max") as string) || null,
        };

        for (const feature of ADVANCED_FEATURES) {
          updates[`f_${feature.code}`] = form.has(`f_${feature.code}`) ? "true" : null;
        }

        apply(updates);
        onDone?.();
      }}
    >
      <p className="etiqueta">Filtros</p>

      <fieldset>
        <legend className="sr-only">Filtros principales</legend>
        <div className="grid gap-4">
          <SelectField
            name="depto"
            label="Departamento"
            value={current.depto}
            options={[{ value: "", label: "Todos" }, ...data.departments]}
          />
          <SelectField
            name="tipo"
            label="Tipo de campo"
            value={current.tipo}
            options={[{ value: "", label: "Todos" }, ...data.types]}
          />
          <RangeField
            name="ha_min"
            nameMax="ha_max"
            labelMin="Superficie desde (ha)"
            labelMax="Superficie hasta (ha)"
            valueMin={current.haMin}
            valueMax={current.haMax}
          />
          <RangeField
            name="precio_min"
            nameMax="precio_max"
            labelMin="Precio desde (USD)"
            labelMax="Precio hasta (USD)"
            valueMin={current.precioMin}
            valueMax={current.precioMax}
          />
        </div>
      </fieldset>

      <fieldset>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="text-oliva-600 hover:text-monte inline-flex items-center gap-1.5 text-sm font-medium"
        >
          Más filtros
          <IconChevronDown
            size={15}
            className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
          />
        </button>

        {advancedOpen ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ADVANCED_FEATURES.map((feature) => (
              <label
                key={feature.code}
                className="text-tinta-suave flex items-center gap-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  name={`f_${feature.code}`}
                  defaultChecked={current.features.has(feature.code)}
                  className="accent-oliva size-4"
                />
                {feature.label}
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {showResultCount !== null
            ? `Ver ${showResultCount} ${showResultCount === 1 ? "campo" : "campos"}`
            : "Aplicar filtros"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            apply({
              depto: null,
              tipo: null,
              ha_min: null,
              ha_max: null,
              precio_min: null,
              precio_max: null,
              ...Object.fromEntries(ADVANCED_FEATURES.map((f) => [`f_${f.code}`, null])),
            });
            onDone?.();
          }}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
}) {
  return (
    <div>
      <label
        htmlFor={`filter-${name}`}
        className="text-tinta-suave mb-1.5 block text-sm font-medium"
      >
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        className="rounded-suave border-arena bg-blanco-roto text-tinta focus:border-oliva focus:ring-oliva/20 h-11 w-full border px-3 text-sm focus:ring-2 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RangeField({
  name,
  nameMax,
  labelMin,
  labelMax,
  valueMin,
  valueMax,
}: {
  name: string;
  nameMax: string;
  labelMin: string;
  labelMax: string;
  valueMin: string;
  valueMax: string;
}) {
  const inputClass =
    "tabular h-11 w-full rounded-suave border border-arena bg-blanco-roto px-3 text-sm text-tinta placeholder:text-gris-calido-300 focus:border-oliva focus:outline-none focus:ring-2 focus:ring-oliva/20";

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label
          htmlFor={`filter-${name}`}
          className="text-tinta-suave mb-1.5 block text-sm font-medium"
        >
          {labelMin}
        </label>
        <input
          id={`filter-${name}`}
          name={name}
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={valueMin}
          placeholder="0"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`filter-${nameMax}`}
          className="text-tinta-suave mb-1.5 block text-sm font-medium"
        >
          {labelMax}
        </label>
        <input
          id={`filter-${nameMax}`}
          name={nameMax}
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={valueMax}
          placeholder="—"
          className={inputClass}
        />
      </div>
    </div>
  );
}
