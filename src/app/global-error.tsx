"use client";

import ErrorScreen from "./error";
import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="en"><body><ErrorScreen reset={reset} /></body></html>;
}
