export type SlotTodoItem = {
  id: string;
  text: string;
  done: boolean;
};

export function newTodoId(): string {
  return crypto.randomUUID();
}

/** Parse DB JSON: legacy string[], modern { id, text, done }[], or mixed. */
export function parseSlotTodosFromJson(raw: unknown): SlotTodoItem[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return [];
  const out: SlotTodoItem[] = [];
  for (const el of raw) {
    if (typeof el === "string") {
      const text = el.trim();
      if (text) out.push({ id: newTodoId(), text, done: false });
      continue;
    }
    if (el && typeof el === "object" && !Array.isArray(el)) {
      const o = el as Record<string, unknown>;
      const text = String(o.text ?? "").trim();
      if (!text) continue;
      const id = typeof o.id === "string" && o.id ? o.id : newTodoId();
      const done = Boolean(o.done);
      out.push({ id, text, done });
    }
  }
  return out;
}

export function slotTodosToDbJson(items: SlotTodoItem[]) {
  return items.map(({ id, text, done }) => ({ id, text, done }));
}

/** Match textarea lines to previous items by text (first unused) to preserve id/done when editing bulk text. */
export function mergeSlotTodosFromLines(prev: SlotTodoItem[], lines: string[]): SlotTodoItem[] {
  const unused = [...prev];
  const result: SlotTodoItem[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    const idx = unused.findIndex((p) => p.text === text);
    if (idx !== -1) {
      const [match] = unused.splice(idx, 1);
      result.push({ ...match, text });
    } else {
      result.push({ id: newTodoId(), text, done: false });
    }
  }
  return result;
}

export function linesFromSlotTodos(items: SlotTodoItem[]): string {
  return items.map((i) => i.text).join("\n");
}

export function slotTodoProgress(items: SlotTodoItem[]): { done: number; total: number } {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total };
}

/** e.g. "2/5" for schedule row suffix */
export function slotTodoProgressLabel(items: SlotTodoItem[]): string {
  const { done, total } = slotTodoProgress(items);
  if (total === 0) return "";
  return `${done}/${total}`;
}

/** Accept API body: string[] (all undone, new ids) or { id?, text, done? }[] */
export function normalizeTodosFromApiBody(raw: unknown): SlotTodoItem[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;
  if (raw.length === 0) return [];
  const first = raw[0];
  if (typeof first === "string") {
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
      .map((text) => ({ id: newTodoId(), text, done: false }));
  }
  const out: SlotTodoItem[] = [];
  for (const el of raw) {
    if (!el || typeof el !== "object" || Array.isArray(el)) continue;
    const o = el as Record<string, unknown>;
    const text = String(o.text ?? "").trim();
    if (!text) continue;
    const id = typeof o.id === "string" && o.id ? o.id : newTodoId();
    const done = Boolean(o.done);
    out.push({ id, text, done });
  }
  return out;
}

export function normalizeSlotTodosForWrite(
  todos: SlotTodoItem[] | string[] | undefined,
): SlotTodoItem[] {
  if (todos === undefined) return [];
  if (todos.length === 0) return [];
  if (typeof todos[0] === "string") {
    return (todos as string[])
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ id: newTodoId(), text, done: false }));
  }
  return (todos as SlotTodoItem[]).map((item) => ({
    id: item.id && item.id.trim() ? item.id : newTodoId(),
    text: item.text.trim(),
    done: Boolean(item.done),
  })).filter((i) => i.text);
}
