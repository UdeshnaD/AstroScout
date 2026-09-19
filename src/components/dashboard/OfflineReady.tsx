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
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      } else {
        // Production workers on localhost can otherwise keep serving an old build.
        void navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        );
        if ("caches" in window)
          void caches.keys().then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("space-interpreter-") || key.startsWith("astroscout-"))
                .map((key) => caches.delete(key)),
            ),
          );
      }
    }
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
