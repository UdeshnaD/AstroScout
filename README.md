# AstroScout

AstroScout is a night-sky trip planner that helps people find nearby places to observe astronomy events. It combines location, travel time, sky conditions, and astronomy data so users can plan where to go, when to leave, and what they may be able to see.

## Overview

AstroScout is designed for casual stargazing, and event-based sky watching. A user can enter their current location, choose a viewing time, and explore nearby observing spots with practical details such as distance, travel duration, cloud cover, moon phase, and visible sky highlights.

The project focuses on making astronomy easier to access. Instead of requiring users to interpret technical charts or scattered forecasts, AstroScout presents clear location-based guidance in a simple dashboard.

## Key Features

- Location-based astronomy spot discovery
- Nearby observing locations with distance and travel time
- Weather and sky-condition summaries
- Moon phase, moonrise, and moonset information
- Visible planets and notable night-sky events
- Spot quality scoring based on viewing conditions
- Map view with observing locations
- Detailed spot pages with access notes and sky highlights
- Beginner-friendly explanations of what to look for

## User Flow

1. The user opens AstroScout.
2. The user shares their location or enters a suburb/postcode.
3. The user selects a viewing time, such as tonight, tomorrow night, or a custom date.
4. AstroScout shows nearby astronomy-friendly locations.
5. The dashboard ranks locations using travel time, sky conditions, moon brightness, and visible events.
6. The user opens a location page to view trip details, conditions, and observing notes.

## Frontend

The frontend provides a responsive dashboard experience for desktop and mobile users.

### Main Dashboard

The dashboard is the primary screen of the application. It gives users a quick overview of nearby viewing options and current sky conditions.

Dashboard elements include:

- Location search
- Date and time selector
- Travel mode selector
- Search radius control
- Ranked observing location list
- Map preview
- Weather summary
- Moon and twilight summary
- Night-sky highlight cards

### Map View

The map view displays observing locations near the user.

Map features include:

- User location marker
- Observing spot markers
- Condition-based marker styling
- Route preview
- Distance and travel-time labels
- Optional overlays for future sky-quality or light-pollution data

### Spot Detail Page

Each observing location has a detail page with:

- Location name and description
- Distance from the user
- Estimated travel time
- Travel mode summary
- Parking and access notes
- Safety and facility details
- Hourly sky-condition forecast
- Moon phase and moon timing
- Best viewing window
- Visible objects and events
- Practical viewing tips

### Event Detail Page

Astronomy events and visible objects include plain-language detail pages.

Event details include:

- Event or object name
- Description
- Best viewing time
- Direction in the sky
- Approximate altitude
- Equipment guidance
- Visibility confidence
- Beginner-friendly observing notes

## Backend

The backend handles data collection, astronomy calculations, routing, location search, scoring, and API responses.

Core backend responsibilities:

- Process user location and selected viewing time
- Search nearby observing spots
- Fetch weather and visibility forecasts
- Calculate astronomy conditions
- Estimate travel distance and duration
- Score each observing location
- Return structured data to the frontend

## Architecture

```text
User
  |
  v
Frontend Dashboard
  |
  v
Backend API
  |
  |-- Location Service
  |-- Spot Service
  |-- Weather Service
  |-- Astronomy Service
  |-- Trip Planner Service
  |-- Scoring Service
  |-- Content Service
  |
  v
Database + External Data Providers
```

## Services

### Location Service

Handles location input, coordinates, distance calculations, and place lookup.

### Spot Service

Stores and retrieves astronomy-friendly locations, including access notes, facilities, safety details, coordinates, and sky-quality metadata.

### Weather Service

Collects hourly sky and weather conditions such as cloud cover, visibility, wind, humidity, and precipitation chance.

### Astronomy Service

Calculates moon phase, moon illumination, moonrise, moonset, sunset, twilight, planet visibility, and local sky positions.

### Trip Planner Service

Calculates travel distance, estimated duration, travel mode details, route summaries, and transport-related information.

### Scoring Service

Combines sky conditions, visible events, travel time, moon brightness, and site quality into a single location score.

### Content Service

Provides clear descriptions of astronomy events, visible objects, and viewing tips for users with different experience levels.

## API Providers

AstroScout can integrate with multiple data sources depending on feature availability and deployment needs.

### Transport And Routing

- Transport for NSW Open Data: public transport routes, departures, service alerts, and trip planning
- Mapbox Directions API: driving routes, traffic-aware travel time, route geometry, and map support
- OpenRouteService: OpenStreetMap-based routing, driving, walking, cycling, and isochrones

### Weather And Sky Conditions

- Open-Meteo: hourly cloud cover, visibility, precipitation, wind, humidity, and temperature forecasts
- Meteoblue Astronomy Seeing: advanced astronomy seeing data and atmospheric condition indicators

### Astronomy Data

- Skyfield: moon, twilight, planet positions, rise/set times, and local sky calculations
- AstronomyAPI: astronomy events, body positions, and star chart generation
- timeanddate Astronomy API: moon phases, rise/set data, and commercial astronomy data
- International Meteor Organization: meteor shower calendar and observing information
- NASA APIs: educational astronomy data and Astronomy Picture of the Day
- JPL Horizons API: advanced ephemeris data for solar system objects

### Places And Viewing Spots

- Curated observing spot database
- Google Places API
- Geoapify Places API
- OpenStreetMap and Overpass API
- Local council and open-data sources

## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Mapbox GL JS or MapLibre GL JS
- React Query or SWR
- Zustand or Redux Toolkit
- Recharts or Nivo

### Backend

- Python
- FastAPI
- PostgreSQL
- PostGIS
- Redis
- SQLAlchemy or SQLModel
- Pydantic
- Skyfield

### Development And Testing

- Docker Compose
- Pytest
- Ruff
- ESLint
- Playwright
- GitHub Actions

## Getting Started

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

The MVP can run without paid API keys. Open-Meteo is used for weather data and does not require a key. Routing, maps, transport, and extra astronomy providers can be enabled by adding keys to `.env.local`.

## Data Model

### observing_spots

```text
id
name
description
latitude
longitude
region
spot_type
bortle_rating
parking_notes
access_notes
safety_notes
facilities
is_public
created_at
updated_at
```

### astronomy_events

```text
id
name
event_type
start_time
end_time
peak_time
description
source
equipment_guidance
created_at
updated_at
```

### spot_forecasts

```text
id
spot_id
forecast_time
cloud_cover
cloud_cover_low
cloud_cover_mid
cloud_cover_high
visibility_m
precipitation_probability
humidity
wind_speed
temperature
source
created_at
```

### trip_options

```text
id
origin_latitude
origin_longitude
destination_spot_id
travel_mode
departure_time
arrival_time
duration_seconds
distance_meters
provider
route_summary
alerts
created_at
```

### saved_plans

```text
id
user_id
spot_id
planned_time
travel_mode
notes
created_at
updated_at
```

## API Design

### Plan Locations

```http
POST /api/plans/search
```

Example request:

```json
{
  "latitude": -33.8688,
  "longitude": 151.2093,
  "startTime": "2026-09-01T20:00:00+10:00",
  "radiusKm": 80,
  "travelMode": "driving"
}
```

Example response:

```json
{
  "locations": [
    {
      "spotId": "blue-mountains-lookout",
      "name": "Blue Mountains Lookout",
      "distanceKm": 76.2,
      "travelTimeMinutes": 82,
      "score": 87,
      "scoreReasons": [
        "Low cloud cover after 9 PM",
        "Moon sets early",
        "Good western horizon"
      ],
      "visibleHighlights": [
        "Saturn",
        "Milky Way",
        "Moon"
      ]
    }
  ]
}
```

### Spots

```http
GET /api/spots?lat=-33.8688&lon=151.2093&radiusKm=80
GET /api/spots/:id
```

### Weather

```http
GET /api/weather/spot/:id?date=2026-09-01
```

### Astronomy

```http
GET /api/astronomy/tonight?lat=-33.8688&lon=151.2093&date=2026-09-01
GET /api/astronomy/events?from=2026-09-01&to=2026-09-07
```

### Trips

```http
POST /api/trips/route
```

Example request:

```json
{
  "origin": {
    "latitude": -33.8688,
    "longitude": 151.2093
  },
  "destinationSpotId": "blue-mountains-lookout",
  "departureTime": "2026-09-01T18:30:00+10:00",
  "travelMode": "public_transport"
}
```

## Scoring Model

AstroScout calculates a score for each observing location using multiple conditions.

```text
score =
  sky_clarity_score * 0.35 +
  event_visibility_score * 0.25 +
  travel_convenience_score * 0.20 +
  moon_darkness_score * 0.10 +
  site_quality_score * 0.10
```

Score factors:

- Sky clarity
- Cloud cover
- Visibility
- Moon brightness
- Object altitude
- Event timing
- Travel duration
- Distance
- Site quality
- Access confidence

## Repository Structure

```text
AstroScout/
  apps/
    web/
      src/
        app/
        components/
        features/
        lib/
        styles/
  services/
    api/
      astroscout/
        main.py
        api/
        core/
        models/
        services/
        providers/
        scoring/
        jobs/
      tests/
  data/
    seed/
      observing_spots.csv
      meteor_showers.json
  docs/
    architecture.md
    api-providers.md
    scoring.md
  docker-compose.yml
  README.md
```

## Roadmap

### Phase 1: Foundation

- Project structure
- Core dashboard UI
- Curated observing locations
- Basic spot search
- Weather integration
- Moon and twilight calculations

### Phase 2: Planning Experience

- Map view
- Spot detail pages
- Travel-time estimates
- Viewing-window summaries
- Sky-condition scoring
- Visible planet and event data

### Phase 3: Enhanced Astronomy

- Meteor shower calendar
- Milky Way visibility estimates
- Star chart generation
- Advanced object visibility
- More detailed observing notes

### Phase 4: Production Features

- Saved plans
- User accounts
- Notifications
- Public transport alerts
- Community spot reports
- Light-pollution layers

## Environment Variables

```env
DATABASE_URL=
REDIS_URL=
OPEN_METEO_BASE_URL=https://api.open-meteo.com
TFNSW_API_KEY=
MAPBOX_ACCESS_TOKEN=
OPENROUTESERVICE_API_KEY=
ASTRONOMY_API_APP_ID=
ASTRONOMY_API_APP_SECRET=
TIMEANDDATE_ACCESS_KEY=
TIMEANDDATE_SECRET_KEY=
NASA_API_KEY=
```

## Project Status

AstroScout is in early MVP development. The current build establishes the core web dashboard, observing spot data, API route structure, weather integration path, astronomy summaries, travel estimates, and location scoring flow.
