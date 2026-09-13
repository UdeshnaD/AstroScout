"use client";

import { usePathname } from "next/navigation";
import { UnifiedApp } from "./UnifiedApp";

export function ObservingRouteShell({ children }: { children: React.ReactNode }) {
  return usePathname() === "/observe" ? <>{children}</> : <><UnifiedApp />{children}</>;
}
