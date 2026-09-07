# AstroScout

**An interactive observing desk for MQ Astronomy Night.**

AstroScout connects the practical question of where to observe with hourly weather, calculated celestial positions, and an explainable preference model. Start from Macquarie University or another location, compare nearby sites, and explore how your priorities change the ranking.

## The Observing Desk

- **Explore:** an interactive OpenStreetMap map linked to ranked locations, regional filtering, device location, travel modes, and search radius.
- **Through the night:** select an hourly forecast to update conditions, rankings, and local planet positions.
- **In your sky:** expand Moon and planet entries for observing notes, equipment, compass direction, altitude, and horizon status.
- **Compare:** inspect up to three sites side by side, including weather provenance and access notes.
- **Model lab:** adjust four priorities, inspect score contributions, and see the coefficients learned from your ratings.
- **Saved plans:** retain locations and observing times on this device, with directions available from each saved entry.

The interface uses a consistent reading order, map/list selection, inline feedback, keyboard-accessible tabs, native dialogs, visible focus states, and responsive layouts. Motion respects the device's reduced-motion setting.

## AI And Data Science

AstroScout combines an explicit decision model with a small supervised learning model. It does not require a chatbot or a paid AI API.

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

Incomplete, unavailable, or out-of-range weather produces deterministic **demo weather**, explicitly labelled in the interface. The forecast is never presented as a live observation. Times are displayed in `Australia/Sydney`.

The score does not account for wind, road access, astronomical darkness, or the Moon's altitude. These limitations are visible in Model lab; site access and daylight conditions are shown separately. The sky list covers the Moon, Venus, Mars, Jupiter and Saturn, not a live meteor-shower or astronomy-event feed.

## Technology

| Layer             | Implementation                                             |
| ----------------- | ---------------------------------------------------------- |
| Application       | Next.js 14 App Router, React 18, TypeScript                |
| Interface         | CSS, Tailwind toolchain, Lucide icons                      |
| Maps              | Leaflet 1.9, OpenStreetMap tiles                           |
| Astronomy         | Astronomy Engine 2.1                                       |
| Backend           | Next.js route handlers and server-side provider requests   |
| Learning          | Browser-side regularized logistic regression               |
| Local persistence | Browser localStorage for ratings, weights, and saved plans |
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

The response contains a `locations` array. Each location includes weather provenance, hourly samples, astronomy, estimated travel time, and a baseline match score. Personalized ranking happens locally and does not send ratings to the server.

## Repository

```text
src/
  app/                  Pages, shared styles, API routes
  components/
    dashboard/          Observing desk, map, comparison, model lab
    spot/               Location detail components
    ui/                 Shared interface primitives
  data/                 Curated observing catalogue
  lib/
    astronomy.ts        Ephemeris calculations
    weather.ts          Forecast retrieval and labelled fallback
    distance.ts         Distance and travel estimates
    scoring.ts          Server-side plan assembly
    recommender.ts      Features, scoring and preference learning
  types/                Shared contracts
tests/                  Ranking, astronomy and provider checks
```

Run focused checks with `npm test`; `npm run build` also checks TypeScript and lint rules.

## Project Context

Built as a student project for MQ Astronomy Night. AstroScout is an educational planning prototype and is not an official Macquarie University service. Saved plans and ratings remain in the browser where they were created; there are no accounts or cloud synchronization.
