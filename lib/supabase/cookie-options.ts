type CookieOpts = {
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  domain?: string;
};

/** Merge Supabase cookie hints with defaults that work on HTTPS (Vercel). */
export function mergeSupabaseCookieOptions(options?: CookieOpts): CookieOpts {
  const isProd = process.env.NODE_ENV === "production";
  return {
    ...options,
    path: options?.path ?? "/",
    sameSite: (options?.sameSite ?? "lax") as CookieOpts["sameSite"],
    ...(isProd ? { secure: options?.secure ?? true } : {}),
  };
}
