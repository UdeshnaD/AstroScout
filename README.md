# AstroScout

AstroScout is a location-aware observing assistant for Macquarie University Astronomy Night. It answers a practical question: **what can I observe from this location and when is the best time tonight?**

The dashboard lets visitors choose the Moon, every planet visible from Earth, Pluto, selected deep-sky objects, Vesta, the ISS or the Eta Aquariids radiant; search for an observing location; explore an altitude chart; and select another date. It uses real NASA/JPL Horizons observer ephemerides for moving Solar System targets, catalogue coordinates with local sidereal-time calculations for distant fixed targets, and Open-Meteo forecasts.

## Data sources

- [NASA/JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html): apparent position, altitude, azimuth, magnitude and illumination for the selected observer coordinates.
- Published catalogue right ascension and declination: converted into local altitude and azimuth for distant galaxies, nebulae, clusters and the meteor-shower radiant.
- [Open-Meteo](https://open-meteo.com/en/docs): current conditions and hourly forecast values used in the viewing-window guidance.
- [Geoapify](https://www.geoapify.com/): optional global address, landmark and place search. Search falls back to Open-Meteo city/postcode search if no key is configured.

Viewing recommendations are transparent planning rules: the target must be at least 20° above the horizon, the Sun must be at or below -18°, and the forecast is assessed for cloud, precipitation, visibility and wind. A favourable window is guidance, not a guarantee that an object will be visible.

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For complete global landmark/address search, place a Geoapify key in `.env.local`:

```text
GEOAPIFY_API_KEY=your_key_here
```

Restart the development server after adding or changing that value. The key is used only by the server-side search route and must not be committed.

## Checks

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```
