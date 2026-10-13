import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envPublic, envServer } from "@/infrastructure/config/env";

/**
 * Cliente Supabase de SOLO servidor (adaptador de persistencia).
 * Usa la `anon key` para lecturas públicas; la `service_role` queda
 * disponible para escrituras administrativas (jamás sale del servidor).
 *
 * docs/PLAN.md §12 y §15.
 */
function assertConfigured(): { url: string; anonKey: string } {
  const url = envPublic.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase no está configurado: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env",
    );
  }
  return { url, anonKey };
}

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Cliente con `anon key` + RLS. Lectura pública. */
export function getSupabasePublicClient(): SupabaseClient {
  if (publicClient) return publicClient;
  const { url, anonKey } = assertConfigured();
  publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

/**
 * Cliente con `service_role` (bypasa RLS). SOLO para escrituras del
 * servidor. Nunca importar desde componentes de cliente.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  // assertConfigured valida que URL y anon key existan (config del proyecto).
  const { url } = assertConfigured();
  const serviceKey = envServer.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está definida: se requiere para escrituras administrativas.",
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
