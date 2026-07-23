"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ViewTab = "list" | "schedule";

/**
 * Lets the sticky header drive the runsheet's List/Schedule view.
 *
 * The runsheet view owns the actual tab state (so its server render stays correct) and
 * *registers* a controller here on mount; the header reads that controller to render the
 * toggle and dispatch changes. When the runsheet view is not on screen, no controller is
 * registered and the header shows no toggle.
 */
type Controller = { tab: ViewTab; setTab: (t: ViewTab) => void };

type ViewToggleValue = {
  controller: Controller | null;
  setController: (c: Controller | null) => void;
};

const ViewToggleContext = createContext<ViewToggleValue | null>(null);

export function ViewToggleProvider({ children }: { children: ReactNode }) {
  const [controller, setController] = useState<Controller | null>(null);
  return (
    <ViewToggleContext.Provider value={{ controller, setController }}>
      {children}
    </ViewToggleContext.Provider>
  );
}

export function useViewToggle() {
  return useContext(ViewToggleContext);
}
