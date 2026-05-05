"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Pref = "light" | "dark" | "system";

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function select(next: Pref) {
    setTheme(next);
  }

  const chip = "rounded-xl border px-3 py-2 text-xs font-bold transition";
  const active = "border-rs-primary bg-rs-primary text-white shadow-[0_2px_8px_rgba(74,144,226,0.25)]";
  const inactive = "border-rs-border bg-rs-muted-surface text-rs-secondary hover:border-rs-muted";

  if (!mounted) {
    return (
      <div className="flex gap-2" aria-busy aria-label="Appearance">
        {[1, 2, 3].map((k) => (
          <span key={k} className={`${chip} min-w-[4.75rem] border-rs-border bg-rs-muted-surface text-transparent`}>
            –
          </span>
        ))}
      </div>
    );
  }

  const currentShow = theme === "system" ? `System (${resolvedTheme})` : theme === "dark" ? "Dark" : "Light";

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Appearance — current: {currentShow}</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
        <button
          type="button"
          onClick={() => select("light")}
          className={`${chip} ${theme === "light" ? active : inactive}`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => select("dark")}
          className={`${chip} ${theme === "dark" ? active : inactive}`}
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => select("system")}
          className={`${chip} ${theme === "system" ? active : inactive}`}
        >
          System
        </button>
      </div>
      <p className="text-[0.72rem] leading-relaxed text-rs-muted">
        System follows your device. This choice stays on your browser only — it is not stored in your trips.
      </p>
    </fieldset>
  );
}
