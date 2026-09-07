# AstroScout

**An interactive observing desk for MQ Astronomy Night.**

AstroScout connects the practical question of where to observe with hourly weather, calculated celestial positions, and an explainable preference model. Start from Macquarie University or another location, compare nearby sites, and explore how your priorities change the ranking.

## Explore AstroScout

| Destination | Purpose |
| --- | --- |
| Tonight `/` | Credited NASA photography, calculated local Moon/planet positions, observing-hour selection and skywatching guides |
| Places `/places` | Ranked NSW locations, map, concise site preview and an expandable hourly forecast |
| Calendar `/calendar` | Month navigation, lunar quarter phases, equinoxes and solstices calculated with Astronomy Engine |
| Observe `/observe` | Object and equipment selection, conditions, experimental sighting estimates and planned attempts |
| Journal `/journal` | Completed and pending observations, outcome reporting and JSON import/export |
| The science `/method` | Sighting-model evidence and expandable preference-learning analysis |
| Compare `/compare` | Up to three shortlisted sites side by side |

Each destination has its own URL. A shared layout preserves session state during navigation. Date, origin, radius and travel settings open on demand. Saved places remain available from the header. Forecasts and local sky geometry remain distinct from spacecraft imagery and illustrative landscape photography.

The interface uses native navigation links, active-page indicators, progressive disclosure, visible focus states, responsive layouts and reduced-motion support. Reference notes and design decisions are documented in [UI/DESIGN_NOTES.md](UI/DESIGN_NOTES.md).

### Typography And Interaction

Geist provides the interface and reading type; Newsreader provides editorial headings. Two Latin-subset variable WOFF2 files are bundled from Fontsource and self-hosted through `next/font/local`, with fallback metrics and `font-display: swap`. Visitors do not make font requests to Google. The source files total approximately 85 KiB. Typography sizes, reading width and responsive scales are defined in `UI/Typography.css`.

Motion 13 supplies lightweight transitions through `LazyMotion`, with a site-wide reduced-motion policy. Radix UI supplies focus-aware tooltips and keyboard-accessible single-selection controls. The sky timeline supports play, pause and manual scrubbing through available forecast hours; chart objects can be selected directly or through the object selector. Playback pauses when the tab becomes hidden. The calendar supports arrow-key day navigation, highlights today and provides a current-month shortcut. Mobile navigation uses an expandable menu with Escape-to-close behaviour.

## AI And Data Science

AstroScout combines an explicit location-ranking model with two separate supervised learning systems: location preference learning and experimental object-sighting prediction. It does not require a chatbot or a paid AI API.

### Object-Sighting Prediction

The outcome is **the observer located and saw the selected object with the specified equipment**. Detecting Saturn is distinct from resolving its rings; detecting Jupiter is distinct from resolving cloud bands. Detailed planetary features are outside this model's scope.

