"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineReady() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div className="event-offline" role="status">
      <WifiOff size={16} />
      <span><strong>You’re offline.</strong> Saved journal entries and previously opened pages remain available; live sky and weather updates need a connection.</span>
    </div>
  );
}
