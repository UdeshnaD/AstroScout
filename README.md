# AstroScout

**An evidence-led night-sky planner for Macquarie University Astronomy Night.**

AstroScout connects NASA/JPL observer ephemerides, regional weather forecasts, local image-quality analysis and visitor-reported outcomes. Its observing desk and night planner share one astronomy pipeline: **NASA/JPL Horizons only**.

## Observing Experience

1. Set latitude, longitude, elevation and an explicit UTC epoch. The default Macquarie University coordinates are -33.7738, 151.1126, with **0 m as an editable default**, not a surveyed campus elevation.
2. Select the Moon, Venus, Mars, Jupiter or Saturn. The Sun provides daylight/twilight context only; solar observing and solar outcome recording are disabled.
3. Inspect calculated altitude, azimuth, compass direction, apparent right ascension/declination, magnitude and illuminated disk fraction where JPL supplies them.
4. Explore the five-minute altitude timeline across the night. The target and Sun have separate curves; astronomical darkness is identified from the Sun's calculated altitude.
5. Review the best sampled observing interval, its geometric and weather conditions, and the Moon's potential effect on faint deep-sky contrast.
6. Upload a real JPG/JPEG or PNG and run local OpenCV analysis. Record what you personally found, your equipment and any notes.
7. Review observation history and export JSON or CSV, including source snapshots and failures.

The device clock, requested astronomy epoch, forecast valid times and API receipt timestamps are distinct. Refresh to now requests new data; the application does not continuously poll upstream services.

## One Astronomy System

All astronomy results originate in the [official NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html). These are **scientific calculations, not telescope measurements**.

| Request setting | Meaning |
| --- | --- |
| EPHEM_TYPE=OBSERVER | Observer ephemerides |
| CENTER=coord@399 | Observer on Earth |
| COORD_TYPE=GEODETIC | Geodetic coordinates |
| SITE_COORD | East-positive longitude, latitude and elevation in kilometres |
| TIME_TYPE=UT; TIME_DIGITS=FRACSEC | UTC input with millisecond precision retained by the application |
| START_TIME / STOP_TIME / STEP_SIZE | Requested epoch minus/plus 24 hours, sampled every five minutes |
| QUANTITIES=2,4,9,10 | Apparent RA/Dec, azimuth/altitude, apparent visual magnitude and illuminated fraction |
| ANG_FORMAT=DEG; APPARENT=AIRLESS | Degrees; no atmospheric refraction |

Body IDs are Sun 10, Moon 301, Venus 299, Mars 499, Jupiter 599 and Saturn 699. Each successful body response contains 577 samples; index 288 is the exact requested epoch. Fractional seconds are preserved in each epoch. Supported inputs span 2000-2100, latitude +/-90 degrees, longitude +/-180 degrees and elevation -500 to 10,000 metres.

The server uses structured CSV parsing, verifies the NASA/JPL signature and target ID, checks row counts and validates each returned Julian day against its requested UTC epoch within one millisecond. Apparent RA/Dec use the equator/equinox of date. Compass direction is derived from JPL azimuth, clockwise from north. Optional absent values remain null.

Every object retains the source, request URL, API version, requested epoch and request/response timestamps. Timeline samples inherit their body's response provenance. Receipt time is when AstroScout received the API result, not an observation time. See the [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html) for definitions.

### Availability

The six body requests run serially with a 12-second timeout each and a bounded queue per server process. Identical requests are coalesced **only while in flight**. Completed ephemerides are not reused as current responses, and upstream fetches use no-store.

A failed result displays **NASA/JPL data unavailable**. Partial successes remain available; complete failure returns HTTP 503. No generated positions, alternate astronomy engine, stale-current fallback or sample observations replace failures. Exact rise/set events are not calculated: timeline window edges are sampled times.

## Night Planning

The selected night is the contiguous Sun-below-horizon interval containing the requested epoch, or the next such interval when the epoch falls in daylight. A night reaching the edge of the 48-hour scan is marked incomplete.

Sun states use the airless Sun-centre altitude:

| Altitude | State |
| --- | --- |
| At or above 0 degrees | Daylight |
| Below 0, above -6 degrees | Civil twilight |
| At/below -6, above -12 degrees | Nautical twilight |
| At/below -12, above -18 degrees | Astronomical twilight |
| At/below -18 degrees | Astronomical night |

This is not a refraction-corrected, upper-limb sunrise calculation. Bright planets and the Moon can sometimes be observed outside astronomical darkness.

A weather-qualified window needs at least 15 minutes of consecutive samples with:

- Sun altitude at or below -18 degrees.
- Target altitude at or above 20 degrees.
- Forecast cloud cover at most 50%.
- Forecast precipitation at most 0.1 mm.
- Forecast visibility at least 10 km.
- Forecast wind at most 25 km/h.

