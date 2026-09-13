"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  Cloud,
  Compass,
  Database,
  ExternalLink,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  QrCode,
  RefreshCw,
  Telescope,
} from "lucide-react";
import { CalendarView } from "./CalendarView";
import { AstroCalendar } from "./AstroCalendar";
import { JplNightPanel } from "./JplNightPanel";
import { SkyPositionPanel } from "./SkyPositionPanel";
import { PassingThrough } from "./PassingThrough";
import { ReadinessGuide } from "./ReadinessGuide";
import { PreferenceSliders } from "./PreferenceSliders";
import { NearbyPlacesExplorer } from "@/components/dashboard/NearbyPlacesExplorer";
import { CuratedSpotsMap } from "@/components/dashboard/CuratedSpotsMap";
import { ObservationJournal } from "@/components/dashboard/ObservationJournal";
import { OfflineReady } from "@/components/dashboard/OfflineReady";
import { PhoneJoin } from "@/components/dashboard/PhoneJoin";
import {
  LocationSearch,
  type LocationPreset,
} from "@/components/dashboard/LocationSearch";
import { eventTargets, mqLocation } from "@/lib/event-types";
import {
  objectGuidance,
  smartphonePhotographyGuide,
  stellariumWeb,
} from "@/lib/object-guidance";
import type {
  EventLocation,
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  JplPosition,
  SourceResult,
} from "@/lib/event-types";
import "./EventDesk.css";

const deviceTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function localTime(value: string, timezone: string, withDate = true) {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: timezone,
      ...(withDate
        ? { dateStyle: "medium" as const, timeStyle: "short" as const }
        : { timeStyle: "short" as const }),
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString("en-AU", { timeZone: "UTC" });
  }
}

const metric = (
  number: number | null | undefined,
  suffix = "",
  digits = 1,
) =>
  number === null || number === undefined
    ? "Unavailable"
    : `${number.toFixed(digits)}${suffix}`;

function airmass(altitude: number) {
  if (altitude <= 0) return "Below horizon";
  const zenithAngle = 90 - altitude;
  const value =
    1 /
    (Math.cos((zenithAngle * Math.PI) / 180) +
      0.50572 * Math.pow(96.07995 - zenithAngle, -1.6364));
  return value.toFixed(2);
}

function scanEventTime(
  series: JplPosition[] | undefined,
  marker: JplPosition["eventMarker"],
  timezone: string,
) {
  const event = series?.find((sample) => sample.eventMarker === marker);
  return event
    ? `About ${localTime(event.utc, timezone)}`
    : "Not in this 48-hour scan";
}

function catalogueConstellation(
  target: (typeof eventTargets)[number] | undefined,
) {
  return target && "constellation" in target ? target.constellation : undefined;
}

function coordinateNote(target: (typeof eventTargets)[number] | undefined) {
  return target && "coordinateNote" in target ? target.coordinateNote : undefined;
}

function unavailable<T>(source: string, error: string): SourceResult<T> {
  const time = new Date().toISOString();
  return {
    status: "unavailable",
    source,
    requestedAt: time,
    receivedAt: time,
    data: null,
    error,
  };
}

async function readApiResponse<T extends { error?: string }>(
  response: Response,
  label: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`${label} is temporarily unavailable. Please refresh the page.`);
  }
  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(data.error || `${label} could not be loaded. Please try again.`);
  }
  return data;
}

