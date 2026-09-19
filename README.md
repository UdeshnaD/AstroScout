# Space Interpreter

Space Interpreter is an interactive observing guide built for Macquarie University Astronomy Night. It helps a visitor answer three practical questions:

1. What is in the sky from this location?
2. Where should I look?
3. When are the conditions most suitable tonight?

The application combines calculated astronomy data, weather forecasts, location search and a visual night timeline. It is designed for someone standing outside with a phone, not just someone reading an astronomy catalogue at a desk.

## What visitors can do

- Select the Sun, Moon, planets, dwarf planets, asteroids, a comet, the ISS and a set of deep-sky objects.
- See altitude, azimuth, compass direction, right ascension and declination.
- View apparent magnitude, illumination and angular separation where the source provides them.
- Check whether the selected object is above the horizon now or becomes observable later.
- Move through a 48-hour altitude timeline sampled every five minutes.
- Find the best observing period using darkness, target altitude and forecast conditions.
- Understand possible moonlight interference for faint objects.
- Search for an address, landmark, city or postcode and use phone geolocation.
- Explore nearby outdoor places, road distance, estimated driving time and local weather.
- Compare 24 curated NSW observing locations using estimated Bortle classes.
- Browse Moon phases, equinoxes, solstices and selected 2026 astronomy dates.
- Save observing notes and target lists locally, then import or export them as JSON.
- Open the event site from a reusable QR code without creating an account.

The main experience is split into focused pages rather than one overloaded dashboard:

| Page | Purpose |
| --- | --- |
| `/` | Live sky position, visual sky view, altitude timeline and best observing window |
| `/places` | Location search, nearby outdoor places, routes and curated NSW sites |
| `/observe` | Equipment-aware readiness guide |
| `/calendar` | Moon quarters, seasonal events and selected event dates |
| `/journal` | Local observation notes and observing lists |
| `/method` | Plain-language explanation of sources and decision rules |
| `/join` | Event QR code, sharing and printing |

## Where the astronomy comes from

### NASA/JPL Horizons

[NASA/JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html) is the authoritative source for observer ephemerides used by the live Solar System view. Space Interpreter sends:

- the observer's latitude;
- longitude;
- elevation;
- requested UTC epoch; and
- the selected object's Horizons command identifier.

Horizons returns apparent observer-table values. The application parses the response into altitude, azimuth, right ascension, declination, apparent magnitude, illumination, constellation and angular separation where those fields are available.

For night planning, the server requests a 48-hour series centred on the selected epoch, with one sample every five minutes. This produces 577 points for each supported target. The Sun and Moon are requested through the same system, so darkness and moonlight checks use positions calculated for the same observer and timeline.

Horizons is used for the Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, 2P/Encke, Ceres, Vesta and the ISS. These are scientific calculations from JPL, not live telescope measurements and not detections from a photograph.

### Astronomy Engine