Eligible samples are ranked by altitude (65%), clear-sky fraction (25%) and calmer wind (10%). A window extends around a candidate peak while the score remains within 0.1 of that peak. The highest-ranked candidate with a qualifying sustained interval is selected. Forecast samples must be within 30 minutes of their JPL sample.

These are transparent planning thresholds, **not learned probabilities or guarantees of visibility**. Weather-free geometric intervals are labelled separately. Missing weather never becomes clear weather. Past windows and results at historical/future epochs remain explicitly dated. Graph lines connect genuine samples; intermediate positions are not asserted.

Moonlight explanations use JPL Moon altitude and illumination. They do not claim a numerical sky-brightness measurement: angular separation, atmosphere and local light pollution also influence deep-sky visibility.

## Weather And Site Planning

[Open-Meteo](https://open-meteo.com/en/docs) supplies current weather-model estimates and hourly forecasts: cloud, precipitation, visibility, temperature, wind, humidity and WMO weather code. These are labelled **weather-forecast data**, not on-site sensor measurements. Requested coordinates, provider grid coordinates, valid times and receipt timestamps are retained. Missing fields remain unavailable.

Places and Compare use curated NSW site descriptions, explicitly estimated Bortle ratings, travel estimates and Open-Meteo forecasts. Their location-match score is not a sighting probability. Moon influence is excluded when no site-specific JPL snapshot exists; the site can be opened in the same JPL night planner. Estimated journey times are not live traffic or transit schedules.

[Leaflet](https://leafletjs.com/) provides maps with OpenStreetMap attribution. Site photography and imagery are illustrative, not observations of current sky conditions.

## Image Analysis

JPG/JPEG and PNG uploads support up to 20 MB and 40 megapixels. Images stay in the browser. OpenCV.js loads locally on first analysis and runs in a Web Worker, using a maximum analysis dimension of 1,280 pixels.

| Output | Method |
| --- | --- |
| Brightness | Mean grayscale intensity |
| Contrast | Grayscale standard deviation |
| Sharpness indicator | Variance of the grayscale Laplacian |
| Dark-pixel fraction | Grayscale threshold |
| Cloud-like pixel fraction | Exploratory HSV thresholds |
| Edge density | Canny edges |
| Possible obstruction indicator | Dark-region contours and edges |

These are explainable image-quality heuristics, **not a trained cloud classifier, planet detector or object-recognition model**. Exposure, noise, texture, haze and buildings can affect the same statistics. Camera pointing and field of view are unknown. AstroScout does not claim that a selected planet has been detected in a photo.

The visitor supplies the optional image capture time; it is not verified from EXIF. A screenshot or reference photo must not be confirmed as a real observing attempt. Image analysis and astronomy remain separate evidence sources.

## Experimental Machine Learning

The question is: **did a visitor report seeing this target with this equipment under these conditions?**

The implemented learner is a 64-tree random-forest classifier using ml-random-forest. TypeScript runs the feature extraction and model in the application. No trained weights, artificial observation dataset or pretrained sighting-probability service are bundled.

### Inputs

| Source | Features |
| --- | --- |
| NASA/JPL Horizons | Target altitude, Sun altitude, Moon altitude, Moon illumination and target apparent magnitude |
| Open-Meteo | Cloud cover, precipitation in mm, visibility, wind and humidity |
| Visitor | Equipment category, aperture and magnification |
| Provenance | Source-snapshot age |

Only explicitly confirmed real attempts with complete target/Sun/Moon snapshots, matching location/epoch, valid equipment and timely forecasts are eligible. JPL snapshots must be received within five minutes of the attempt, with the requested epoch also within five minutes. Weather receipt must be within one hour. Reports without the new source context remain in history but cannot train the model.

Reports are deduplicated by half-hour, site, target and equipment category; conflicting outcomes in a group are excluded. This reduces repeated-label inflation but does not independently verify visitor honesty or eliminate selection bias.

### Evaluation And Withholding

A probability is withheld until there are at least 60 eligible attempts across six observing nights for the selected target/equipment category. Nights are split chronologically into training, calibration and test periods (approximately 60/20/20), with at least 30/10/10 records and both outcomes in every period.

A separate calibration period supplies three probability bins with Laplace smoothing. The later-night test Brier score must beat the training-success-rate baseline. Inputs outside the training range and calibration bins with insufficient support remain withheld.

These are minimum safeguards, not proof of scientific validity. Until sufficient real data are collected and evaluated, the interface says **Probability withheld**. Predictions, if eventually enabled, estimate visitor-reported success rather than independently verified target detection.

Image quality is classical computer vision, overnight optimisation is deterministic decision support, and the random forest is supervised machine learning. No chatbot or paid generative-AI API is needed.

## Interface And Routes

| Route | Purpose |
| --- | --- |
| / | Shared observing desk |
| /planner | Same JPL observing system and night analysis |
| /observe | Same observing system and visitor workflow |
| /calendar | UTC date selection for a new JPL night scan |
| /journal | Observation history within the shared desk |
| /method | Experimental model evidence and source explanations |
| /places | NSW location discovery and forecast-based comparison |
| /compare | Side-by-side shortlisted sites |
| /spot/[id] | Site information and JPL summary with a link to the full planner |

Geist is the interface font and Newsreader the editorial/navigation font. Variable fonts are self-hosted via next/font/local. The UI uses accessible labels, visible focus states, target selection, progressive disclosure, a keyboard-operable timeline and responsive layouts.

## Technology

| Layer | Tools |
| --- | --- |
| Application | Next.js 14 App Router, React 18, TypeScript |
| Interface | CSS/Tailwind, Lucide, Radix UI, Motion, Geist/Newsreader |
| Astronomy | NASA/JPL Horizons API, csv-parse |
| Weather | Open-Meteo forecast API |
| Maps | Leaflet, OpenStreetMap |
| Image processing | Self-hosted OpenCV.js, Web Worker, browser image APIs |
| Experimental ML | ml-random-forest |
| Storage | Browser localStorage; JSON and CSV exports |
| Checks | Node test runner, TypeScript, ESLint, Playwright |

## Project Structure

```text
UI/
  EventDesk.tsx            Shared observing experience
  JplNightPanel.tsx        Night analysis and interactive altitude chart
  JplModelEvidence.tsx     Evidence gate and experimental model display
  CalendarView.tsx         UTC observing-date selection
  UnifiedApp.tsx           Shared route host
  EventDesk.css            Observing interface styles
src/
  app/api/event/           Horizons and weather server routes
  app/api/astronomy/       Compatibility summary backed by the same JPL service
  lib/event-providers.ts  JPL requests, CSV validation and weather parsing
  lib/horizons-analysis.ts Overnight windows and Sun/Moon interpretation
  lib/horizons-summary.ts Legacy display adapter for JPL results
  lib/jpl-sighting.ts     Real-report eligibility and JPL feature extraction
  lib/observation-model.ts Random forest, calibration and temporal evaluation
  lib/event-log.ts        Local storage and evidence exports
  lib/sky-image.ts        Upload validation and worker orchestration
public/workers/           Local OpenCV worker
scripts/                 OpenCV runtime preparation
tests/                   Unit and browser checks
```

## Run Locally

Node.js and npm are required. From the project directory:

```powershell
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). Development does not require a production build. If that port is occupied, use `npm run dev -- --port 3001`.

For a production build:

```powershell
npm run build
npm start
```

The predev/prebuild scripts prepare the self-hosted OpenCV runtime. The public JPL and Open-Meteo endpoints used here do not require API keys; their usage terms and service availability still apply. External connectivity is required for current API results.

## API Routes

| Endpoint | Response |
| --- | --- |
| GET /api/event/horizons?lat=...&lon=...&elevation=...&utc=... | Per-body exact positions, overnight series and provenance |
| GET /api/event/weather?lat=...&lon=...&elevation=... | Separate current/hourly forecast source envelope |
| GET /api/astronomy/tonight?lat=...&lon=...&elevation=...&startTime=... | Compatibility summary and snapshot using the same JPL service |

UTC inputs must include seconds and an explicit Z suffix; fractional seconds are supported. No API key is exposed to visitors.

## Records And Privacy

Reports are stored under `astroscout.event-observations.v1` in this browser. Existing records are preserved; new records add a versioned JPL/equipment/real-attempt context. JSON retains structured evidence. CSV includes flattened model inputs and complete source-context JSON, with spreadsheet-formula escaping.

Exports include location, notes and filenames. The log does not retain image files. Browser clearing, private sessions or changing origin/port can make records unavailable. Storage errors are visible; corrupt stored data is not silently overwritten.

No observations are uploaded to a cloud database or shared between visitor devices. This application is not an offline-installed PWA.

## Verification

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

With the development server running:

```powershell
$env:ASTROSCOUT_TEST_IMAGE = "C:\path\to\an-existing-image.png"
npm run test:event
```

Browser checks use real upstream API responses for successful astronomy/weather paths and injected network failures for unavailable states. Upload tests use a supplied image in isolated browser storage, not a scientific observation. No artificial sighting dataset is used to establish model accuracy.

## Scientific Scope

AstroScout is an astronomy decision-support and data-collection project. Horizons provides authoritative ephemeris calculations; forecasts and observer reports introduce their own uncertainty. Local obstructions, atmospheric seeing, transparency, optical quality and observer experience are not fully modelled. An above-horizon object or favourable window is not a guarantee of a successful sighting.
