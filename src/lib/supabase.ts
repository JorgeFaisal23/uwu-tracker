import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el servidor.
 *
 * Usa la service-role key, que ignora Row Level Security: toda la autorización la hace
 * la aplicación en los route handlers a partir de la cookie de sesión. Por eso la clave
 * NO puede llevar el prefijo NEXT_PUBLIC_, que la incrustaría en el bundle del
 * navegador y daría acceso total a la base de datos a cualquiera que abra la página.
 *
 * El módulo es `server-only`: si algún componente de cliente lo importa por error, la
 * compilación falla en vez de filtrar la clave.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Copia .env.example a .env.local y rellénalos.'
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

/**
 * Lanza si la consulta falló. Centraliza el registro del error real en el servidor
 * para que los handlers no devuelvan detalles internos al navegador.
 */
export function unwrap<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string
): T {
  if (result.error) {
    console.error(`[supabase] ${context}:`, result.error);
    throw new Error(`Error de base de datos en ${context}`);
  }

  if (result.data === null) {
    throw new Error(`Sin datos en ${context}`);
  }

  return result.data;
}
