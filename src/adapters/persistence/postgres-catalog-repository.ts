import type { PropertyCatalogRepository } from "@/application/ports/property-catalog-repository";
import { getPool } from "@/infrastructure/postgres/client";

/** Catálogos de referencia leídos desde Postgres (PLAN §2). */
export class PostgresCatalogRepository implements PropertyCatalogRepository {
  async listTypes(): Promise<Array<{ code: string; name: string }>> {
    const { rows } = await getPool().query<{ code: string; name: string }>(
      "select code, name from property_types order by id",
    );
    return rows;
  }

  async listStatuses(): Promise<Array<{ code: string; name: string }>> {
    const { rows } = await getPool().query<{ code: string; name: string }>(
      "select code, name from property_statuses order by id",
    );
    return rows;
  }

  async listMachineryCategories(): Promise<Array<{ code: string; name: string }>> {
    const { rows } = await getPool().query<{ code: string; name: string }>(
      "select code, name from machinery_categories order by id",
    );
    return rows;
  }
}
