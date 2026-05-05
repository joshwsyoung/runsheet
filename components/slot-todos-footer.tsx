import { toggleSlotTodoItem } from "@/app/actions/slots";
import { slotTodoProgressLabel, type SlotTodoItem } from "@/lib/slot-todos";

/** Compact checklist block for runsheet list cards — sits outside the card link to avoid navigation conflicts. */
export function SlotTodosFooter({
  runsheetId,
  slotId,
  items,
  maxVisible = 5,
}: {
  runsheetId: string;
  slotId: string;
  items: SlotTodoItem[];
  maxVisible?: number;
}) {
  if (!items.length) return null;
  const show = items.slice(0, maxVisible);
  const summary = slotTodoProgressLabel(items);

  return (
    <div className="no-print border-t border-rs-border bg-rs-muted-surface/30 px-3 py-2">
      <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-rs-label">
        To-dos {summary ? <span className="tabular-nums text-rs-muted">({summary})</span> : null}
      </p>
      <ul className="space-y-1">
        {show.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-[0.78rem] leading-snug">
            <form action={toggleSlotTodoItem} className="inline shrink-0">
              <input type="hidden" name="runsheet_id" value={runsheetId} />
              <input type="hidden" name="slot_id" value={slotId} />
              <input type="hidden" name="todo_id" value={item.id} />
              <input type="hidden" name="done" value={item.done ? "false" : "true"} />
              <button
                type="submit"
                className="font-[inherit] leading-none text-rs-muted"
                aria-label={item.done ? "Mark not done" : "Mark done"}
              >
                {item.done ? "☑" : "☐"}
              </button>
            </form>
            <span className={item.done ? "text-rs-label line-through" : "text-rs-secondary"}>{item.text}</span>
          </li>
        ))}
      </ul>
      {items.length > maxVisible ? (
        <p className="mt-1.5 text-[0.62rem] text-rs-label">Open activity for full list</p>
      ) : null}
    </div>
  );
}