[Astronomy Engine](https://github.com/cosinekitty/astronomy) has a smaller and clearly separated role. It calculates:

- New Moon, first quarter, Full Moon and last quarter times; and
- equinox and solstice times.

These calculations populate the calendar. Astronomy Engine is **not** used as a fallback for live Solar System positions. If a Horizons request fails, the corresponding JPL result is shown as unavailable.

### Deep-sky catalogue positions

Galaxies, nebulae and star clusters do not use Horizons in this project. They begin with fixed catalogue right ascension and declination. Space Interpreter calculates Julian Day and Greenwich sidereal time, adjusts for the observer's longitude, and converts the catalogue coordinates into local altitude and azimuth.

This supports objects such as the Andromeda Galaxy, Orion Nebula, Pleiades, Magellanic Clouds and Omega Centauri. The source is labelled separately in the interface so it is not mistaken for a JPL response.

## How the observing window is calculated

The app analyses the selected object's five-minute samples across the relevant night. A point qualifies geometrically when:

- the Sun is at or below `-18°`, which is astronomical night; and
- the target is at least `20°` above the horizon.

Open-Meteo forecast data is matched to each astronomy sample. A forecast point is considered suitable when:

- cloud cover is no more than `50%`;
- precipitation is no more than `0.1 mm`;
- visibility is at least `10 km`; and
- wind is no more than `25 km/h`.

Eligible points are grouped into continuous windows of at least 15 minutes. The ranking favours a higher target, lower cloud and calmer wind. The interface also keeps a geometry-only result so it can explain when the sky position is good but the forecast is not.

The readiness score is a transparent planning score assembled from target altitude, darkness, cloud, rain, visibility, wind and selected equipment. It is not a machine-learning probability and it does not promise that a visitor will see the object. A legitimate sighting-probability model would require enough real, labelled visitor observations for training and evaluation; the project does not invent that dataset.

## Weather, Moon and daylight

[Open-Meteo](https://open-meteo.com/en/docs) supplies hourly cloud cover, precipitation, visibility, temperature, wind, humidity and weather code values. Its forecast API reaches at most 16 days, so the app requests weather for the selected UTC only when that date is within the available window. More distant dates still receive valid astronomy calculations, but weather and weather-based recommendations are explicitly marked unavailable. Weather remains a separate source from the astronomy calculations.

The Sun's calculated altitude determines the sky state:

- `0°` or above: daylight;
- `0°` to `-6°`: civil twilight;
- `-6°` to `-12°`: nautical twilight;
- `-12°` to `-18°`: astronomical twilight; and
- `-18°` or below: astronomical night.

For moonlight guidance, the app considers the Moon's altitude and illuminated fraction. A bright Moon above the horizon can reduce contrast for galaxies, nebulae and other faint targets. Local haze and light pollution can still matter even when the Moon is below the horizon.

## Bortle values and observing places

The Bortle scale describes night-sky brightness from class 1, an exceptionally dark sky, to class 9, a bright inner-city sky. Space Interpreter includes 24 hand-curated NSW locations with estimated classes ranging from 3 to 8.

Those values are reference estimates stored in `src/data/spots.ts`. They are not live sensor readings and they do not account for temporary lighting, smoke, haze, Moon phase or a visitor's exact position within a site.

The preference controls use Bortle class as the darkness input when ranking the curated list. The resulting `0–100` value is a preference match based on the visitor's slider weights. It is not a forecast, safety rating or scientific site certification.

[Geoapify](https://www.geoapify.com/) is used separately for address and landmark search, nearby outdoor-place discovery, straight-line proximity and road-route estimates. Leaflet displays Esri's public World Topographic basemap, which does not require an application API key. Access, opening hours, terrain and safety must still be checked independently.

## Reliability and visitor safety

- Successful JPL and weather responses are cached at the Vercel edge for five minutes using the exact location and requested UTC epoch as the cache key.
- The automatic "now" action uses a shared five-minute UTC epoch so Astronomy Night visitors at Macquarie University can reuse the same calculation.
- Provider failures are never cached as successful data and are never replaced with fabricated values.
- Public API routes have request limits, bounded in-memory counters and a concurrency cap.
- Optional Upstash Redis credentials enable a shared rate-limit counter across server instances.
- Security headers restrict framing, MIME sniffing, referrer leakage, camera access and microphone access.
- Geoapify credentials stay in server-only environment variables.
- A production service worker keeps previously opened pages and local journal data useful offline; live astronomy and weather still require a connection.

Vercel supplies HTTPS, CDN delivery and automatic function scaling after deployment. Account security, deployment protection, firewall rules, usage limits and environment variables still need to be configured in Vercel.

## Technology

- Next.js 15 App Router
- React 18
- TypeScript
- NASA/JPL Horizons API
- Astronomy Engine
- Open-Meteo forecast and geocoding APIs
- Geoapify geocoding, places and routing APIs
- Leaflet with Esri World Topographic map tiles
- `qrcode.react`
- Lucide icons
- Playwright browser tests
- Node's built-in test runner
- Vercel deployment and CDN caching
- Optional Upstash Redis rate limiting

## Local setup

Requirements:

- Node.js 20 or newer
- npm

Install and run:

```powershell
npm install
npm run dev
```

Next.js prints the local address. It is normally [http://localhost:3000](http://localhost:3000), but another port is selected when `3000` is already occupied.

Create `.env.local` for server credentials and deployment settings:

```text
GEOAPIFY_API_KEY=your_geoapify_api_key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example

# Optional shared rate limiting; configure both or neither.
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

`NEXT_PUBLIC_SITE_URL` is intentionally public because it becomes the QR destination. API credentials must never use the `NEXT_PUBLIC_` prefix.

Without a Geoapify key, city and postcode search falls back to Open-Meteo geocoding and nearby results come from the app's curated NSW observing catalogue with calculated straight-line distances. Geoapify adds address and landmark search, broader nearby-place discovery and road travel-time estimates.

## Checks

```powershell
npm test
npm run build
npx playwright test
npm audit
```

The automated coverage checks astronomy parsing, sidereal calculations, night-window rules, weather failure behaviour, Geoapify parsing, journal validation, rate limiting, security headers, live JPL precision, navigation and responsive layouts.

## Data honesty

Space Interpreter deliberately distinguishes calculation, forecast, catalogue data and user notes:

- JPL values are calculated ephemerides, not measurements from the visitor's telescope.
- Open-Meteo values are forecasts, not observations made at the event site.
- Bortle classes are curated estimates, not real-time light-meter readings.
- Deep-sky positions are coordinate conversions from catalogue values.
- Readiness and preference scores are transparent weighted rules, not AI probabilities.
- The app does not identify celestial objects in uploaded photographs.
- Trees, buildings, terrain, temporary closures and personal safety are outside the available data.

When a required provider fails, the interface says that the data is unavailable instead of substituting sample or generated results.
