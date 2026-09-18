export function publicSiteOrigin(configured: string | undefined, currentOrigin: string) {
  if (configured?.trim()) {
    try {
      const url = new URL(configured.trim());
      const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || url.hostname.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname);
      if (url.protocol === "https:" && !local && !url.username && !url.password)
        return url.origin;
    } catch {
      // Invalid configuration must not produce an unsafe or broken QR link.
    }
  }
  return currentOrigin;
}
