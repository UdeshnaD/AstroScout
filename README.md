# AstroScout

AstroScout is a location-aware observing assistant for Macquarie University Astronomy Night. It answers a practical question: **what can I observe from this location and when is the best time tonight?**

The dashboard lets visitors choose the Moon, Venus, Mars, Jupiter, Saturn, among other celestial objects; search for an observing location; explore an altitude chart; and select another date. It uses real NASA/JPL Horizons observer ephemerides and Open-Meteo forecasts. It does not identify objects in visitor photographs, train a model, or claim to predict a successful sighting.

## Data sources

- [NASA/JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html): apparent position, altitude, azimuth, magnitude and illumination for the selected observer coordinates.
- [Open-Meteo](https://open-meteo.com/en/docs): current conditions and hourly forecast values used in the viewing-window guidance.
- [Geoapify](https://www.geoapify.com/): optional global address, landmark and place search. Search falls back to Open-Meteo city/postcode search if no key is configured.

Viewing recommendations are transparent rules, not an AI claim: the target must be at least 20° above the horizon, the Sun must be at or below -18°, and the forecast is assessed for cloud, precipitation, visibility and wind. A favourable window is planning guidance, not a guarantee that an object will be visible.

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For complete global landmark/address search, place a Geoapify key in `.env.local`:

```text
GEOAPIFY_API_KEY=c191acf5c59d4a6d9ad1ca48ba2d703e
```

Restart the development server after adding or changing that value. The key is used only by the server-side search route and must not be committed.

## Checks

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```
