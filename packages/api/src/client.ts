/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in this app's .env file."
  );
}

// Untyped on purpose: see @createwithskai/types for the row shapes to cast
// query results against at the call site (`data as SomeRowType`).
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