const pageCopy: Record<string, { eyebrow: string; title: string; intro: string }> = {
  "/": {
    eyebrow: "Live observing desk",
    title: "What can you see tonight?",
    intro:
      "Choose a target and explore its real position, best viewing window and local weather.",
  },
  "/places": {
    eyebrow: "Places",
    title: "Find somewhere to observe.",
    intro:
      "Search for a location, explore nearby outdoor areas and check the sky and weather before you go.",
  },
  "/calendar": {
    eyebrow: "Plan another night",
    title: "Choose an observing date.",
    intro:
      "Choose a date and time, then return to Tonight to see the calculated sky for that moment.",
  },
  "/journal": {
    eyebrow: "Observation journal",
    title: "Keep a record of the sky.",
    intro:
      "Save observing notes and build personal target lists that stay on this device.",
  },
  "/method": {
    eyebrow: "How it works",
    title: "Real sky data, explained clearly.",
    intro:
      "See where every answer comes from and how AstroScout chooses a good time to look up.",
  },
  "/observe": {
    eyebrow: "Can I see it?",
    title: "Target readiness.",
    intro: "Choose a target and equipment to get a clear, transparent planning score for this exact location and time.",
  },
  "/join": {
    eyebrow: "Join Astronomy Night",
    title: "Take AstroScout outside.",
    intro:
      "Share this live site with visitors using a QR code generated from its current address.",
  },
};

