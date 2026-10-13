import type { Pool, PoolClient } from "pg";

/**
 * Utilidades compartidas de los adaptadores Postgres (PLAN §2).
 * Solo SQL y agrupación de filas; jamás entidades.
 */

/** Ejecuta `fn` dentro de una transacción (rollback en error). */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Agrupa filas hijas (images/features/lots) por `parent_id`. */
export function groupByParent<T extends { parent_id: string }>(
  rows: T[],
): Map<string, Array<Omit<T, "parent_id">>> {
  const grouped = new Map<string, Array<Omit<T, "parent_id">>>();
  for (const row of rows) {
    const { parent_id: parentId, ...rest } = row;
    const bucket = grouped.get(parentId) ?? [];
    bucket.push(rest as Omit<T, "parent_id">);
    grouped.set(parentId, bucket);
  }
  return grouped;
}
