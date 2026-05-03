/** URL + anon key used by server and browser clients. */
export function getSupabasePublishableEnv(): {
  url: string;
  anonKey: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    typeof url !== "string" ||
    typeof anonKey !== "string" ||
    url.trim() === "" ||
    anonKey.trim() === ""
  ) {
    throw new Error(
      "Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }
  return { url, anonKey };
}
