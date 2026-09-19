# Space Interpreter pitch

## Main pitch

Space Interpreter is an observing guide we built for Macquarie University Astronomy Night.

The problem we wanted to solve is simple: astronomy information is easy to find, but it is usually disconnected from the visitor's actual place and time. A list might say that Jupiter is visible this month, but it does not tell someone standing at Macquarie University where Jupiter is right now, whether it is above the horizon, or whether waiting another hour would give them a better view.

Space Interpreter brings those pieces together. A visitor chooses an object and the app uses their latitude, longitude, elevation and UTC time to request an observer ephemeris from NASA/JPL Horizons. For supported Solar System and moving objects, that gives us real calculated values such as altitude, azimuth, compass direction, right ascension, declination, apparent magnitude and illumination.

We do not stop at a single position. The backend requests a 48-hour timeline at five-minute intervals. The app then checks the object's altitude against the Sun's altitude and, when the selected date is within Open-Meteo's forecast horizon, matches those points with an hourly weather forecast. A preferred observing window needs astronomical darkness, a target at least 20 degrees above the horizon, and acceptable cloud, rain, visibility and wind. The visitor can see the result as an altitude graph and move through the night interactively. For dates beyond the weather forecast range, the app keeps the astronomical calculation but clearly marks weather-based guidance as unavailable.

The Moon is treated as part of the observing conditions as well. Its calculated altitude and illuminated fraction help explain when moonlight may wash out faint objects such as galaxies and nebulae.

NASA/JPL Horizons is responsible for the live Solar System positions. Astronomy Engine has a separate, smaller job: it calculates Moon quarters, equinoxes and solstices for the calendar. Deep-sky targets use catalogue right ascension and declination, converted into local altitude and azimuth with sidereal time. We keep those sources labelled separately rather than pretending that every value comes from the same system.

The places section adds the practical side of planning. Geoapify can find addresses, landmarks and nearby outdoor places, calculate road distance and estimate driving time. Leaflet and Esri's public topographic tiles provide the interactive map. The app also includes 24 curated NSW observing sites with estimated Bortle classes. Bortle 1 represents an exceptionally dark sky and Bortle 9 a bright inner-city sky. Our values are reference estimates, not live readings, so the interface does not treat them as current measurements.

Visitors can also compare locations using their own priorities, check a transparent equipment-aware readiness score, browse the astronomy calendar, and save field notes on their own device. A QR page lets people at the event open the same public site without an account or download.

One important decision was not to label a weighted score as artificial intelligence. We do not have a large, trustworthy dataset of real visitor outcomes, so claiming a machine-learning sighting probability would be misleading. The current system uses explainable time-series analysis and openly stated thresholds. A visitor can see why a time was selected and which factor limited it.

For an event crowd, automatic requests share a five-minute calculation epoch and successful responses are cached at Vercel's edge. This reduces repeated calls to JPL and Open-Meteo while preserving the exact requested location and timestamp. If an upstream provider fails, the app says the data is unavailable. It does not quietly replace it with fake values.

Space Interpreter turns astronomy data into a practical activity: choose a target, understand where it is, decide when to look, go outside and compare the calculation with the real sky.

## Short version

Space Interpreter helps Astronomy Night visitors work out what they can observe, where to look and when conditions are most suitable.

It combines NASA/JPL Horizons observer calculations with local weather from Open-Meteo. Instead of checking only the current moment, it analyses a five-minute timeline across the night and looks for periods when the target is high enough, the Sun is far enough below the horizon and the forecast is suitable.

The project also includes location search, nearby places, road estimates, curated NSW sites with Bortle references, a calculated astronomy calendar, interactive sky and altitude views, and a phone QR page. Every source is labelled, and the planning scores use visible rules rather than pretending to be a trained AI prediction.

## Suggested live demonstration

1. Start on the live observing page at the Macquarie University location.
2. Select Jupiter or Saturn and point out altitude, compass direction and the source timestamp.
3. Move the sky-time control and show how the object's position changes.
4. Open the night timeline and explain the darkness, altitude and weather rows.
5. Point out the preferred window and the moonlight explanation.
6. Open Places, choose a curated site and explain its estimated Bortle class.
7. Open the calendar and distinguish Astronomy Engine calculations from JPL positions.
8. Finish on the QR page and explain that visitors do not need an account.

## Questions you may be asked

### Is the app showing live telescope data?

No. NASA/JPL Horizons calculates the apparent position for an observer at a specific location and time. It is scientific ephemeris data, not a camera or telescope measurement.

### Why use both JPL Horizons and Astronomy Engine?

They solve different problems. Horizons provides observer-specific Solar System positions and time series. Astronomy Engine calculates Moon-quarter and seasonal calendar events locally. It is not used to replace JPL when live position data is unavailable.

### What does the Bortle value mean?

It is a reference class for sky brightness. Lower numbers generally mean darker skies. The values in this project are curated estimates for broad comparison; they are not live readings and can be affected by Moon phase, weather, haze and nearby lighting.

### Is the readiness score machine learning?

No. It is an explainable weighted score using altitude, darkness, cloud, rain, visibility, wind and equipment. We chose not to train a model on invented data. A future model would need a substantial set of real observations with known outcomes.

### How is the best time selected?

The app scans the night in five-minute steps. It requires astronomical darkness and a target altitude of at least 20 degrees, matches the closest weather forecast, forms continuous windows and favours high targets, low cloud and manageable wind.

### What happens if an API fails?

The affected section is marked unavailable. The app does not generate a replacement astronomy or weather result. Previously opened static pages and local journal entries can still remain available through the service worker.

### Can thousands of visitors scan the QR code?

The QR code is simply a reusable link. Vercel serves the static application through its CDN, and visitors at the default Macquarie location share successful five-minute astronomy and weather responses. Unique locations still require separate calculations, so the shared event location is the most efficient path.
