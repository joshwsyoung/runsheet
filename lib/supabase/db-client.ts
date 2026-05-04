import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type RunsheetDb = SupabaseClient<Database>;
