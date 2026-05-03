import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchOgPreview } from "@/lib/og-fetch";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: slot, error: slotErr } = await supabase
    .from("slots")
    .select("id, day_id, link_url")
    .eq("id", slotId)
    .maybeSingle();

  if (slotErr || !slot?.link_url) {
    return NextResponse.json({ ok: false, error: "no_link" }, { status: 400 });
  }

  const preview = await fetchOgPreview(slot.link_url);
  await supabase
    .from("slots")
    .update({
      preview_title: preview.title,
      preview_description: preview.description,
      preview_image_url: preview.imageUrl,
      preview_fetched_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  return NextResponse.json({ ok: true, preview });
}
