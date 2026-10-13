import { describe, expect, it } from "vitest";

import { parseCreatePayload, parseLots } from "@/infrastructure/admin/content";

describe("parseCreatePayload :: campos", () => {
  it("acepta un campo válido", () => {
    const result = parseCreatePayload({
      kind: "campos",
      name: "Campo La Esperanza",
      department: "Salto",
      locality: "Puntas de Valentín",
      type: "ganadero",
      hectares: "120.5",
      price: "150000",
      description: "Campo arbolado.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toMatchObject({
      kind: "campos",
      name: "Campo La Esperanza",
      hectares: 120.5,
      price: 150000,
    });
  });

  it("rechaza departamento y tipo inválidos", () => {
    const departamento = parseCreatePayload({
      kind: "campos",
      name: "X",
      department: "Buenos Aires",
      type: "ganadero",
      hectares: 10,
    });
    expect(departamento.ok).toBe(false);

    const tipo = parseCreatePayload({
      kind: "campos",
      name: "X",
      department: "Salto",
      type: "urbano",
      hectares: 10,
    });
    expect(tipo.ok).toBe(false);
  });

  it("rechaza superficie inválida", () => {
    const result = parseCreatePayload({
      kind: "campos",
      name: "X",
      department: "Salto",
      type: "ganadero",
      hectares: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseCreatePayload :: remates", () => {
  it("acepta un remate con lotes y asigna estado por defecto", () => {
    const result = parseCreatePayload({
      kind: "remates",
      title: "Remate de invierno",
      scheduledAt: "2026-11-20T10:30",
      location: "Estancia San Pedro, Salto",
      auctioneer: "Remates del Litoral",
      minimumBid: "5000",
      lots: "1 | Lote 1 – 50 vaquillonas\n2 | Lote 2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toMatchObject({
      kind: "remates",
      eventStatus: "proximo",
      minimumBid: 5000,
      lots: [
        { lotNumber: 1, title: "Lote 1 – 50 vaquillonas" },
        { lotNumber: 2, title: "Lote 2" },
      ],
    });
  });

  it("rechaza fechas inválidas", () => {
    const result = parseCreatePayload({
      kind: "remates",
      title: "Remate",
      scheduledAt: "no-es-una-fecha",
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseCreatePayload :: maquinaria", () => {
  it("acepta un aviso válido con campos opcionales", () => {
    const result = parseCreatePayload({
      kind: "maquinaria",
      title: "Tractor Massey 275",
      category: "tractor",
      brand: "Massey Ferguson",
      model: "275",
      year: "1978",
      hoursUsed: "4200",
      price: "18000",
      department: "Durazno",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toMatchObject({
      kind: "maquinaria",
      category: "tractor",
      year: 1978,
      price: 18000,
    });
  });

  it("rechaza categoría inexistente", () => {
    const result = parseCreatePayload({
      kind: "maquinaria",
      title: "Tractor",
      category: "moto",
      department: "Salto",
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseLots", () => {
  it("ignora líneas en blanco y mal formadas", () => {
    expect(parseLots("1 | Uno\n\nabc\n3 | Tres")).toEqual([
      { lotNumber: 1, title: "Uno" },
      { lotNumber: 3, title: "Tres" },
    ]);
  });

  it("devuelve undefined sin contenido", () => {
    expect(parseLots("")).toBeUndefined();
    expect(parseLots("   ")).toBeUndefined();
    expect(parseLots(undefined)).toBeUndefined();
  });
});
