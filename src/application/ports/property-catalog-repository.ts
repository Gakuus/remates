/** Catálogos de referencia (PLAN §2, §11). */
export interface PropertyCatalogRepository {
  listTypes(): Promise<Array<{ code: string; name: string }>>;
  listStatuses(): Promise<Array<{ code: string; name: string }>>;
  /** Categorías de maquinaria (Sprint 8, PLAN §11 `machinery_categories`). */
  listMachineryCategories(): Promise<Array<{ code: string; name: string }>>;
}
