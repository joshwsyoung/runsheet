"use server";

import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clampYmdToRange } from "@/lib/dates";

function parseIsoDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const dt = DateTime.fromISO(s, { zone: "utc" }).startOf("day");
  return dt.isValid ? s : null;
}

export async function createRunsheet(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";
  const startDate = parseIsoDate(formData.get("start_date"));
  const endDate = parseIsoDate(formData.get("end_date"));
  if (!title) {
    redirect("/dashboard?error=missing-title");
  }
  if (!startDate || !endDate) {
    redirect("/dashboard?error=missing-dates");
  }
  if (startDate > endDate) {
    redirect("/dashboard?error=invalid-dates");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: rpcId, error: rpcError } = await supabase.rpc("create_runsheet", {
    p_title: title,
    p_timezone: timezone,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  let runsheetId: string | null =
    typeof rpcId === "string" && rpcId.length > 0 ? rpcId : null;

  if (!runsheetId) {
    const { data: inserted, error: insertError } = await supabase
      .from("runsheets")
      .insert({
        title,
        owner_id: user.id,
        timezone,
        start_date: startDate,
        end_date: endDate,
      })
      .select("id");
    runsheetId = inserted?.[0]?.id ?? null;

    if (insertError || !runsheetId) {
      console.error("[createRunsheet] rpc", {
        message: rpcError?.message,
        code: rpcError?.code,
        details: rpcError?.details,
      });
      console.error("[createRunsheet] insert", {
        message: insertError?.message,
        code: insertError?.code,
        details: insertError?.details,
        hint: insertError?.hint,
      });
      redirect("/dashboard?error=create-failed");
    }
  }

  revalidatePath("/dashboard");
  redirect(`/runsheet/${runsheetId}`);
}

export async function archiveRunsheet(formData: FormData) {
  const runsheetId = String(formData.get("id") ?? "");
  if (!runsheetId) return;
  const supabase = await createClient();
  await supabase
    .from("runsheets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", runsheetId);
  revalidatePath("/dashboard");
}

export async function updateRunsheetTitle(runsheetId: string, title: string) {
  const supabase = await createClient();
  await supabase.from("runsheets").update({ title }).eq("id", runsheetId);
  revalidatePath(`/runsheet/${runsheetId}`);
}

function settingsTripErrorSuffix(runsheetId: string, code: string) {
  return `/runsheet/${runsheetId}/settings?error=${encodeURIComponent(code)}`;
}

export async function updateRunsheetBasics(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";
  if (!runsheetId || !title) {
    if (runsheetId) redirect(settingsTripErrorSuffix(runsheetId, "missing-title"));
    redirect("/dashboard?error=missing-title");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("runsheets").update({ title, timezone }).eq("id", runsheetId);
  if (error) {
    redirect(settingsTripErrorSuffix(runsheetId, "save-failed"));
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/settings`);
  redirect(`/runsheet/${runsheetId}/settings`);
}

export async function updateRunsheetTripDates(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const settingsReturn = returnTo === "settings";
  const startDate = parseIsoDate(formData.get("start_date"));
  const endDate = parseIsoDate(formData.get("end_date"));
  if (!runsheetId || !startDate || !endDate) {
    if (runsheetId) {
      redirect(
        settingsReturn
          ? settingsTripErrorSuffix(runsheetId, "missing-trip-dates")
          : `/runsheet/${runsheetId}?error=missing-trip-dates`,
      );
    }
    redirect("/dashboard?error=missing-dates");
  }
  if (startDate > endDate) {
    redirect(
      settingsReturn
        ? settingsTripErrorSuffix(runsheetId, "invalid-trip-dates")
        : `/runsheet/${runsheetId}?error=invalid-trip-dates`,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("runsheets")
    .update({ start_date: startDate, end_date: endDate })
    .eq("id", runsheetId);
  if (error) {
    redirect(
      settingsReturn
        ? settingsTripErrorSuffix(runsheetId, "trip-update-failed")
        : `/runsheet/${runsheetId}?error=trip-update-failed`,
    );
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/settings`);

  if (settingsReturn) {
    redirect(`/runsheet/${runsheetId}/settings`);
  }

  const returnRaw = parseIsoDate(formData.get("return_day")) ?? startDate;
  const carouselMin =
    DateTime.fromISO(startDate, { zone: "utc" }).minus({ days: 1 }).toISODate() ?? startDate;
  const carouselMax =
    DateTime.fromISO(endDate, { zone: "utc" }).plus({ days: 1 }).toISODate() ?? endDate;
  const day = clampYmdToRange(returnRaw, carouselMin, carouselMax, "utc");
  redirect(`/runsheet/${runsheetId}?day=${encodeURIComponent(day)}`);
}
