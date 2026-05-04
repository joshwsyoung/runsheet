import { NextResponse } from "next/server";
import { requireV1Auth } from "@/lib/api/v1-auth";

export async function GET(request: Request) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  return NextResponse.json({
    id: auth.user.id,
    email: auth.user.email,
    app_metadata: auth.user.app_metadata,
    user_metadata: auth.user.user_metadata,
  });
}
