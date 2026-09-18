"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorScreen({ reset }: { reset: () => void }) {
  return <main className="app-recovery">
    <p>Space Interpreter</p>
    <h1>We couldn&apos;t load this view.</h1>
    <p>Please try again. Your saved observations remain on this device.</p>
    <button type="button" onClick={reset}><RotateCcw size={18} /> Try again</button>
    <Link href="/" prefetch={false}>Return to tonight</Link>
  </main>;
}