The sighting model uses [ml-random-forest](https://github.com/mljs/random-forest), a JavaScript machine-learning library. It trains 64 classification trees with a fixed seed and bounded depth. Records are filtered to the selected object and equipment type. Aperture and magnification remain numeric model inputs.

| Input | Provenance |
| --- | --- |
| Cloud cover, precipitation probability, horizontal visibility, wind | Open-Meteo hourly forecast captured before the attempt |
| Target altitude, apparent magnitude, Sun altitude | Astronomy Engine calculations for the selected site and hour |
| Moon illumination above the horizon | Astronomy Engine; contribution is zero when the Moon is below the horizon |
| Aperture and magnification | Observer-entered equipment settings; unaided-eye mode uses a fixed 7 mm proxy, not a measured pupil size |
| Estimated Bortle class | Curated site catalogue; not a measured sky-brightness reading |
| Forecast lead time | Hours between saving the attempt and its planned time |
| Seen / not seen | Actual self-reported outcome after an observing attempt |

**No trained sighting dataset is bundled.** On a fresh installation, the app displays calculated observing constraints and explains that a success probability is not yet available. Location likes, generated examples, and weather-derived labels do not train the sighting model.

The observation workflow captures a complete forecast before the selected time, then accepts an outcome during the following two hours. An outing that did not happen remains unreported and is excluded from training. Duplicate attempts are deduplicated; conflicting imported outcomes are rejected. Observations stay in this browser, with JSON export and import for backup. Imported records are validated structurally, but their authenticity is not independently verified.

### Evaluation And Probability

Records are grouped into noon-to-noon Sydney observing nights. Nights are ordered chronologically: the earliest 60% train the forest, the next 20% calibrate its outputs, and the latest 20% evaluate the resulting estimates. Attempts from the same night cannot appear in different partitions.

The minimum evidence gate requires 60 labelled attempts across six nights for the selected object and equipment type, at least 30 training, 10 calibration and 10 evaluation records, and both successful and unsuccessful attempts in every partition. These are prototype operating thresholds, not a guarantee of statistical reliability.

Forest vote fractions are divided into three fixed bins. Each bin's estimate comes from outcomes in the separate calibration set, using Laplace smoothing: `(successes + 1) / (attempts + 2)`. A bin needs at least five calibration attempts. Brier score on the later evaluation nights is compared with a constant prediction using the training-set success rate. Predictions are withheld when evaluation does not beat that baseline or when inputs fall outside the training range. The fitted forest is not retrained on calibration or evaluation records.

Passing these checks enables an **experimental sighting probability**, not a guaranteed or externally validated success rate. Small calibration groups, repeated attempts, self-reporting and selection bias remain limitations. Atmospheric seeing, eyesight, observer experience, optical quality, mount stability, and terrain obstructions are not measured. The numerical weather visibility input measures horizontal visibility, not telescope resolution or atmospheric seeing.

Calculated horizon and daytime exclusions take precedence over the model. A forecast snapshot older than one hour cannot support a new attempt or a displayed probability. Condition warnings use transparent rules and are distinct from learned probabilities. The live planner and the test suite do not share observation data; synthetic fixtures exist only in tests to verify software behaviour.

### Feature Engineering

Each site is represented by four features normalized to the range 0-1:

| Feature       | Transformation                                                                     |
| ------------- | ---------------------------------------------------------------------------------- |
| Clear skies   | 65% inverse cloud cover + 20% inverse rain probability + 15% normalized visibility |
| Darkness      | `(9 - estimated Bortle class) / 8`                                                 |
| Easy travel   | `max(0, 1 - estimated minutes / 180)`                                              |
| Low moonlight | `1 - illuminated fraction`                                                         |

The baseline score is the normalized weighted sum, multiplied by 100. The default weights are 40%, 25%, 25%, and 10%. Deep-sky, quick-trip, and Moon/planet profiles provide other weight settings. Sliders support sensitivity analysis: changing a priority immediately updates the ranking and contribution chart.

### Preference Learning

Helpful / not-for-me ratings provide binary labels. A logistic regression model trains in the browser on the four centered features, using batch gradient descent and L2 regularization. Re-rating a location replaces its previous label and feature snapshot.

```text
preference = sigmoid(bias + weights . centered_features)
learned_share = min(0.30, 0.05 * number_of_rated_locations)
final_score = (1 - learned_share) * baseline + learned_share * preference * 100
```

Learning can be disabled or reset. With no feedback, rankings use only the baseline. Model lab displays the learned coefficients and every baseline score contribution.

This is a personal preference model, not a weather predictor. Its scores are not calibrated probabilities of observing success, and it has no held-out accuracy evaluation. Small, self-selected feedback sets provide limited evidence.

## Data And Provenance

| Source                                                                                             | Use                                                                                    | Behaviour                                                                                                    |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Open-Meteo](https://open-meteo.com/)                                                              | Cloud cover, visibility, rain probability, wind and temperature                        | Seven-day forecast request; up to eight hourly samples; 15-minute server cache; seven-second request timeout |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy)                                       | Moon illumination, sunset, astronomical twilight, moonset, local Moon/planet positions | Calculated for location and time, independently of weather                                                   |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) through [Leaflet](https://leafletjs.com/) | Interactive map and location markers                                                   | Browser-loaded map tiles with attribution                                                                    |
| Curated NSW site catalogue                                                                         | Coordinates, descriptions, Bortle estimates, facilities and access notes               | Local data, not live access verification                                                                     |
| Distance-based travel model                                                                        | Estimated journey time for driving, walking and public transport                       | Not road routing, a timetable, or live traffic data                                                          |
| Google Maps directions                                                                             | External trip planning                                                                 | Opens the selected destination, origin and travel mode                                                       |

Incomplete, invalid, unavailable, or out-of-range weather returns **forecast unavailable**. No replacement weather is generated. Affected sites are excluded from ranking and identified in the response. If all nearby sites lack a forecast, the planning endpoint returns HTTP 503. Forecast retrieval time is recorded separately from the forecast's valid hour; it is not a weather-model issue timestamp. Times are displayed in `Australia/Sydney`.

The location preference score does not account for wind, road access, astronomical darkness, or the Moon's altitude. The separate sighting model includes wind, Sun altitude and whether the Moon is above the horizon. Site access is not verified by either model. The sky list covers the Moon, Venus, Mars, Jupiter and Saturn, not a live meteor-shower or astronomy-event feed.

## Technology

| Layer             | Implementation                                             |
| ----------------- | ---------------------------------------------------------- |
| Application       | Next.js 14 App Router, React 18, TypeScript                |
| Interface         | CSS, Tailwind toolchain, Lucide icons                      |
| Typography        | Geist and Newsreader variable fonts, Fontsource, Next.js local font optimization |
| Interaction       | Motion 13, Radix UI Tooltip and Toggle Group |
| Maps              | Leaflet 1.9, OpenStreetMap tiles                           |
| Astronomy         | Astronomy Engine 2.1                                       |
| Backend           | Next.js route handlers and server-side provider requests   |
| Learning          | ml-random-forest 2.1 for sightings; regularized logistic regression for preferences |
| Local persistence | Browser localStorage for observations, equipment, ratings, weights, and saved plans; observation JSON import/export |
| Verification      | Next.js production build and focused Node.js tests         |

## Run Locally

Install dependencies and run the development server:

```powershell
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key is needed for the current implementation. Maps and forecasts require an internet connection; provider usage policies apply.

For a production build:

```powershell
npm run build
npm start
```

`npm start` requires a completed production build in `.next`.

Optional configuration in `.env.local`:

```env
OPEN_METEO_BASE_URL=https://api.open-meteo.com
```

Other provider keys in `.env.example` are reserved and are not used by the current integrations.

## API

| Endpoint                                                   | Purpose                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/plans/search`                                   | Nearby sites, forecasts, astronomy, travel estimates, and baseline scores |
| `GET /api/spots`                                           | Site catalogue                                                            |
| `GET /api/spots/:id`                                       | Individual site                                                           |
| `GET /api/weather?spotId=...&startTime=...`                | Forecast for a site                                                       |
| `GET /api/astronomy/tonight?lat=...&lon=...&startTime=...` | Calculated astronomy summary                                              |
| `POST /api/trips`                                          | Distance-based travel estimate                                            |

Example planning request:

```json
{
  "latitude": -33.7738,
  "longitude": 151.1126,
  "startTime": "2026-09-07T20:00:00+10:00",
  "radiusKm": 120,
  "travelMode": "driving"
}
```

The response contains a `locations` array and an `unavailableSites` array of names. Each available location includes weather provenance, retrieval time, hourly samples, astronomy, estimated travel time, and a baseline match score. Personalized ranking and sighting learning happen locally and do not send ratings or observation logs to the server. The weather endpoint returns HTTP 503 with `weather: null` when a forecast is unavailable.

## Repository

```text
UI/
  AstroScoutApp.tsx       Shared application state and route views
  AstroScout.css          Navigation, page layouts and responsive styles
  TonightView.tsx         Sky feature, calculated positions and observing guides
  CalendarView.tsx        Month grid and calculated astronomical dates
  ObservationPlanner.tsx  Equipment, target, probability and observation-log interface
  ObservationPlanner.css  Styles for the observing interface
  DESIGN_NOTES.md         Reference study and information architecture
  Typography.css         Type scale and interaction styling
  fonts.ts               Local variable-font definitions
  Providers.tsx          Motion and tooltip configuration
  Hint.tsx               Accessible tooltip primitive
src/
  app/                  Pages, shared styles, API routes
  components/
    dashboard/          Observing desk, map, comparison, model lab
    spot/               Location detail components
    ui/                 Shared interface primitives
  data/                 Curated observing catalogue
  lib/
    astronomy.ts        Ephemeris calculations
    weather.ts          Forecast retrieval and unavailable-data handling
    distance.ts         Distance and travel estimates
    scoring.ts          Server-side plan assembly
    recommender.ts      Features, scoring and preference learning
    observation-model.ts Sighting features, validation, forest training and evaluation
  types/                Shared contracts
tests/                  Ranking, astronomy and provider checks
```

Run focused checks with `npm test`; `npm run build` also checks TypeScript and lint rules.

## Project Context

Built as a student project for MQ Astronomy Night. AstroScout is an educational planning prototype and is not an official Macquarie University service. Saved plans, ratings and observations remain in the browser where they were created; there are no accounts or cloud synchronization.
