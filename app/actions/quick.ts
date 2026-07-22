"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeDayStatus } from "@/lib/day-status";
import { parseSlotTodosFromJson, slotTodosToDbJson } from "@/lib/slot-todos";
import type { Database } from "@/lib/database.types";

type CheckRow = Database["public"]["Tables"]["checklist_items"]["Row"];

/**
 * Quick mutations for the client runsheet view.
 *
 * Deliberately no revalidatePath: the client already knows the new state and has
 * applied it optimistically. Revalidating would throw away the whole RSC payload and
 * re-run every Supabase query for the trip just to flip one checkbox — which is what
 * made the app feel like treacle. These return a boolean so the client can revert on
 * failure instead.
 */

export async function setDayStatusRemote(
  runsheetId: string,
  dayId: string,
  status: string,
): Promise<boolean> {
  if (!runsheetId || !dayId) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("runsheet_days")
    .update({ status: normalizeDayStatus(status) })
    .eq("id", dayId);
  return !error;
}

export type ToggleTodoPayload =
  | { runsheetId: string; kind: "checklist"; itemId: string; done?: boolean }
  | {
      runsheetId: string;
      kind: "slot";
      slotId: string;
      todoId: string;
      done?: boolean;
    };

export async function toggleTodoRemote(payload: ToggleTodoPayload): Promise<boolean> {
  const supabase = await createClient();
  const done = payload.done ?? false;

  if (payload.kind === "checklist") {
    if (!payload.itemId) return false;
    const { error } = await supabase
      .from("checklist_items")
      .update({ done })
      .eq("id", payload.itemId);
    return !error;
  }

  if (!payload.slotId || !payload.todoId) return false;
  const { data: row } = await supabase
    .from("slots")
    .select("todos")
    .eq("id", payload.slotId)
    .maybeSingle();
  if (!row) return false;

  const next = parseSlotTodosFromJson(row.todos).map((item) =>
    item.id === payload.todoId ? { ...item, done } : item,
  );

  const { error } = await supabase
    .from("slots")
    .update({ todos: slotTodosToDbJson(next), updated_at: new Date().toISOString() })
    .eq("id", payload.slotId);
  return !error;
}

export async function addChecklistRemote(
  runsheetId: string,
  dayId: string,
  label: string,
): Promise<CheckRow | null> {
  const trimmed = label.trim();
  if (!runsheetId || !dayId || !trimmed) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({ day_id: dayId, label: trimmed })
    .select("*")
    .maybeSingle();
  if (error) return null;
  return (data as CheckRow) ?? null;
}
