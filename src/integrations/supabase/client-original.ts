// Cliente apuntando al proyecto Supabase original del usuario.
// La anon/publishable key es pública por diseño, no es un secreto.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wepyjpvcaxzuzzzwtglo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-62-QZSmksV29ujd2QEzNQ_9jAxQ9Rd";

// Sin generic <Database> a propósito: el schema de tipos generado corresponde
// al proyecto de Lovable Cloud, no a este. Así evitamos los errores TS2769.
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export const SUPABASE_ORIGINAL_URL = SUPABASE_URL;
