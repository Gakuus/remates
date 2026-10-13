import { Pool } from "pg";
import { envServer } from "@/infrastructure/config/env";

/**
 * Pool de Postgres (PLAN §2, modo local).
 * Se crea de forma perezosa en la primera consulta, para que importar el
 * módulo (build estático, tests) nunca abra una conexión real.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!envServer.DATABASE_URL) {
      throw new Error("DATABASE_URL no está configurado. Revisá .env");
    }
    pool = new Pool({
      connectionString: envServer.DATABASE_URL,
      max: 10,
    });
  }
  return pool;
}

/** Cierra el pool (utilizado en apagados/verificaciones de servicio). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
