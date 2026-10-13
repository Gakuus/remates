import { describe, expect, it } from "vitest";
import { safePostgrestTerm } from "@/infrastructure/supabase/filters";

describe("safePostgrestTerm", () => {
  it("mantiene texto de búsqueda normal", () => {
    expect(safePostgrestTerm("campo en canelones")).toBe("campo en canelones");
  });

  it("neutraliza comas que inyectarían predicados extra", () => {
    // `name.eq.CampoPrivado` era una condición colada dentro del `.or()`.
    const term = safePostgrestTerm("x,name.eq.CampoPrivado");
    expect(term).not.toContain(",");
    expect(term).not.toContain(".");
  });

  it("neutraliza los caracteres reservados del DSL de PostgREST", () => {
    const term = safePostgrestTerm("a(b)c*d:e=f\"g'h;1|2");
    for (const reserved of ",.()*:=\"';|") {
      expect(term).not.toContain(reserved);
    }
  });

  it("neutraliza comodines de LIKE (% y _)", () => {
    expect(safePostgrestTerm("100%_real")).not.toMatch(/[%_]/);
  });
});