export function EventDesk({
  initialLocation = mqLocation,
  initialUtc,
}: { initialLocation?: EventLocation; initialUtc?: string } = {}) {
  const pathname = usePathname();
  const copy = pageCopy[pathname] ?? pageCopy["/"];
  const [now, setNow] = useState("");
  const [location, setLocation] = useState<EventLocation>(initialLocation);
  const [locationName, setLocationName] = useState(
    initialLocation.latitude === mqLocation.latitude &&
      initialLocation.longitude === mqLocation.longitude
      ? "Macquarie University"
      : "Custom observing location",
  );
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [placeOrigin, setPlaceOrigin] = useState<LocationPreset>({
    label:
      initialLocation.latitude === mqLocation.latitude &&
      initialLocation.longitude === mqLocation.longitude
        ? "Macquarie University"
        : "Custom observing location",
    latitude: initialLocation.latitude,
    longitude: initialLocation.longitude,
    elevation: initialLocation.elevation,
    timezone: "Australia/Sydney",
  });
  const [latitude, setLatitude] = useState(String(initialLocation.latitude));
  const [longitude, setLongitude] = useState(String(initialLocation.longitude));
  const [elevation, setElevation] = useState(String(initialLocation.elevation));
  const [utc, setUtc] = useState("");
  const [epochInput, setEpochInput] = useState("");
  const [target, setTarget] = useState<EventTarget>("saturn");
  const [viewMode, setViewMode] = useState<"observer" | "astronomer">(
    "observer",
  );
  const [positions, setPositions] = useState<HorizonsSnapshot>();
  const [weather, setWeather] = useState<SourceResult<EventWeather>>();
  const [positionLoading, setPositionLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [positionError, setPositionError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [revision, setRevision] = useState(0);
  const requestGeneration = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("astroscout.view-mode.v1");
    if (saved === "observer" || saved === "astronomer") setViewMode(saved);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("astroscout.view-mode.v1", viewMode);
    } catch {
      // The mode remains available for this visit when storage is restricted.
    }
  }, [viewMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("utc") || initialUtc;
    const time =
      requested && Number.isFinite(Date.parse(requested)) && requested.endsWith("Z")
        ? new Date(requested).toISOString()
        : new Date().toISOString();
    if (params.has("lat") && params.has("lon")) {
      const lat = Number(params.get("lat"));
      const lon = Number(params.get("lon"));
      const elev = Number(params.get("elevation") || 0);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        Number.isFinite(elev) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lon) <= 180 &&
        elev >= -500 &&
        elev <= 10000
      ) {
        setLocation({ latitude: lat, longitude: lon, elevation: elev });
        setLatitude(String(lat));
        setLongitude(String(lon));
        setElevation(String(elev));
        setLocationName("Shared observing location");
        setTimezone(deviceTimezone());
        setPlaceOrigin({
          label: "Shared observing location",
          latitude: lat,
          longitude: lon,
          elevation: elev,
          timezone: deviceTimezone(),
        });
      } else {
        setFormError("The shared location is invalid, so Macquarie University remains selected.");
      }
    }
    setNow(new Date().toISOString());
    setUtc(time);
    setEpochInput(time.slice(0, -1));
    const clock = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(clock);
  }, [initialUtc]);

  useEffect(() => {
    if (!utc) return;
    const generation = ++requestGeneration.current;
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      elevation: String(location.elevation),
      utc,
    });
    setPositions(undefined);
    setPositionError("");
    setWeather(undefined);
    setPositionLoading(true);
    setWeatherLoading(true);

    async function loadPositions() {
      try {
        const response = await fetch(`/api/event/horizons?${params}`, {
          signal: controller.signal,
        });
        const data = await readApiResponse<HorizonsSnapshot & { error?: string }>(
          response,
          "Sky information",
        );
        if (!data.objects || data.utc !== utc)
          throw new Error(data.error || "JPL returned an invalid response.");
        if (generation === requestGeneration.current) setPositions(data);
      } catch (error) {
        if (generation === requestGeneration.current && !controller.signal.aborted)
          setPositionError(
            error instanceof Error ? error.message : "JPL request failed.",
          );
      } finally {
        if (generation === requestGeneration.current) setPositionLoading(false);
      }
    }

    async function loadWeather() {
      try {
        const response = await fetch(`/api/event/weather?${params}`, {
          signal: controller.signal,
        });
        const data = await readApiResponse<SourceResult<EventWeather> & {
          error?: string;
        }>(response, "Weather information");
        if (!data.status) throw new Error(data.error || "Weather response was invalid.");
        if (generation === requestGeneration.current) setWeather(data);
      } catch (error) {
        if (generation === requestGeneration.current && !controller.signal.aborted)
          setWeather(
            unavailable(
              "Open-Meteo API",
              error instanceof Error ? error.message : "Weather request failed.",
            ),
          );
      } finally {
        if (generation === requestGeneration.current) setWeatherLoading(false);
      }
    }

    void loadPositions();
    void loadWeather();
    const timeout = window.setTimeout(() => {
      if (generation !== requestGeneration.current) return;
      controller.abort();
      setPositionLoading(false);
      setWeatherLoading(false);
      setPositionError((current) => current || "The JPL request timed out. Try refreshing.");
      setWeather((current) =>
        current || unavailable("Open-Meteo API", "The weather request timed out."),
      );
    }, 110000);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [location, utc, revision]);

  function refresh() {
    const time = new Date().toISOString();
    setUtc(time);
    setEpochInput(time.slice(0, -1));
    setRevision((value) => value + 1);
    setNotice("Updated to the current time.");
  }

  function chooseLocation(selected: LocationPreset, updatePlaceOrigin = true) {
    const selectedElevation =
      typeof selected.elevation === "number" &&
      selected.elevation >= -500 &&
      selected.elevation <= 10000
        ? selected.elevation
        : 0;
    setLocation({
      latitude: selected.latitude,
      longitude: selected.longitude,
      elevation: selectedElevation,
    });
    setLatitude(String(selected.latitude));
    setLongitude(String(selected.longitude));
    setElevation(String(selectedElevation));
    setLocationName(selected.label);
    setTimezone(selected.timezone || deviceTimezone());
    if (updatePlaceOrigin) {
      setPlaceOrigin({
        ...selected,
        elevation: selectedElevation,
        timezone: selected.timezone || deviceTimezone(),
      });
    }
    setFormError("");
    setNotice(`Now calculating from ${selected.label}.`);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setFormError("Location access is unavailable in this browser.");
      return;
    }
    setLocating(true);
    setFormError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        chooseLocation({
          label: "Current device location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevation:
            position.coords.altitude !== null &&
            position.coords.altitude >= -500 &&
            position.coords.altitude <= 10000
              ? position.coords.altitude
              : 0,
          timezone: deviceTimezone(),
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setFormError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Search for a place instead."
            : "The device location could not be determined. Search for a place instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  function applyCoordinates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(latitude);
    const lon = Number(longitude);
    const elev = Number(elevation);
    const time = new Date(`${epochInput}Z`);
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !elevation.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(elev) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      elev < -500 ||
      elev > 10000 ||
      !Number.isFinite(time.getTime()) ||
      time.getUTCFullYear() < 2000 ||
      time.getUTCFullYear() > 2100
    ) {
      setFormError("Enter valid coordinates and a UTC date between 2000 and 2100.");
      return;
    }
    setLocation({ latitude: lat, longitude: lon, elevation: elev });
    setLocationName(
      lat === mqLocation.latitude && lon === mqLocation.longitude
        ? "Macquarie University"
        : "Custom observing location",
    );
    setTimezone(deviceTimezone());
    setPlaceOrigin({
      label:
        lat === mqLocation.latitude && lon === mqLocation.longitude
          ? "Macquarie University"
          : "Custom observing location",
      latitude: lat,
      longitude: lon,
      elevation: elev,
      timezone: deviceTimezone(),
    });
    setUtc(time.toISOString());
    setFormError("");
    setNotice("Custom coordinates and UTC time applied.");
  }

  const position = positions?.objects[target];
  const body = position?.data;
  const selectedDefinition = eventTargets.find((item) => item.id === target);
  const guidance = objectGuidance(target);
  const rise = scanEventTime(positions?.series[target], "r", timezone);
  const transit = scanEventTime(positions?.series[target], "t", timezone);
  const set = scanEventTime(positions?.series[target], "s", timezone);
  const currentWeather = weather?.data?.current;
  const searchValue: LocationPreset = {
    label: locationName,
    latitude: location.latitude,
    longitude: location.longitude,
    elevation: location.elevation,
    timezone,
  };
  const exactSearchIsSelected =
    location.latitude === placeOrigin.latitude &&
    location.longitude === placeOrigin.longitude;

  return (
    <div className="event-desk">
      <header className="event-header">
        <Link href="/" className="event-brand" aria-label="AstroScout home">
          <Telescope size={25} />
          AstroScout<span>.</span>
        </Link>
        <span className="event-edition">Macquarie University / Astronomy Night</span>
        <nav aria-label="Main navigation">
          {[
            ["/", "Tonight"],
            ["/places", "Explore places"],
            ["/calendar", "Calendar"],
            ["/observe", "Observe"],
            ["/journal", "Journal"],
            ["/method", "How it works"],
          ].map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
          <Link href="/join" className="event-join-link" aria-current={pathname === "/join" ? "page" : undefined}>
            <QrCode size={15} /> Phone QR
          </Link>
        </nav>
      </header>

      <div className="event-location-strip">
        <div>
          <MapPin size={17} />
          <strong>{locationName}</strong>
          <span>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.elevation.toFixed(0)} m
          </span>
        </div>
        <time dateTime={now || undefined}>
          {now ? localTime(now, timezone) : "Loading clock"}
          <small>{timezone}</small>
        </time>
      </div>

      <OfflineReady />

      {pathname === "/" && (
        <section className="saturn-hero" aria-labelledby="saturn-hero-heading">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://science.nasa.gov/wp-content/uploads/2023/05/saturn-farewell-pia21345-sse-banner-1920x640-1.jpg?w=1536"
            alt="Saturn and its rings photographed by NASA's Cassini spacecraft"
            fetchPriority="high"
          />
          <div className="saturn-hero__inner">
            <p>LOOK UP / {locationName.toUpperCase()}</p>
            <h1 id="saturn-hero-heading">Tonight&apos;s sky.</h1>
            <span>The Moon and planets, above your exact location.</span>
            <div className="saturn-hero__focus">
              <small>IN FOCUS</small>
              <strong>Saturn</strong>
              <span>
                {positionLoading
                  ? "Calculating the current view…"
                  : positions?.objects.saturn?.data
                    ? `${positions.objects.saturn.data.altitude.toFixed(1)}° altitude · ${positions.objects.saturn.data.compass}`
                    : "Position currently unavailable"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTarget("saturn");
                document.getElementById("where-to-look")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Saturn <Telescope size={18} />
            </button>
          </div>
          <a href="https://science.nasa.gov/saturn/" target="_blank" rel="noreferrer" className="saturn-hero__credit">
            Cassini image / NASA, JPL-Caltech, SSI
          </a>
        </section>
      )}

      <main id="event-content" className="event-main">
        {pathname !== "/" && (
          <div className="event-heading">
            <div>
              <p className="event-eyebrow">{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
              <p>{copy.intro}</p>
            </div>
          </div>
        )}

        {notice && <p className="event-notice" role="status">{notice}</p>}
        {formError && <p className="event-error" role="alert">{formError}</p>}

        {pathname === "/places" && (
          <>
            <section className="event-place-finder" aria-labelledby="location-search-heading">
              <div>
                <p className="event-kicker">SEARCH CENTRE</p>
                <h2 id="location-search-heading">Where should the search begin?</h2>
                <p>
                  Search a city, venue, landmark or address, or use your phone’s current location.
                </p>
              </div>
              <div className="event-place-finder__controls">
                <LocationSearch value={searchValue} onChange={chooseLocation} />
                <button className="event-secondary" type="button" onClick={useCurrentLocation} disabled={locating}>
                  {locating ? <Loader2 className="spin" size={17} /> : <LocateFixed size={17} />}
                  Use my location
                </button>
                <div className="event-place-finder__exact" aria-live="polite">
                  <MapPin size={18} aria-hidden="true" />
                  <span>
                    <small>Exact search point</small>
                    <strong>{placeOrigin.label}</strong>
                    <span>{placeOrigin.latitude.toFixed(5)}, {placeOrigin.longitude.toFixed(5)}</span>
                  </span>
                  {exactSearchIsSelected ? (
                    <span className="event-place-finder__selected-label"><Check size={15} /> Selected</span>
                  ) : (
                    <button type="button" onClick={() => chooseLocation(placeOrigin, false)}>
                      Use exact point
                    </button>
                  )}
                </div>
                <Link
                  className="event-primary event-link-button"
                  href="/"
                  onClick={() => chooseLocation(placeOrigin, false)}
                >
                  View tonight from this exact location
                </Link>
              </div>
            </section>
            <NearbyPlacesExplorer
              origin={placeOrigin}
              weather={weather}
              weatherLoading={weatherLoading}
              onSelect={(selected) => chooseLocation(selected, false)}
            />
            <CuratedSpotsMap />
          </>
        )}

        {pathname === "/join" && <PhoneJoin />}

        {pathname === "/journal" && (
          <ObservationJournal
            locationName={locationName}
            selectedTarget={target}
          />
        )}

        {pathname === "/calendar" && (
          <div className="event-calendar-page">
            <AstroCalendar
              onSelect={(time) => {
                setUtc(time);
                setEpochInput(time.slice(0, -1));
                setNotice(`Selected ${localTime(time, "UTC")} UTC.`);
              }}
            />
            <Link className="event-primary event-link-button" href="/">
              Inspect this night
            </Link>
          </div>
        )}

        {pathname === "/method" && (
          <><div className="event-method-grid">
            <section>
              <Database size={24} />
              <h2>Where the information comes from</h2>
              <ul>
                <li><strong>NASA/JPL Horizons</strong> calculates where Solar System objects appear in your sky.</li>
                <li><strong>Catalogue coordinates</strong> locate distant galaxies, nebulae and star clusters using local sidereal time.</li>
                <li><strong>Open-Meteo</strong> provides the cloud, rain, visibility, wind and temperature forecast.</li>
                <li><strong>Geoapify</strong> finds real places near your search and estimates the road journey.</li>
              </ul>
            </section>
            <section>
              <Compass size={24} />
              <h2>How a good viewing time is chosen</h2>
              <p>
                We look for a dark sky, an object at least 20° above the horizon, no more than 50% cloud, very little rain, at least 10 km visibility and manageable wind.
              </p>
              <p>
                The score favours a higher object, clearer skies and calmer wind. The rules are shown openly. This is a planning tool, not a visibility guarantee.
              </p>
            </section>
            <section className="event-method-wide">
              <Info size={24} />
              <h2>What you should still check</h2>
              <p>
                AstroScout cannot see local trees or buildings, measure light pollution at your exact spot, confirm that a place is open and safe, or promise a clear view. Always check access and conditions before leaving.
              </p>
            </section>
          </div><PreferenceSliders /></>
        )}

        {pathname === "/observe" && (
          <ReadinessGuide target={target} position={body} sunAltitude={positions?.objects.sun?.data?.altitude} weather={weather?.data} onTarget={setTarget} />
        )}

        {pathname === "/" && (
          <>
            <section className="event-session-card">
              <div>
                <span>Observer</span>
                <strong>{locationName}</strong>
                <small>{timezone}</small>
              </div>
              <div>
                <span>Requested time</span>
                <strong>{utc ? localTime(utc, timezone) : "Loading"}</strong>
                <small>{utc || "Preparing the time"}</small>
              </div>
              <div className="event-session-actions">
                <button className="event-primary" onClick={refresh} disabled={positionLoading}>
                  <RefreshCw size={16} />
                  Update to now
                </button>
                <Link href="/places">Change location</Link>
              </div>
            </section>

            <details className="event-settings">
              <summary>Advanced coordinates and UTC time</summary>
              <form onSubmit={applyCoordinates}>
                <label>
                  Latitude
                  <input type="number" step="any" min="-90" max="90" required value={latitude} onChange={(event) => setLatitude(event.target.value)} />
                </label>
                <label>
                  Longitude
                  <input type="number" step="any" min="-180" max="180" required value={longitude} onChange={(event) => setLongitude(event.target.value)} />
                </label>
                <label>
                  Elevation (m)
                  <input type="number" step="any" min="-500" max="10000" required value={elevation} onChange={(event) => setElevation(event.target.value)} />
                </label>
                <label>
                  UTC date and time
                  <input type="datetime-local" step="0.001" required value={epochInput} onChange={(event) => setEpochInput(event.target.value)} />
                </label>
                <button className="event-primary" type="submit" disabled={positionLoading}>
                  <Check size={16} /> Apply
                </button>
              </form>
            </details>

            {!positionLoading && positions && (
              <SkyPositionPanel
                snapshot={positions}
                target={target}
                locationName={locationName}
                timezone={timezone}
                weather={weather?.data}
                onTarget={setTarget}
                onEpoch={(time) => {
                  setUtc(time);
                  setEpochInput(time.slice(0, -1));
                  setNotice(`Showing the sky at ${localTime(time, timezone)}.`);
                }}
              />
            )}

            <section className="event-targets" aria-labelledby="target-heading">
              <div className="event-section-heading">
                <div>
                  <p className="event-kicker">01 / TARGET</p>
                  <h2 id="target-heading">Choose an object</h2>
                </div>
                <div className="event-view-mode" role="group" aria-label="Information detail">
                  <button type="button" aria-pressed={viewMode === "observer"} onClick={() => setViewMode("observer")}>Observer</button>
                  <button type="button" aria-pressed={viewMode === "astronomer"} onClick={() => setViewMode("astronomer")}>Astronomer</button>
                </div>
              </div>
              <div className="event-target-grid">
                {eventTargets.filter((item) => item.id !== "sun").map((item) => {
                  const targetPosition = positions?.objects[item.id]?.data;
                  return (
                    <button key={item.id} aria-pressed={target === item.id} onClick={() => setTarget(item.id)}>
                      <strong>{item.name}</strong>
                      <span>
                        {positionLoading
                          ? "Loading…"
                          : targetPosition
                          ? `${targetPosition.altitude.toFixed(1)}° altitude`
                            : "Position unavailable"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="event-live-grid">
              <section className="event-position-card" aria-busy={positionLoading}>
                <div className="event-section-heading">
                  <div>
                    <p className="event-kicker">02 / POSITION</p>
                    <h2>{eventTargets.find((item) => item.id === target)?.name}</h2>
                  </div>
                  <span>{position?.status === "available" ? "Calculated position" : selectedDefinition?.horizons ? "Unavailable" : "Catalogue guidance"}</span>
                </div>
                {positionLoading ? (
                  <p className="event-loading"><Loader2 className="spin" size={18} /> Checking the sky from your location…</p>
                ) : body ? (
                  <>
                    <p className="event-position-summary">
                      {body.altitude >= 0
                        ? `${body.name} is ${body.altitude.toFixed(1)}° above the ${body.compass} horizon.`
                        : `${body.name} is ${Math.abs(body.altitude).toFixed(1)}° below the ${body.compass} horizon.`}
                    </p>
                    <p className="event-horizon-note">Trees, hills and buildings near you may still block the view.</p>
                    {coordinateNote(selectedDefinition) && (
                      <p className="event-horizon-note">{coordinateNote(selectedDefinition)}</p>
                    )}
                    <div className="event-metrics">
                      <div><span>Altitude</span><strong>{body.altitude.toFixed(1)}°</strong></div>
                      <div><span>Direction</span><strong>{body.compass}</strong><small>{body.azimuth.toFixed(1)}° azimuth</small></div>
                      <div><span>Magnitude</span><strong>{metric(body.magnitude, "", 2)}</strong></div>
                      <div><span>Illumination</span><strong>{metric(body.illumination, "%", 1)}</strong></div>
                    </div>
                    {guidance && viewMode === "observer" && (
                      <div className="event-object-guidance">
                        <strong>Observing guidance</strong>
                        <p><b>{guidance.beginner}</b> · <b>Astrophotography: {guidance.astrophotography}</b></p>
                        <p>{guidance.starter}</p>
                        <p>{guidance.equipment}</p>
                        <p>{guidance.photography} <a href={smartphonePhotographyGuide} target="_blank" rel="noreferrer">Smartphone photography guide</a></p>
                        <a href={guidance.sourceUrl} target="_blank" rel="noreferrer">{guidance.sourceLabel} <ExternalLink size={13} /></a>
                        <a href={stellariumWeb} target="_blank" rel="noreferrer">Open in Stellarium Web <ExternalLink size={13} /></a>
                      </div>
                    )}
                    {viewMode === "astronomer" && (
                      <div className="event-technical">
                        <dl>
                          <div><dt>Right ascension</dt><dd>{metric(body.rightAscension, "°", 4)}</dd></div>
                          <div><dt>Declination</dt><dd>{metric(body.declination, "°", 4)}</dd></div>
                          <div><dt>Julian day</dt><dd>{body.julianDay.toFixed(6)}</dd></div>
                          <div><dt>Airmass</dt><dd>{airmass(body.altitude)}</dd></div>
                          <div><dt>Object type</dt><dd>{body.objectType}</dd></div>
                          <div><dt>Constellation</dt><dd>{body.constellation ?? catalogueConstellation(selectedDefinition) ?? "Unavailable"}</dd></div>
                          <div><dt>Rise</dt><dd>{rise}</dd></div>
                          <div><dt>Transit</dt><dd>{transit}</dd></div>
                          <div><dt>Set</dt><dd>{set}</dd></div>
                          <div><dt>Angular separation (Sun)</dt><dd>{metric(body.sunSeparation, "°", 1)}</dd></div>
                          <div><dt>Moon separation</dt><dd>{metric(body.moonSeparation, "°", 1)}</dd></div>
                          <div><dt>Requested UTC</dt><dd>{body.utc}</dd></div>
                          <div><dt>API version</dt><dd>{body.apiVersion}</dd></div>
                        </dl>
                        {body.requestUrl ? (
                          <a href={body.requestUrl} target="_blank" rel="noreferrer">Open the exact JPL request <ExternalLink size={14} /></a>
                        ) : (
                          <p>Position source: catalogue right ascension and declination, converted for this location and time.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : selectedDefinition && guidance ? (
                  <>
                    <p className="event-position-summary">
                      {selectedDefinition.name} is a catalogue target. Its static metadata and observing guidance are available here; this dashboard does not substitute a second astronomy engine for the authoritative JPL calculation.
                    </p>
                    <p className="event-horizon-note">Trees, hills and buildings near you may still block the view. AstroScout does not model local terrain line of sight.</p>
                    <div className="event-metrics">
                      <div><span>Object type</span><strong>{selectedDefinition.objectType}</strong></div>
                      <div><span>Constellation</span><strong>{catalogueConstellation(selectedDefinition) ?? "Varies"}</strong></div>
                    </div>
                    <div className="event-object-guidance">
                      <strong>Observing guidance</strong>
                      <p><b>{guidance.beginner}</b> · <b>Astrophotography: {guidance.astrophotography}</b></p>
                      <p>{guidance.starter}</p>
                      <p>{guidance.equipment}</p>
                      <p>{guidance.photography}</p>
                      <a href={guidance.sourceUrl} target="_blank" rel="noreferrer">{guidance.sourceLabel} <ExternalLink size={13} /></a>
                      <a href={stellariumWeb} target="_blank" rel="noreferrer">Open in Stellarium Web <ExternalLink size={13} /></a>
                    </div>
                  </>
                ) : (
                  <p className="event-error">We could not load the sky position: {positionError || position?.error}</p>
                )}
              </section>

              <section className="event-weather-card" aria-busy={weatherLoading}>
                <div className="event-section-heading">
                  <div>
                    <p className="event-kicker">03 / WEATHER</p>
                    <h2>Local forecast</h2>
                  </div>
                  <Cloud size={19} />
                </div>
                {weatherLoading ? (
                  <p className="event-loading"><Loader2 className="spin" size={18} /> Loading Open-Meteo…</p>
                ) : currentWeather ? (
                  <div className="event-weather-metrics">
                    <div><span>Cloud</span><strong>{metric(currentWeather.cloudCover, "%", 0)}</strong></div>
                    <div><span>Visibility</span><strong>{metric(currentWeather.visibility === null ? null : currentWeather.visibility / 1000, " km", 1)}</strong></div>
                    <div><span>Rain</span><strong>{metric(currentWeather.precipitation, " mm", 1)}</strong></div>
                    <div><span>Wind</span><strong>{metric(currentWeather.wind, " km/h", 1)}</strong></div>
                    <div><span>Temperature</span><strong>{metric(currentWeather.temperature, "°C", 1)}</strong></div>
                    <div><span>Humidity</span><strong>{metric(currentWeather.humidity, "%", 0)}</strong></div>
                  </div>
                ) : (
                  <p className="event-error">We could not load the local weather: {weather?.error}</p>
                )}
              </section>
            </div>

            {!positionLoading && positions && positions.objects[target]?.data && target !== "sun" && (
              <JplNightPanel
                snapshot={positions}
                target={target}
                weather={weather?.data}
                locationName={locationName}
                timezone={timezone}
                onEpoch={(time) => {
                  setUtc(time);
                  setEpochInput(time.slice(0, -1));
                  setNotice(`Showing the sky at ${localTime(time, timezone)}.`);
                }}
              />
            )}
            {!positionLoading && positions && <PassingThrough snapshot={positions} timezone={timezone} />}
            <section className="night-links"><div><p className="event-kicker">MAKE A NIGHT OF IT</p><h2>Take the plan outside.</h2><a href="https://science.nasa.gov/skywatching/" target="_blank" rel="noreferrer">NASA skywatching guides <ExternalLink size={14}/></a></div><div><p className="event-kicker">A LITTLE FIELD KNOWLEDGE</p><h2>Learn the sky as you go.</h2><a href={stellariumWeb} target="_blank" rel="noreferrer">Open Stellarium Web <ExternalLink size={14}/></a></div></section>
          </>
        )}
      </main>

      <footer className="event-footer">
        <span>AstroScout / Macquarie University Astronomy Night</span>
        <span>Solar System positions from NASA/JPL · Deep-sky positions from catalogue coordinates · Weather from Open-Meteo</span>
      </footer>
    </div>
  );
}
