# Space Interpreter Security

## Transport and visitor links

Use the production HTTPS URL for public visitors. Local Wi-Fi URLs beginning
with `http://` are unencrypted development links, not public event links.
Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin to use it in the QR code.
No visitor account is required.

## Credentials

Geoapify is called from server routes using `GEOAPIFY_API_KEY` only. The public
environment-variable fallback has been removed. Environment files other than
`.env.example` are excluded from new Git commits. This does not remove secrets
from previous commits or deployments: rotate any previously exposed key in
Geoapify, update Vercel's environment variables, and redeploy.

Never put secrets in `NEXT_PUBLIC_*` variables. The site URL is intentionally
public. Restrict deployment permissions and enable account two-factor authentication.

## Request protection

Public provider routes apply a 300-request/60-second per-IP fixed-window limit.
Only Vercel's overwritten `x-vercel-forwarded-for` header is trusted on Vercel.
Other hosting environments share an unidentified-client bucket until trusted
proxy integration is added. Forwarding headers supplied by local clients are
not trusted. Fixed windows allow a burst across a window boundary.

Without shared storage, limits and the eight-request concurrency cap are local
to a server instance/module, reset on restart, and cannot enforce a deployment-wide
budget. The limiter's memory is bounded. Rejected requests return JSON 429 or
503 with Retry-After, not fake provider results.

For shared limits, configure server-only `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` from an Upstash Redis database. The code uses atomic
increments with one-minute expiry, storing hashed IP-derived identifiers rather
than raw IP addresses. These identifiers are pseudonymous, not anonymous.
Once configured, limiter failures return 503 instead of bypassing protection.
Redis limits are shared across instances but concurrency caps remain local.

Add a Vercel Firewall rate limit for `/api/` as an additional edge-level safeguard.
Observe traffic first: university Wi-Fi users may share an IP. Capacity and
fairness thresholds require a realistic event load test; they are not guarantees.

## Astronomy and browser protections

Horizons retains exact location/time requests and coalesces identical in-flight
work. Successful responses may be cached at the Vercel edge for five minutes;
the cache key includes the full request URL, including location and UTC epoch.
Automatic current-time requests use the current five-minute epoch so event
visitors can share one time-stamped calculation. Error responses are not cached
as successful data. Each scan has a 45-second upstream request budget and the
local queue admits at most two jobs. Unavailable target values remain unavailable.

Responses use anti-framing, MIME-sniffing protection, no-referrer policy and
restricted camera/microphone permissions. Geolocation remains available to
this origin. The CSP restricts embedding, objects, base URLs and form targets;
it is not a nonce-based script policy or a complete XSS defence. HSTS is enabled
on production responses; it does not create a TLS certificate.

Vercel firewall rules, TLS/domain configuration, provider key rotation, shared
Redis credentials, billing controls and account security must be configured in
their respective accounts. Nothing in this repository asserts these are enabled.
Monitor errors, upstream quotas and deployment usage; keep dependencies patched.
