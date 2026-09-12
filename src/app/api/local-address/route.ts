import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function localIpv4() {
  const addresses = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
  return (
    addresses.find((address) => address.startsWith("192.168.")) ??
    addresses.find((address) => address.startsWith("10.")) ??
    addresses.find((address) => /^172\.(1[6-9]|2\d|3[01])\./.test(address)) ??
    addresses[0]
  );
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available during local development." }, { status: 404 });
  }
  const address = localIpv4();
  if (!address) {
    return NextResponse.json({ error: "No local network address was found." }, { status: 404 });
  }
  const requested = new URL(request.url);
  const port = requested.port || "3000";
  return NextResponse.json(
    { origin: `http://${address}:${port}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
