"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Printer, Share2, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function PhoneJoin() {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [localLink, setLocalLink] = useState(false);

  useEffect(() => {
    async function prepareLink() {
      const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      let origin = configured || window.location.origin;
      const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (!configured && isLocal) {
        try {
          const response = await fetch("/api/local-address", { cache: "no-store" });
          const data = (await response.json()) as { origin?: string };
          if (response.ok && data.origin) {
            origin = data.origin;
            setLocalLink(true);
          }
        } catch {
          // Keep localhost as a visible fallback if network detection fails.
        }
      }
      const url = new URL("/", origin);
      url.searchParams.set("from", "astronomy-night-qr");
      setJoinUrl(url.toString());
    }
    void prepareLink();
  }, []);

  async function copyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this AstroScout link:", joinUrl);
    }
  }

  async function shareLink() {
    if (!joinUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AstroScout",
          text: "Open the Astronomy Night observing guide",
          url: joinUrl,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") await copyLink();
      }
      return;
    }
    await copyLink();
  }

  return (
    <section className="phone-join" aria-labelledby="phone-join-heading">
      <div className="phone-join__copy">
        <p className="event-kicker">ASTRONOMY NIGHT CHECK-IN</p>
        <h2 id="phone-join-heading">Scan once. Explore the sky on your phone.</h2>
        <p>
          Point your phone camera at the code. It opens this AstroScout website directly. No account, download or personal details are required.
        </p>
        {localLink && (
          <p className="phone-join__local-note">
            Local test link: keep this laptop running and connect your phone to the same Wi-Fi network. Phone location may require the deployed HTTPS version.
          </p>
        )}
        <ol>
          <li><span>1</span> Scan the QR code with your camera.</li>
          <li><span>2</span> Allow location access, or search for a place.</li>
          <li><span>3</span> Choose a planet and explore tonight’s window.</li>
        </ol>
        <div className="phone-join__actions">
          <button type="button" className="event-primary" onClick={() => void shareLink()} disabled={!joinUrl}>
            <Share2 size={17} /> Share link
          </button>
          <button type="button" className="event-secondary" onClick={() => void copyLink()} disabled={!joinUrl}>
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" className="event-secondary phone-join__print" onClick={() => window.print()}>
            <Printer size={17} /> Print QR
          </button>
        </div>
        <Link className="phone-join__open" href="/">
          <Smartphone size={17} /> Already on your phone? Open AstroScout
        </Link>
      </div>

      <div className="phone-join__code" aria-live="polite">
        {joinUrl ? (
          <>
            <QRCodeSVG
              value={joinUrl}
              size={280}
              level="M"
              marginSize={3}
              bgColor="#ffffff"
              fgColor="#14211b"
              title="QR code that opens AstroScout"
            />
            <strong>Open AstroScout</strong>
            <span>{new URL(joinUrl).host}{localLink ? " / same Wi-Fi only" : ""}</span>
          </>
        ) : (
          <div className="phone-join__placeholder">Preparing this site’s QR code…</div>
        )}
      </div>
    </section>
  );
}
