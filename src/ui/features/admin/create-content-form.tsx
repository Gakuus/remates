"use client";

import { useActionState } from "react";

import type { ContentKind } from "@/application/dtos/admin-content";
import { createContent, type AdminActionState } from "@/platform/admin-actions";
import { MACHINERY_CATEGORY_LABELS } from "@/domain/enums/machinery-category";
import { PROPERTY_TYPE_LABELS } from "@/domain/enums/property-type";
import { URUGUAY_DEPARTMENTS } from "@/domain/enums/department";
import { Button } from "@/ui/components/button";
import { Input, Select, Textarea } from "@/ui/components/field";
import { IconCheck } from "@/ui/icons";

interface CreateContentFormProps {
  kind: ContentKind;
}

const KIND_HEADINGS: Record<ContentKind, { title: string; cta: string }> = {
  campos: { title: "Nuevo campo", cta: "Crear campo" },
  remates: { title: "Nuevo remate", cta: "Crear remate" },
  maquinaria: { title: "Nuevo aviso de maquinaria", cta: "Crear aviso" },
};

const INITIAL_STATE: AdminActionState = { ok: false };

/**
 * Formulario de alta del panel (PLAN Sprint 10). Guarda vía server action para
 * que el estado (memoria o BD) quede consistente con las páginas que listan.
 */
export function CreateContentForm({ kind }: CreateContentFormProps) {
  const [state, formAction, pending] = useActionState(createContent, INITIAL_STATE);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-monte-950 text-lg">{KIND_HEADINGS[kind].title}</h2>

      {state.ok ? (
        <div className="rounded-mas border-monte/30 bg-salvia-100 border p-4" role="status">
          <p className="text-monte flex items-center gap-2 text-sm font-medium">
            <IconCheck size={16} aria-hidden="true" />
            {state.message ?? "Aviso creado."}
          </p>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="kind" value={kind} />

        {kind === "campos" ? (
          <>
            <Input label="Nombre" name="name" required placeholder="Ej: Campo San José 200 ha" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Departamento" name="department" required>
                {URUGUAY_DEPARTMENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select label="Tipo" name="type" required>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Localidad" name="locality" />
              <Input
                label="Superficie (ha)"
                name="hectares"
                type="number"
                step="0.1"
                min="0"
                required
              />
            </div>
            <Input label="Precio (USD)" name="price" type="number" step="0.01" min="0" />
            <Textarea label="Descripción" name="description" rows={4} />
          </>
        ) : null}

        {kind === "remates" ? (
          <>
            <Input
              label="Título"
              name="title"
              required
              placeholder="Ej: Remate ganadero otoño 2026"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Fecha y hora" name="scheduledAt" type="datetime-local" required />
              <Select label="Estado del evento" name="eventStatus">
                <option value="proximo">Próximo</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Lugar" name="location" placeholder="Ej: Estancia La Aurora, Salto" />
              <Input label="Rematador" name="auctioneer" placeholder="Ej: Remates del Oeste" />
            </div>
            <Input label="Base mínima (USD)" name="minimumBid" type="number" step="0.01" min="0" />
            <Textarea
              label="Lotes (una por línea: Número | Título)"
              name="lots"
              hint="Línea vacía = lote sin mínimo. Las bases aún no se cargan acá."
              rows={4}
              placeholder={"1 | Lote 1 – 40 vaquillonas\n2 | Lote 2 – 25 novillos"}
            />
            <Textarea label="Descripción" name="description" rows={4} />
          </>
        ) : null}

        {kind === "maquinaria" ? (
          <>
            <Input
              label="Título"
              name="title"
              required
              placeholder="Ej: Tractor Massey Ferguson 275"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Categoría" name="category" required>
                {Object.entries(MACHINERY_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select label="Departamento" name="department" required>
                {URUGUAY_DEPARTMENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Marca" name="brand" />
              <Input label="Modelo" name="model" />
              <Input label="Localidad" name="locality" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Año"
                name="year"
                type="number"
                min="1950"
                max={new Date().getFullYear() + 1}
              />
              <Input label="Horas de uso" name="hoursUsed" type="number" min="0" />
              <Input label="Precio (USD)" name="price" type="number" step="0.01" min="0" />
            </div>
            <Textarea label="Descripción" name="description" rows={4} />
          </>
        ) : null}

        {state.ok === false && state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : KIND_HEADINGS[kind].cta}
        </Button>
      </form>
    </div>
  );
}
