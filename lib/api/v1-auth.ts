import { NextResponse } from "next/server";
import { createBearerClient, parseBearerToken } from "@/lib/supabase/bearer-client";
import type { RunsheetDb } from "@/lib/supabase/db-client";
import type { User } from "@supabase/supabase-js";

export type V1AuthOk = { supabase: RunsheetDb; user: User };
export type V1AuthResult = V1AuthOk | { error: Response };

export async function requireV1Auth(request: Request): Promise<V1AuthResult> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return {
      error: NextResponse.json(
        {
          error: "unauthorized",
          message: "Send Authorization: Bearer <supabase_access_token>",
          hint: "Use the access_token from signInWithPassword or the session after OAuth; refresh before expiry.",
        },
        { status: 401 },
      ),
    };
  }
  const supabase = createBearerClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "invalid_token", message: error?.message ?? "User not found" },
        { status: 401 },
      ),
    };
  }
  return { supabase, user };
}
