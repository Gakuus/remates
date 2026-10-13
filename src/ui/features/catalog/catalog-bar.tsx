"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { IconChevronDown, IconSearch } from "@/ui/icons";

export interface CatalogField {
  /** Nombre del parámetro de URL. */
  key: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface CatalogBarProps {
  fields: CatalogField[];
  countLabel: string;
  clearHref?: string;
}

/**
 * Barra de filtros simple de catálogo (remates/maquinaria): aplica cada
 * cambio en la URL (server-side) como el catálogo de campos existente.
 */
export function CatalogBar({ fields, countLabel, clearHref }: CatalogBarProps) {
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

  const active = [...searchParams.keys()].filter((k) => k !== "page").length;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {fields.map((field) =>
          field.options ? (
            <label key={field.key} className="relative">
              <span className="sr-only">{field.label}</span>
              <select
                value={searchParams.get(field.key) ?? ""}
                onChange={(event) => apply({ [field.key]: event.target.value })}
                className="rounded-suave border-arena bg-crema-50 text-tinta focus:border-oliva focus:ring-oliva/20 h-11 appearance-none border pr-9 pl-3.5 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="">{field.label}</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <IconChevronDown
                size={15}
                className="text-gris-calido pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </label>
          ) : (
            <form
              key={field.key}
              className="relative"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get(field.key);
                apply({ [field.key]: typeof value === "string" ? value : "" });
              }}
            >
              <label htmlFor={`catalog-${field.key}`} className="sr-only">
                {field.label}
              </label>
              <IconSearch
                size={16}
                className="text-gris-calido pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
              />
              <input
                id={`catalog-${field.key}`}
                name={field.key}
                type="search"
                defaultValue={searchParams.get(field.key) ?? ""}
                placeholder={field.placeholder ?? field.label}
                className="rounded-suave border-arena bg-crema-50 text-tinta placeholder:text-gris-calido-300 focus:border-oliva focus:ring-oliva/20 h-11 w-full border pr-3.5 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
            </form>
          ),
        )}

        {active > 0 ? (
          <a
            href={clearHref ?? pathname}
            className="text-oliva-600 text-sm underline-offset-2 hover:underline"
          >
            Limpiar filtros
          </a>
        ) : null}
      </div>

      <p aria-live="polite" className="text-tinta-suave text-sm lg:text-right">
        <span className="tabular text-monte-950 font-semibold">{countLabel}</span>
        {isPending ? <span className="text-gris-calido ml-2">…</span> : null}
      </p>
    </div>
  );
}
