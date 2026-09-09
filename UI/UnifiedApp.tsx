"use client";
import { usePathname } from "next/navigation";
import { AstroScoutApp } from "./AstroScoutApp";
import { EventDesk } from "./EventDesk";
export function UnifiedApp() {
  const path = usePathname();
  return path === "/places" || path === "/compare" ? (
    <AstroScoutApp />
  ) : (
    <EventDesk />
  );
}
