"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarView } from "./CalendarView";
import { JplNightPanel } from "./JplNightPanel";
import { JplModelEvidence } from "./JplModelEvidence";
import { equipmentPresets, type Equipment } from "@/lib/observation-model";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Download,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Telescope,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { eventTargets, mqLocation } from "@/lib/event-types";
import type {
  EventLocation,
  EventObservation,
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  ImageAnalysis,
  JplPosition,
  SourceResult,
} from "@/lib/event-types";
import { analyseSkyImage, validateSkyImage } from "@/lib/sky-image";
import {
  eventLogKey,
  observationsCsv,
  readEventLog,
  saveEventLog,
} from "@/lib/event-log";
import "./EventDesk.css";

const localTime = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
const value = (number: number | null | undefined, suffix = "", digits = 1) =>
  number === null || number === undefined
    ? "Unavailable"
    : `${number.toFixed(digits)}${suffix}`;
function unavailable<T>(
  source: string,
  error: string,
  requestedAt: string,
): SourceResult<T> {
  return {
    status: "unavailable",
    source,
    requestedAt,
    receivedAt: new Date().toISOString(),
    data: null,
    error,
  };
}
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EventDesk({
  initialLocation = mqLocation,
  initialUtc,
}: { initialLocation?: EventLocation; initialUtc?: string } = {}) {
  const pathname = usePathname();
  const [now, setNow] = useState("");
  const [location, setLocation] = useState<EventLocation>(initialLocation);
  const [latitude, setLatitude] = useState(String(initialLocation.latitude));
  const [longitude, setLongitude] = useState(String(initialLocation.longitude));
  const [elevation, setElevation] = useState(String(initialLocation.elevation));
  const [equipment, setEquipment] = useState<Equipment>(
    equipmentPresets.telescope,
  );
  const [realObservationConfirmed, setRealObservationConfirmed] =
    useState(false);
  const [utc, setUtc] = useState("");
  const [epochInput, setEpochInput] = useState("");
  const [formError, setFormError] = useState("");
  const [target, setTarget] = useState<EventTarget>("saturn");
  const [positions, setPositions] = useState<HorizonsSnapshot>();
  const [positionError, setPositionError] = useState("");
  const [snapshotRequestedAt, setSnapshotRequestedAt] = useState("");
  const [weather, setWeather] = useState<SourceResult<EventWeather>>();
  const [positionLoading, setPositionLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [uploadedAt, setUploadedAt] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [fileError, setFileError] = useState("");
  const [validating, setValidating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<ImageAnalysis>();
  const [analysisError, setAnalysisError] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysisAttempted, setAnalysisAttempted] = useState(false);
  const [notes, setNotes] = useState("");
  const [log, setLog] = useState<EventObservation[]>([]);
  const [storageError, setStorageError] = useState("");
  const [rawLog, setRawLog] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const firstTarget = useRef<HTMLButtonElement>(null);
  const uploadGeneration = useRef(0);
  const analysisController = useRef<AbortController>();
  const requestGeneration = useRef(0);
  const saving = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("utc") || initialUtc;
    const time =
      requested &&
      Number.isFinite(Date.parse(requested)) &&
      requested.endsWith("Z")
        ? new Date(requested).toISOString()
        : new Date().toISOString();
    if (params.has("lat") && params.has("lon")) {
      const lat = Number(params.get("lat")),
        lon = Number(params.get("lon")),
        elev = Number(params.get("elevation") || 0);
      if (
        params.get("lat")?.trim() &&
        params.get("lon")?.trim() &&
        (!params.has("elevation") || params.get("elevation")?.trim()) &&
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
      } else
        setFormError(
          "Invalid location in the link. The displayed default location is active.",
        );
    }
    setNow(new Date().toISOString());
    setUtc(time);
    setEpochInput(time.slice(0, -1));
    const interval = window.setInterval(
      () => setNow(new Date().toISOString()),
      1000,
    );
    try {
      const raw = localStorage.getItem(eventLogKey);
      setRawLog(raw);
      setLog(readEventLog(raw));
      setStorageReady(true);
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : "Browser storage is unavailable.",
      );
    }
    return () => {
      clearInterval(interval);
      analysisController.current?.abort();
      uploadGeneration.current++;
    };
  }, []);

  useEffect(() => {
    const id =
      pathname === "/journal"
        ? "log-heading"
        : pathname === "/method"
          ? "jpl-model"
          : "event-content";
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, [pathname]);

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
    setRecorded(false);
    const requestedAt = new Date().toISOString();
    setSnapshotRequestedAt(requestedAt);
    let positionsDone = false;
    let weatherDone = false;
    let timeout: number;
    async function loadPositions() {
      try {
        const response = await fetch(`/api/event/horizons?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (
          !data.objects ||
          data.utc !== utc ||
          data.location.latitude !== location.latitude ||
          data.location.longitude !== location.longitude ||
          data.location.elevation !== location.elevation
        )
          throw new Error(
            data.error ?? "JPL did not return the requested snapshot.",
          );
        if (generation === requestGeneration.current) setPositions(data);
      } catch (error) {
        if (
          generation === requestGeneration.current &&
          !controller.signal.aborted
        )
          setPositionError(
            error instanceof Error ? error.message : "JPL request failed.",
          );
      } finally {
        positionsDone = true;
        if (weatherDone) clearTimeout(timeout);
        if (generation === requestGeneration.current) setPositionLoading(false);
      }
    }
    async function loadWeather() {
      try {
        const response = await fetch(`/api/event/weather?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!["available", "unavailable"].includes(data.status))
          throw new Error(data.error ?? "Weather response was invalid.");
        if (generation === requestGeneration.current) setWeather(data);
      } catch (error) {
        if (
          generation === requestGeneration.current &&
          !controller.signal.aborted
        )
          setWeather(
            unavailable(
              "Open-Meteo API",
              error instanceof Error
                ? error.message
                : "Weather request failed.",
              requestedAt,
            ),
          );
      } finally {
        weatherDone = true;
        if (positionsDone) clearTimeout(timeout);
        if (generation === requestGeneration.current) setWeatherLoading(false);
      }
    }
    void loadPositions();
    void loadWeather();
    timeout = window.setTimeout(() => {
      if (generation !== requestGeneration.current) return;
      controller.abort();
      setPositionLoading(false);
      setWeatherLoading(false);
      if (!positionsDone)
        setPositionError(
          "The request timed out. Please refresh the live data.",
        );
      if (!weatherDone)
        setWeather(
          unavailable(
            "Open-Meteo API",
            "Weather request timed out.",
            requestedAt,
          ),
        );
    }, 110000);
    return () => {
      controller.abort();
      clearTimeout(timeout);
      requestGeneration.current++;
    };
  }, [location, utc, revision]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function refresh() {
    const time = new Date().toISOString();
    setUtc(time);
    setEpochInput(time.slice(0, -1));
    setRevision((r) => r + 1);
  }
  function removeImage() {
    setRealObservationConfirmed(false);
    uploadGeneration.current++;
    analysisController.current?.abort();
    setFile(undefined);
    setAnalysis(undefined);
    setAnalysisError("");
    setFileError("");
    setAnalysing(false);
    setAnalysisAttempted(false);
    setRecorded(false);
    setCapturedAt("");
    setValidating(false);
  }
  async function chooseImage(files: FileList | File[]) {
    removeImage();
    if (files.length !== 1) {
      setFileError("Choose one sky image at a time.");
      return;
    }
    const selected = files[0];
    const generation = ++uploadGeneration.current;
    setValidating(true);
    try {
      await validateSkyImage(selected);
      if (generation !== uploadGeneration.current) return;
      setFile(selected);
      setUploadedAt(new Date().toISOString());
    } catch (error) {
      if (generation === uploadGeneration.current)
        setFileError(
          error instanceof Error ? error.message : "Unable to read image.",
        );
    } finally {
      if (generation === uploadGeneration.current) setValidating(false);
    }
  }
  async function analyse() {
    if (!file || analysing) return;
    analysisController.current?.abort();
    const controller = new AbortController();
    analysisController.current = controller;
    const generation = uploadGeneration.current;
    setAnalysing(true);
    setAnalysisError("");
    setAnalysis(undefined);
    setAnalysisAttempted(true);
    setRecorded(false);
    try {
      const result = await analyseSkyImage(file, controller.signal);
      if (generation === uploadGeneration.current && !controller.signal.aborted)
        setAnalysis(result);
    } catch (error) {
      if (generation === uploadGeneration.current && !controller.signal.aborted)
        setAnalysisError(
          error instanceof Error ? error.message : "OpenCV analysis failed.",
        );
    } finally {
      if (generation === uploadGeneration.current && !controller.signal.aborted)
        setAnalysing(false);
    }
  }
  function persist(next: EventObservation[]) {
    try {
      saveEventLog(localStorage, next);
      setLog(next);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError((error as Error).message);
      return false;
    }
  }
  function record(found: boolean) {
    if (
      !file ||
      !analysisAttempted ||
      analysing ||
      positionLoading ||
      weatherLoading ||
      recorded ||
      !storageReady ||
      saving.current ||
      target === "sun"
    )
      return;
    if (
      capturedAt &&
      (!Number.isFinite(Date.parse(`${capturedAt}Z`)) ||
        Date.parse(`${capturedAt}Z`) > Date.now())
    ) {
      setFileError("The image capture time must be a valid past UTC time.");
      return;
    }
    saving.current = true;
    const recordedAt = new Date().toISOString();
    const next: EventObservation = {
      version: 1,
      id: crypto.randomUUID(),
      source: "User-recorded observation",
      target,
      observedAt: recordedAt,
      recordedAt,
      location: { ...location },
      requestedPositionUtc: utc,
      position:
        positions?.objects[target] ??
        unavailable<JplPosition>(
          "NASA/JPL Horizons API",
          positionError || "Position unavailable.",
          snapshotRequestedAt,
        ),
      weather:
        weather ??
        unavailable<EventWeather>(
          "Open-Meteo API",
          "Weather unavailable.",
          snapshotRequestedAt,
        ),
      image: {
        filename: file.name,
        type: file.type,
        bytes: file.size,
        uploadedAt,
        capturedAt: capturedAt
          ? new Date(`${capturedAt}Z`).toISOString()
          : null,
      },
      analysis: analysis ?? null,
      analysisError: analysisError || null,
      found,
      notes: notes.trim(),
      context: {
        schemaVersion: 2,
        sun:
          positions?.objects.sun ??
          unavailable<JplPosition>(
            "NASA/JPL Horizons API",
            "NASA/JPL data unavailable",
            snapshotRequestedAt,
          ),
        moon:
          positions?.objects.moon ??
          unavailable<JplPosition>(
            "NASA/JPL Horizons API",
            "NASA/JPL data unavailable",
            snapshotRequestedAt,
          ),
        equipment: { ...equipment },
        realObservationConfirmed,
        location: { ...location },
      },
    };
    if (persist([next, ...log])) {
      setRecorded(true);
      setNotice("Observation saved on this browser.");
    }
    saving.current = false;
  }
  const position = positions?.objects[target];
  const p = position?.data;
  const w = weather?.data?.current;
  const positionOld = Boolean(
    now && utc && Math.abs(Date.parse(now) - Date.parse(utc)) > 300000,
  );
  const weatherOld = Boolean(
    now && w && Date.parse(now) - Date.parse(w.time) > 1800000,
  );
  const canRecord = Boolean(
    file &&
      analysisAttempted &&
      !analysing &&
      !positionLoading &&
      !weatherLoading &&
      storageReady &&
      !recorded &&
      target !== "sun",
  );
  const atMq =
    location.latitude === mqLocation.latitude &&
    location.longitude === mqLocation.longitude;

  return (
    <div
      className={`event-desk ${pathname === "/observe" ? "jpl-observe-view" : "jpl-plan-view"}`}
    >
      <a className="skip-link" href="#event-content">
        Skip to observing desk
      </a>
      <header className="event-header">
        <Link href="/" className="event-brand">
          <Telescope size={27} />
          AstroScout<span>.</span>
        </Link>
        <span className="event-edition">
          Macquarie University / Astronomy Night
        </span>
        <nav className="jpl-navigation" aria-label="Main navigation">
          {[
            ["/", "Tonight"],
            ["/planner", "Night planner"],
            ["/observe", "Observe"],
            ["/places", "Places"],
            ["/calendar", "Calendar"],
            ["/journal", "Journal"],
            ["/method", "The science"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="event-location-strip">
        <div>
          <MapPin size={19} />
          <strong>
            {atMq ? "Macquarie University" : "Custom observing location"}
          </strong>
          <span>
            {location.latitude}, {location.longitude} / elevation{" "}
            {location.elevation} m
          </span>
        </div>
        <time dateTime={now || undefined}>
          {now ? localTime(now) : "Loading clock"}
          <small>Australia/Sydney / device clock</small>
        </time>
      </div>
      <main id="event-content" className="event-main">
        <div className="event-heading">
          <div>
            <p className="event-eyebrow">The observing desk</p>
            <h1>
              {pathname === "/journal"
                ? "Observation journal"
                : pathname === "/method"
                  ? "The science"
                  : pathname === "/calendar"
                    ? "Observing calendar"
                    : pathname === "/observe"
                      ? "Your observing attempt"
                      : "Astronomy Night"}
            </h1>
          </div>
          <button
            className="event-primary"
            onClick={refresh}
            disabled={positionLoading || weatherLoading}
          >
            <RefreshCw size={18} />
            Refresh to now
          </button>
        </div>
        <details className="event-settings">
          <summary>Location &amp; ephemeris time</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const lat = Number(latitude),
                lon = Number(longitude),
                elev = Number(elevation),
                time = new Date(`${epochInput}Z`);
              if (
                !latitude.trim() ||
                !longitude.trim() ||
                !elevation.trim() ||
                !Number.isFinite(elev) ||
                elev < -500 ||
                elev > 10000 ||
                !Number.isFinite(lat) ||
                !Number.isFinite(lon) ||
                Math.abs(lat) > 90 ||
                Math.abs(lon) > 180 ||
                !Number.isFinite(time.getTime()) ||
                time.getUTCFullYear() < 2000 ||
                time.getUTCFullYear() > 2100
              ) {
                setFormError(
                  "Enter valid coordinates and a UTC date between 2000 and 2100.",
                );
                return;
              }
              setFormError("");
              setLocation({ latitude: lat, longitude: lon, elevation: elev });
              setUtc(time.toISOString());
            }}
          >
            <label>
              Latitude
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </label>
            <label>
              Elevation above reference ellipsoid (m)
              <input
                type="number"
                step="any"
                min="-500"
                max="10000"
                required
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
              />
            </label>
            <label>
              Position date &amp; time (UTC)
              <input
                type="datetime-local"
                step="0.001"
                required
                value={epochInput}
                onChange={(e) => setEpochInput(e.target.value)}
              />
            </label>
            <button type="submit" disabled={positionLoading || weatherLoading}>
              Apply <Check size={17} />
            </button>
          </form>
          {formError && (
            <p role="alert" className="event-error">
              {formError}
            </p>
          )}
          <p>
            Elevation defaults to 0 m; enter your known elevation for the
            calculation. Open-Meteo weather-forecast data is separate from JPL
            astronomy. Historical dates may have no matching forecast.
          </p>
        </details>
        {pathname === "/calendar" && (
          <CalendarView
            utc={utc}
            onSelect={(time) => {
              setUtc(time);
              setEpochInput(time.slice(0, -1));
            }}
          />
        )}
        <div className="event-session-summary">
          <a href="#weather-heading">
            <Cloud size={18} />
            <span>
              Open-Meteo:{" "}
              {weatherLoading
                ? "loading weather"
                : w
                  ? `${value(w.cloudCover, "%", 0)} cloud cover${weatherOld ? " / old forecast" : ""}`
                  : "weather unavailable"}
            </span>
          </a>
          <Link href="/journal">
            <Telescope size={18} />
            Observation log: {log.length}{" "}
            {log.length === 1 ? "report" : "reports"}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div
          className="event-workspace"
          hidden={pathname === "/journal" || pathname === "/method"}
        >
          <section
            className="event-target-section"
            aria-labelledby="target-heading"
          >
            <div className="event-section-heading">
              <h2 id="target-heading">
                <span>01</span>Select target
              </h2>
              <span className="event-source">NASA/JPL Horizons API</span>
            </div>
            <div
              className="event-targets"
              role="group"
              aria-label="Select target"
            >
              {eventTargets.map((item, index) => (
                <button
                  ref={index === 0 ? firstTarget : undefined}
                  key={item.id}
                  aria-pressed={target === item.id}
                  onClick={() => {
                    setTarget(item.id);
                    setRealObservationConfirmed(false);
                    setRecorded(false);
                    setNotice("");
                  }}
                >
                  <span>{item.name}</span>
                  <small>
                    {positionLoading
                      ? "Loading"
                      : positions?.objects[item.id]?.data
                        ? `${positions.objects[item.id].data!.altitude.toFixed(1)}° altitude`
                        : "Unavailable"}
                  </small>
                </button>
              ))}
            </div>
            {pathname !== "/observe" && (
              <JplNightPanel
                snapshot={positions}
                target={target}
                weather={weather?.data}
                locationName={
                  atMq ? "Macquarie University" : "your selected location"
                }
                onEpoch={(time) => {
                  setUtc(time);
                  setEpochInput(time.slice(0, -1));
                }}
              />
            )}
            <div className="event-position" aria-busy={positionLoading}>
              <div className="event-target-title">
                <h3>{eventTargets.find((item) => item.id === target)!.name}</h3>
                {p && (
                  <span
                    className={
                      p.altitude > 0 ? "event-status" : "event-status muted"
                    }
                  >
                    {p.altitude > 0
                      ? "Above geometric horizon"
                      : "Below geometric horizon"}
                  </span>
                )}
              </div>
              {positionLoading ? (
                <p role="status">
                  <Loader2 className="event-spin" size={18} />
                  Requesting observer positions from JPL...
                </p>
              ) : p ? (
                <>
                  <div className="event-angle-pair">
                    <div>
                      <strong>
                        {p.altitude.toFixed(2)}
                        <span>°</span>
                      </strong>
                      <span>Altitude</span>
                    </div>
                    <div>
                      <strong>
                        {p.azimuth.toFixed(2)}
                        <span>°</span>
                      </strong>
                      <span>Azimuth / {p.compass}</span>
                    </div>
                  </div>
                  <dl className="event-small-data">
                    <div>
                      <dt>Apparent RA</dt>
                      <dd>{value(p.rightAscension, "°", 3)}</dd>
                    </div>
                    <div>
                      <dt>Declination</dt>
                      <dd>{value(p.declination, "°", 3)}</dd>
                    </div>
                    <div>
                      <dt>Apparent magnitude</dt>
                      <dd>{value(p.magnitude, "", 2)}</dd>
                    </div>
                    <div>
                      <dt>Illuminated disk</dt>
                      <dd>{value(p.illumination, "%")}</dd>
                    </div>
                  </dl>
                  <p className="event-footnote">
                    JPL-calculated, airless apparent positions. Compass
                    direction is derived from JPL azimuth. Local trees and
                    buildings are not included.
                  </p>
                  <details>
                    <summary>
                      Epoch, response &amp; rise/set information
                    </summary>
                    <dl className="event-provenance">
                      <dt>Exact requested UTC</dt>
                      <dd>{p.utc}</dd>
                      <dt>Australia/Sydney</dt>
                      <dd>{localTime(p.utc)}</dd>
                      <dt>API response received</dt>
                      <dd>{position!.receivedAt}</dd>
                      <dt>JPL event marker</dt>
                      <dd>{p.eventMarker ?? "Unavailable at this epoch"}</dd>
                      <dt>Rise / set times</dt>
                      <dd>
                        Exact rise/set events are not calculated by this sampled
                        scan
                      </dd>
                      <dt>API version</dt>
                      <dd>{p.apiVersion}</dd>
                    </dl>
                  </details>
                </>
              ) : (
                <div className="event-error" role="alert">
                  <strong>NASA/JPL data unavailable</strong>
                  <p>
                    {position?.error ||
                      positionError ||
                      "JPL returned no usable position."}
                  </p>
                  <p>No local replacement positions are shown.</p>
                </div>
              )}
              <p className="event-epoch">
                UTC {utc || "Pending"}
                <br />
                {utc ? `${localTime(utc)} Australia/Sydney` : ""}
              </p>
              {positionOld && (
                <p className="event-warning">
                  Selected epoch is not current (more than 5 minutes from now).
                  These positions must not be treated as the present sky.
                </p>
              )}
              {target === "sun" && (
                <p className="event-warning">
                  <strong>Sun position is for context only.</strong> Never look
                  at the Sun through an unfiltered telescope, binoculars or
                  camera. Solar observing is not supported here.
                </p>
              )}
            </div>
          </section>
          <section
            className="event-upload-section"
            hidden={pathname !== "/observe"}
            aria-labelledby="upload-heading"
          >
            <div className="event-section-heading">
              <h2 id="upload-heading">
                <span>02</span>Your sky image
              </h2>
              <span className="event-source">Uploaded visitor image</span>
            </div>
            <input
              ref={imageInput}
              className="event-file-input"
              aria-label="Choose sky image"
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              onChange={(e) => {
                if (e.target.files?.length) void chooseImage(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              className={`event-dropzone ${dragging ? "dragging" : ""} ${preview ? "has-image" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void chooseImage(e.dataTransfer.files);
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={`Uploaded visitor sky image: ${file?.name}`}
                />
              ) : (
                <div>
                  <ImagePlus size={38} strokeWidth={1.3} />
                  <h3>Bring your own view of the sky.</h3>
                  <p>
                    Take a photo outside at the event using a phone or camera,
                    transfer it to this laptop, then upload it here.
                  </p>
                  <button
                    className="event-primary"
                    onClick={() => imageInput.current?.click()}
                    disabled={validating}
                  >
                    <Upload size={18} />
                    {validating ? "Checking image..." : "Upload sky image"}
                  </button>
                  <small>Or drag and drop / JPG, JPEG, PNG / up to 20 MB</small>
                </div>
              )}
            </div>
            {fileError && (
              <p className="event-error" role="alert">
                {fileError}
              </p>
            )}
            {file && (
              <>
                <div className="event-image-actions">
                  <span>{file.name}</span>
                  <button onClick={() => imageInput.current?.click()}>
                    <Upload size={17} />
                    Upload another image
                  </button>
                  <button
                    aria-label="Remove image"
                    title="Remove image"
                    onClick={removeImage}
                  >
                    <X size={18} />
                  </button>
                </div>
                <label className="event-capture-time">
                  Photo taken at (UTC, optional)
                  <input
                    type="datetime-local"
                    step="1"
                    value={capturedAt}
                    onChange={(e) => {
                      setCapturedAt(e.target.value);
                      setRecorded(false);
                    }}
                  />
                </label>
              </>
            )}
            <div className="event-analysis-action">
              <button
                className="event-primary"
                disabled={!file || analysing || validating}
                onClick={() => void analyse()}
              >
                {analysing ? (
                  <Loader2 className="event-spin" size={18} />
                ) : (
                  <ImagePlus size={18} />
                )}
                {analysing ? "Analysing image..." : "Analyse image"}
              </button>
              <span>
                Processed on this laptop. Images are not sent to an API.
              </span>
            </div>
            {analysisError && (
              <p className="event-error" role="alert">
                OpenCV analysis unavailable: {analysisError}
              </p>
            )}
            {analysis && (
              <div className="event-analysis" aria-live="polite">
                <h3>Analysis of uploaded image</h3>
                <span className="event-source">
                  OpenCV analysis of uploaded image
                </span>
                <dl className="event-small-data">
                  <div>
                    <dt>Mean brightness (0-255)</dt>
                    <dd>
                      {analysis.brightness} /{" "}
                      {analysis.brightness < 40
                        ? "low"
                        : analysis.brightness > 200
                          ? "high"
                          : "moderate"}
                    </dd>
                  </div>
                  <div>
                    <dt>Contrast (pixel std. dev.)</dt>
                    <dd>{analysis.contrast}</dd>
                  </div>
                  <div>
                    <dt>Sharpness (Laplacian variance)</dt>
                    <dd>{analysis.laplacianVariance}</dd>
                  </div>
                  <div>
                    <dt>Dark pixels (not confirmed sky)</dt>
                    <dd>{analysis.darkPixelPercent}%</dd>
                  </div>
                  <div>
                    <dt>Cloud-candidate pixels</dt>
                    <dd>{analysis.cloudCandidatePercent}%</dd>
                  </div>
                  <div>
                    <dt>Edge density</dt>
                    <dd>{analysis.edgePercent}%</dd>
                  </div>
                </dl>
                <p className="event-warning">
                  Cloud candidates are bright, low-saturation pixels, not
                  measured sky cloud coverage. Glare, buildings and exposure can
                  produce the same signal. Obstruction cannot be confirmed.
                </p>
                <ul>
                  {analysis.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <p className="event-footnote">
                  Suitability: {analysis.suitability}. Analysed at{" "}
                  {analysis.width} × {analysis.height} px. This is an
                  image-quality estimate, not confirmed object identification.
                </p>
              </div>
            )}
          </section>
          <section
            className="event-weather-section"
            aria-labelledby="weather-heading"
          >
            <div className="event-section-heading">
              <h2 id="weather-heading">
                <Cloud size={21} />
                Local weather
              </h2>
              <span className="event-source">Open-Meteo API</span>
            </div>
            {weatherLoading ? (
              <p role="status">
                <Loader2 className="event-spin" size={18} />
                Loading current weather...
              </p>
            ) : w ? (
              <>
                <dl className="event-weather-grid">
                  <div>
                    <dt>Cloud cover</dt>
                    <dd>{value(w.cloudCover, "%", 0)}</dd>
                  </div>
                  <div>
                    <dt>Temperature</dt>
                    <dd>{value(w.temperature, " °C")}</dd>
                  </div>
                  <div>
                    <dt>Precipitation</dt>
                    <dd>{value(w.precipitation, " mm")}</dd>
                  </div>
                  <div>
                    <dt>Visibility</dt>
                    <dd>
                      {value(
                        w.visibility === null ? null : w.visibility / 1000,
                        " km",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Wind</dt>
                    <dd>{value(w.wind, " km/h")}</dd>
                  </div>
                  <div>
                    <dt>Humidity</dt>
                    <dd>{value(w.humidity, "%", 0)}</dd>
                  </div>
                  <div>
                    <dt>WMO weather code</dt>
                    <dd>{value(w.weatherCode, "", 0)}</dd>
                  </div>
                </dl>
                <p className="event-footnote">
                  Current model estimate, not an on-site sensor.
                  <br />
                  Valid: {localTime(w.time)} Australia/Sydney
                  <br />
                  UTC: {w.time}
                  <br />
                  API response received: {weather!.receivedAt}
                </p>
                {weatherOld && (
                  <p className="event-warning">
                    Weather timestamp is over 30 minutes old. Refresh before
                    comparing.
                  </p>
                )}
                <details>
                  <summary>Hourly forecast &amp; grid coordinates</summary>
                  <p>
                    Provider grid: {weather!.data!.gridLatitude},{" "}
                    {weather!.data!.gridLongitude}. Requested location:{" "}
                    {location.latitude}, {location.longitude}.
                  </p>
                  <div className="event-table-scroll">
                    <table>
                      <caption>Open-Meteo hourly forecast (UTC)</caption>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Cloud %</th>
                          <th>Rain mm</th>
                          <th>Visibility m</th>
                          <th>Temp °C</th>
                          <th>Wind km/h</th>
                          <th>Humidity %</th>
                          <th>WMO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weather!
                          .data!.hourly.filter(
                            (row) =>
                              Date.parse(row.time) >=
                              Date.parse(w.time) - 3600000,
                          )
                          .slice(0, 8)
                          .map((row) => (
                            <tr key={row.time}>
                              <td>{row.time}</td>
                              <td>{value(row.cloudCover)}</td>
                              <td>{value(row.precipitation)}</td>
                              <td>{value(row.visibility)}</td>
                              <td>{value(row.temperature)}</td>
                              <td>{value(row.wind)}</td>
                              <td>{value(row.humidity)}</td>
                              <td>{value(row.weatherCode, "", 0)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <div className="event-error" role="alert">
                <strong>Live weather unavailable</strong>
                <p>{weather?.error || "No weather response was received."}</p>
                <p>No replacement weather is generated.</p>
              </div>
            )}
          </section>
          <section
            className="event-record-section"
            hidden={pathname !== "/observe"}
            aria-labelledby="record-heading"
          >
            <div className="event-section-heading">
              <h2 id="record-heading">
                <span>03</span>What did you find?
              </h2>
              <span className="event-source">User-recorded observation</span>
            </div>
            <div className="event-comparison">
              <p>
                <strong>Expected position / JPL:</strong>{" "}
                {p
                  ? `${p.name}, ${value(p.altitude, "°")} altitude, ${value(p.azimuth, "°")} azimuth (${p.compass}) at ${p.utc}.`
                  : "Unavailable."}
              </p>
              <p>
                <strong>Regional weather / Open-Meteo:</strong>{" "}
                {w
                  ? `${value(w.cloudCover, "%")} cloud cover at ${w.time}.`
                  : "Unavailable."}
              </p>
              <p>
                <strong>Your image / OpenCV:</strong>{" "}
                {analysis
                  ? `${analysis.cloudCandidatePercent}% cloud-candidate pixels; ${analysis.darkPixelPercent}% dark pixels.`
                  : "Not analysed."}
              </p>
              <p className="event-footnote">
                These describe different areas and may describe different times.
                Camera direction and field of view are unknown; the image is not
                matched to the selected object. Capture time is
                visitor-supplied, not verified from EXIF.
              </p>
            </div>
            <div className="jpl-equipment">
              <label>
                Equipment
                <select
                  value={equipment.kind}
                  onChange={(e) => {
                    setEquipment(
                      equipmentPresets[e.target.value as Equipment["kind"]],
                    );
                    setRealObservationConfirmed(false);
                  }}
                >
                  <option value="eye">Unaided eye</option>
                  <option value="binoculars">Binoculars</option>
                  <option value="telescope">Telescope</option>
                </select>
              </label>
              <label>
                Aperture (mm)
                <input
                  type="number"
                  min="7"
                  max="500"
                  disabled={equipment.kind === "eye"}
                  value={equipment.aperture}
                  onChange={(e) => {
                    setEquipment({
                      ...equipment,
                      aperture: Number(e.target.value),
                    });
                    setRealObservationConfirmed(false);
                  }}
                />
              </label>
              <label>
                Magnification
                <input
                  type="number"
                  min="1"
                  max="500"
                  disabled={equipment.kind === "eye"}
                  value={equipment.magnification}
                  onChange={(e) => {
                    setEquipment({
                      ...equipment,
                      magnification: Number(e.target.value),
                    });
                    setRealObservationConfirmed(false);
                  }}
                />
              </label>
            </div>
            <label className="jpl-confirmation">
              <input
                type="checkbox"
                checked={realObservationConfirmed}
                onChange={(e) => setRealObservationConfirmed(e.target.checked)}
              />
              This is my real observing attempt here now, not a reference image
              or a demonstration.
            </label>
            <label>
              Visitor notes (optional)
              <textarea
                maxLength={2000}
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setRecorded(false);
                }}
                placeholder="Equipment used, obstructions, what you could see..."
              />
            </label>
            <div className="event-record-actions">
              <button
                className="event-primary"
                disabled={!canRecord}
                onClick={() => record(true)}
              >
                <Check size={19} />I found it
              </button>
              <button disabled={!canRecord} onClick={() => record(false)}>
                <X size={19} />I could not find it
              </button>
            </div>
            {!file && (
              <p className="event-footnote">
                Upload a real image and attempt analysis before recording. API
                or analysis failures will be saved explicitly as unavailable.
              </p>
            )}
            <p className="event-footnote">
              The observation time is the time you press a result button. Your
              report is not an automated identification or a verified ML
              training label.
            </p>
            {notice && (
              <p className="event-notice" role="status">
                {notice}
              </p>
            )}
            <button
              className="event-text-button"
              onClick={() => {
                removeImage();
                setNotes("");
                setNotice("");
                firstTarget.current?.focus();
              }}
            >
              <ArrowLeft size={17} />
              Try another target
            </button>
          </section>
        </div>
        <div hidden={pathname === "/journal" || pathname === "/calendar"}>
          <JplModelEvidence
            log={log}
            snapshot={positions}
            weather={weather}
            target={target}
            equipment={equipment}
            now={now}
          />
        </div>
        <section
          className="event-log-section"
          aria-labelledby="log-heading"
          hidden={pathname !== "/journal" && pathname !== "/observe"}
        >
          <div className="event-section-heading">
            <h2 id="log-heading">
              Observation history{" "}
              <span className="event-count">{log.length}</span>
            </h2>
            <div className="event-log-actions">
              <button
                disabled={!log.length}
                onClick={() =>
                  download(
                    JSON.stringify(
                      {
                        schemaVersion: 1,
                        exportedAt: new Date().toISOString(),
                        observations: log,
                      },
                      null,
                      2,
                    ),
                    "astroscout-observations.json",
                    "application/json",
                  )
                }
              >
                <Download size={17} />
                Export JSON
              </button>
              <button
                disabled={!log.length}
                onClick={() =>
                  download(
                    observationsCsv(log),
                    "astroscout-observations.csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={17} />
                Export CSV
              </button>
              <button
                disabled={!log.length && !rawLog}
                onClick={() => {
                  if (
                    window.confirm(
                      "Clear all observations on this browser? Export them first to keep a copy.",
                    )
                  ) {
                    if (persist([])) {
                      setRawLog(null);
                      setStorageReady(true);
                      setNotice("Observation history cleared.");
                    }
                  }
                }}
              >
                <Trash2 size={17} />
                Clear all observations
              </button>
            </div>
          </div>
          {storageError && (
            <div className="event-error" role="alert">
              {storageError}
              {rawLog && (
                <button
                  onClick={() =>
                    download(
                      rawLog,
                      "astroscout-stored-data-recovery.json",
                      "application/json",
                    )
                  }
                >
                  Export stored data for recovery
                </button>
              )}
            </div>
          )}
          {!log.length ? (
            <p className="event-empty">
              No observations recorded on this browser yet.
            </p>
          ) : (
            <div className="event-history">
              {(showAll ? log : log.slice(0, 5)).map((row) => (
                <article key={row.id}>
                  <div>
                    <strong>
                      {
                        eventTargets.find((item) => item.id === row.target)
                          ?.name
                      }
                    </strong>
                    <span
                      className={`event-result ${row.found ? "found" : ""}`}
                    >
                      {row.found ? "Found" : "Not found"}
                    </span>
                    <time dateTime={row.recordedAt}>
                      {localTime(row.recordedAt)} Australia/Sydney
                    </time>
                    <span>
                      {row.location.latitude}, {row.location.longitude}
                    </span>
                  </div>
                  <p>
                    {row.image.filename} / JPL: {row.position.status} / Weather:{" "}
                    {row.weather.status} / Image analysis:{" "}
                    {row.analysis ? "available" : "unavailable"}
                  </p>
                  {row.notes && <p>{row.notes}</p>}
                  <details>
                    <summary>Saved source snapshot</summary>
                    <pre>{JSON.stringify(row, null, 2)}</pre>
                  </details>
                  <button
                    className="event-delete"
                    title="Delete observation"
                    aria-label={`Delete ${row.target} observation ${row.id}`}
                    onClick={() => {
                      if (window.confirm("Delete this observation?"))
                        persist(log.filter((item) => item.id !== row.id));
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          )}
          {log.length > 5 && (
            <button onClick={() => setShowAll((show) => !show)}>
              {showAll
                ? "Show recent observations"
                : `View all ${log.length} observations`}
            </button>
          )}
          <p className="event-footnote">
            Stored only in this browser. Export before closing a private session
            or clearing browser data. Logs retain filenames and measurements,
            not image files. Notes and location are included in exports.
          </p>
        </section>
        <details className="event-sources">
          <summary>
            <Info size={18} />
            View data sources
          </summary>
          <div>
            <h2>Evidence, kept separate.</h2>
            <p>
              <a
                href="https://ssd-api.jpl.nasa.gov/doc/horizons.html"
                target="_blank"
                rel="noreferrer"
              >
                NASA/JPL Horizons API
              </a>
              : observer ephemerides for the selected coordinates and UTC epoch.
              These are calculated positions, not telescope observations.
              Azimuth is clockwise from north; RA/declination are apparent
              equator/equinox-of-date coordinates. Refraction is not included.
              Night planning uses five-minute JPL samples across 48 hours.
              Window boundaries are sample times, not exact rise/set events.
            </p>
            <p>
              <a
                href="https://open-meteo.com/en/docs"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo API
              </a>
              : current and hourly weather model data. A forecast grid is not a
              measurement of clouds along the camera's line of sight. Missing
              fields remain unavailable.
            </p>
            <p>
              <a
                href="https://docs.opencv.org/5.0.0/"
                target="_blank"
                rel="noreferrer"
              >
                OpenCV analysis of uploaded image
              </a>
              : grayscale statistics, HSV thresholds, Canny edges, dark-region
              contours and Laplacian variance. Thresholds are exploratory, not a
              trained or validated cloud classifier. No planet recognition,
              plate solving or probability prediction is performed.
            </p>
            <p>
              <strong>Uploaded visitor image:</strong> a local JPG/PNG supplied
              by the visitor; capture time and location are not independently
              verified. Images stay on the laptop.{" "}
              <strong>User-recorded observation:</strong> an unverified visitor
              report. Only explicitly confirmed real attempts with complete,
              timely JPL and weather snapshots are eligible for experimental
              model training.
            </p>
            <p>
              Every astronomy page uses NASA/JPL Horizons. Missing results stay
              unavailable; completed responses are never reused as current data.
              Live sources need an internet connection; uploads, analysis and
              logging run locally once the app and OpenCV runtime are loaded.
            </p>
          </div>
        </details>
      </main>
      <footer className="event-footer">
        <span>AstroScout / Macquarie University Astronomy Night</span>
        <span>Look up. Keep the evidence.</span>
      </footer>
    </div>
  );
}
