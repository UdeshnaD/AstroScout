"use client";

import "./AstroScout.css";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TonightView } from "./TonightView";
import { CalendarView } from "./CalendarView";
import { m, AnimatePresence } from "motion/react";
import { Hint } from "./Hint";
import {
  ArrowRight,
  Bookmark,
  Car,
  Check,
  Cloud,
  Compass,
  FlaskConical,
  GitCompareArrows,
  Loader2,
  LocateFixed,
  MapPin,
  Moon,
  Navigation,
  RefreshCw,
  Search,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  X,
  CalendarDays,
  BookOpen,
  Settings2,
  Menu,
} from "lucide-react";
import {
  LocationSearch,
  locationPresets,
  lookupNswLocation,
  type LocationLookup,
  type LocationPreset,
} from "@/components/dashboard/LocationSearch";
import { MapPreview } from "@/components/dashboard/MapPreview";
import { ObservationPlanner } from "@ui/ObservationPlanner";
import {
  Comparison,
  ForecastTimeline,
  ModelLab,
} from "@/components/dashboard/ObservingAnalysis";
import { getAstronomySummary } from "@/lib/astronomy";
import {
  defaultPriorities,
  observingProfiles,
  rankPlans,
  type Feedback,
  type Priorities,
} from "@/lib/recommender";
import { departureTimeFor, formatClock, formatMinutes } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";
import type { TravelMode } from "@/types/trip";
import type { TargetId } from "@/lib/observation-model";

type Session = {
  location: LocationPreset;
  startTime: string;
  radiusKm: number;
  travelMode: TravelMode;
};
type SavedPlan = {
  id: string;
  name: string;
  time: string;
  latitude: number;
  longitude: number;
  mode: TravelMode;
};
const storageKey = "astroscout.observing-desk.v1";
const views = [
  { id: "tonight", path: "/", label: "Tonight", icon: Moon },
  { id: "explore", path: "/places", label: "Places", icon: Compass },
  { id: "calendar", path: "/calendar", label: "Calendar", icon: CalendarDays },
  { id: "observe", path: "/observe", label: "Observe", icon: Telescope },
  { id: "journal", path: "/journal", label: "Journal", icon: BookOpen },
  { id: "model", path: "/method", label: "How it works", icon: FlaskConical },
  {
    id: "compare",
    path: "/compare",
    label: "Compare places",
    icon: GitCompareArrows,
  },
] as const;
type View = (typeof views)[number]["id"];

export function AstroScoutApp() {
  const pathname = usePathname();
  const router = useRouter();
  const view = views.find((item) => item.path === pathname)?.id ?? "tonight";
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  const [requestedTarget, setRequestedTarget] = useState<TargetId>("saturn");
  const [session, setSession] = useState<Session>({
    location: locationPresets[0],
    startTime: "",
    radiusKm: 120,
    travelMode: "driving",
  });
  const [applied, setApplied] = useState<Session>();
  const [plans, setPlans] = useState<SpotPlan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [hour, setHour] = useState(0);
  const [query, setQuery] = useState("");
  const [placeSearchError, setPlaceSearchError] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<Priorities>(defaultPriorities);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [learn, setLearn] = useState(true);
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updated, setUpdated] = useState("");
  const [unavailableSites, setUnavailableSites] = useState<string[]>([]);
  const requestRef = useRef<AbortController>();
  const savedPanel = useRef<HTMLDialogElement>(null);

  async function search(input: Session) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/plans/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...input.location,
          startTime: sydneyIso(input.startTime),
          radiusKm: input.radiusKm,
          travelMode: input.travelMode,
        }),
      });
      const data = (await response.json()) as {
        locations?: SpotPlan[];
        error?: string;
        unavailableSites?: string[];
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to load locations.");
      if (requestRef.current !== controller) return;
      const locations = data.locations ?? [];
      // A place/postcode lookup changes the result set. Do not leave a prior
      // catalogue-name filter in place, or valid nearby results can appear empty.
      setQuery("");
      setPlans(locations);
      setUnavailableSites(data.unavailableSites ?? []);
      setApplied(input);
      setHour(0);
      setSelectedId((id) =>
        locations.some((p) => p.id === id) ? id : (locations[0]?.id ?? ""),
      );
      setComparisonIds((ids) =>
        ids.length
          ? ids.filter((id) => locations.some((p) => p.id === id))
          : locations.slice(0, 2).map((p) => p.id),
      );
      setUpdated(formatClock(new Date()));
    } catch (failure) {
      if (requestRef.current !== controller) return;
      setError(
        controller.signal.aborted
          ? "The request took too long. Try updating the plan again."
          : failure instanceof Error
            ? failure.message
            : "Unable to load locations.",
      );
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) setLoading(false);
    }
  }

  useEffect(() => {
    const initial = {
      location: locationPresets[0],
      startTime: defaultTime(),
      radiusKm: 120,
      travelMode: "driving" as TravelMode,
    };
    setSession(initial);
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (raw && typeof raw === "object") {
        if (
          Array.isArray(raw.priorities) &&
          raw.priorities.length === 4 &&
          raw.priorities.every(
            (x: unknown) =>
              typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 100,
          ) &&
          raw.priorities.some(Boolean)
        )
          setPriorities(raw.priorities);
        if (Array.isArray(raw.feedback))
          setFeedback(
            raw.feedback
              .filter(
                (r: Feedback) =>
                  r &&
                  typeof r.id === "string" &&
                  typeof r.liked === "boolean" &&
                  Array.isArray(r.features) &&
                  r.features.length === 4 &&
                  r.features.every(
                    (x) => Number.isFinite(x) && x >= 0 && x <= 1,
                  ),
              )
              .slice(-50),
          );
        if (Array.isArray(raw.saved))
          setSaved(
            raw.saved
              .filter(
                (r: SavedPlan) =>
                  r &&
                  typeof r.id === "string" &&
                  typeof r.name === "string" &&
                  typeof r.time === "string" &&
                  Number.isFinite(Date.parse(r.time)) &&
                  Number.isFinite(r.latitude) &&
                  Number.isFinite(r.longitude) &&
                  ["driving", "walking", "public_transport"].includes(r.mode),
              )
              .slice(0, 20),
          );
        if (typeof raw.learn === "boolean") setLearn(raw.learn);
      }
    } catch {
      /* A restricted browser can still use the planner without persistence. */
    }
    setLoaded(true);
    void search(initial);
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ priorities, feedback, saved, learn }),
      );
    } catch {
      setNotice(
        "Changes are available for this visit; browser storage is unavailable.",
      );
    }
  }, [priorities, feedback, saved, learn, loaded]);

  useEffect(() => {
    if (showSaved) savedPanel.current?.showModal();
    else savedPanel.current?.close();
  }, [showSaved]);

  const hourPlans = useMemo(
    () =>
      plans.map((p) => {
        const time = p.weather.hourly[hour]?.time;
        return time
          ? {
              ...p,
              astronomy: getAstronomySummary(time, p.latitude, p.longitude),
            }
          : p;
      }),
    [plans, hour],
  );
  const ranked = useMemo(
    () => rankPlans(hourPlans, priorities, feedback, learn, hour),
    [hourPlans, priorities, feedback, learn, hour],
  );
  const filtered = ranked.filter((p) =>
    `${p.name} ${p.region}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = ranked.find((p) => p.id === selectedId) ?? ranked[0];
  const currentWeather = selected?.weather.hourly[hour] ?? selected?.weather;
  const selectedTime =
    selected?.weather.hourly[hour]?.time ??
    (applied ? sydneyIso(applied.startTime) : "");
  const dirty = applied && JSON.stringify(session) !== JSON.stringify(applied);
  const currentProfile =
    Object.entries(observingProfiles).find(([, p]) =>
      p.every((v, i) => v === priorities[i]),
    )?.[0] ?? "Custom";
  const selectedFeedback = feedback.find((f) => f.id === selected?.id);
  const isSaved = saved.some(
    (p) => p.id === selected?.id && p.time === selectedTime,
  );

  function rate(liked: boolean) {
    if (!selected) return;
    setFeedback((previous) => [
      ...previous.filter((f) => f.id !== selected.id),
      { id: selected.id, features: selected.features, liked },
    ]);
    setNotice(
      learn
        ? "Rating saved. Your location rankings have been updated."
        : "Rating saved. Turn on recommendations based on your ratings to use it.",
    );
  }
  function toggleCompare(id: string) {
    setComparisonIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < 3
          ? [...ids, id]
          : ids,
    );
  }
  async function searchPlacesLocation() {
    const value = query.trim();
    if (!value) return;

    // Keep the original catalogue-name/region filter working. When it has no
    // match, use the same location lookup as the global planner control.
    if (
      ranked.some((plan) =>
        `${plan.name} ${plan.region}`.toLowerCase().includes(value.toLowerCase()),
      )
    ) {
      setPlaceSearchError("");
      return;
    }
    try {
      await applyLocationLookup(await lookupNswLocation(value));
    } catch (failure) {
      setPlaceSearchError(
        failure instanceof Error ? failure.message : "Location lookup failed.",
      );
    }
  }
  async function applyLocationLookup({
    origin,
    nearestSpot,
  }: LocationLookup) {
    const next = { ...session, location: origin };
    setPlaceSearchError("");
    setSession(next);
    setNotice(
      `${origin.label} selected. Nearest curated spot: ${nearestSpot.name}. The Places list now ranks nearby catalogue options.`,
    );
    await search(next);
  }
  function useLocation() {
    if (!navigator.geolocation) {
      setNotice("Location is unavailable in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setSession((s) => ({
          ...s,
          location: {
            label: "Current location",
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          },
        }));
        setLocating(false);
        setNotice("Location selected. Update the plan to search from here.");
      },
      () => {
        setLocating(false);
        setNotice(
          "Location access was unavailable. Choose a starting location instead.",
        );
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
  function savePlan() {
    if (!selected || !applied) return;
    setSaved((rows) =>
      isSaved
        ? rows.filter((r) => !(r.id === selected.id && r.time === selectedTime))
        : [
            {
              id: selected.id,
              name: selected.name,
              latitude: selected.latitude,
              longitude: selected.longitude,
              time: selectedTime,
              mode: applied.travelMode,
            },
            ...rows,
          ].slice(0, 20),
    );
    setNotice(
      isSaved
        ? "Plan removed from your saved list."
        : "Plan saved on this device.",
    );
  }
  function changeView(next: View) {
    router.push(views.find((item) => item.id === next)?.path ?? "/");
  }

  return (
    <div className={`observing-app astro-site view-${view}`}>
      <a className="skip-link" href="#observing-content">
        Skip to content
      </a>
      <header
        className="astro-header"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <Link className="astro-brand" href="/" aria-label="AstroScout home">
          <Telescope size={27} strokeWidth={1.5} />
          <span>
            AstroScout<span className="brand-period">.</span>
          </span>
        </Link>
        <nav
          id="primary-navigation"
          aria-label="Main navigation"
          data-open={menuOpen}
        >
          {views.slice(0, 6).map(({ id, label, path }) => (
            <Link
              key={id}
              href={path}
              aria-current={view === id ? "page" : undefined}
            >
              {label}
              <m.span
                className="navigation-indicator"
                aria-hidden="true"
                initial={false}
                animate={{ scaleX: view === id ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </Link>
          ))}
        </nav>
        <Hint label="Saved places">
          <button
            className="icon-button"
            type="button"
            aria-label="Saved places"
            onClick={() => setShowSaved(true)}
          >
            <Bookmark size={19} />
          </button>
        </Hint>
        <Hint label={menuOpen ? "Close navigation" : "Open navigation"}>
          <button
            ref={menuButton}
            className="icon-button menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </Hint>
      </header>
      <div className="astro-context">
        <span>
          <MapPin size={14} />
          {selected?.name ?? session.location.label}
          <span className="context-divider">/</span>
          {selectedTime
            ? new Intl.DateTimeFormat("en-AU", {
                timeZone: "Australia/Sydney",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(selectedTime))
            : "Tonight"}
        </span>
        <button
          type="button"
          aria-expanded={showSettings}
          aria-controls="session-settings"
          onClick={() => setShowSettings((open) => !open)}
        >
          <Settings2 size={15} />
          Date & location
        </button>
      </div>
      <main className="desk-main">
        {view !== "tonight" && (
          <div className="astro-page-heading">
            <span className="kicker">ASTROSCOUT / NEW SOUTH WALES</span>
            <h1>
              {
                {
                  explore: "Find a stargazing site near you.",
                  calendar: "Plan around the night sky.",
                  observe: "Prepare for your next observation.",
                  journal: "Record your observing sessions.",
                  model: "How AstroScout ranks locations.",
                  compare: "Compare observing sites.",
                }[view]
              }
            </h1>
            <p>
              {
                {
                  explore:
                    "Enter a NSW postcode to rank nearby spots from AstroScout’s curated catalogue. If none fall within your radius, we’ll show the closest known options.",
                  calendar:
                    "Moon phases and seasonal milestones, in Sydney time.",
                  observe:
                    "Choose an object and your equipment, then see the conditions that matter for your observation.",
                  journal:
                    "Your planned attempts and the things you actually saw.",
                  model:
                    "Each result shows the weather, sky calculations and limits behind the recommendation.",
                  compare: "Compare selected locations and their current conditions.",
                }[view]
              }
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {showSettings && (
            <m.section
              id="session-settings"
              className="astro-settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <form
                className="session-toolbar"
                onSubmit={(e) => {
                  e.preventDefault();
                  void search(session);
                  setShowSettings(false);
                }}
              >
                <div className="origin-control">
                  <LocationSearch
                    value={session.location}
                    onChange={(location) =>
                      setSession({ ...session, location })
                    }
                    onLocationResolved={applyLocationLookup}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={useLocation}
                    disabled={locating}
                    title="Use current location"
                    aria-label="Use current location"
                  >
                    {locating ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <LocateFixed size={18} />
                    )}
                  </button>
                </div>
                <label className="control">
                  <span className="control__label">
                    Observing time / Sydney
                  </span>
                  <input
                    required
                    className="field"
                    type="datetime-local"
                    value={session.startTime}
                    onChange={(e) =>
                      setSession({ ...session, startTime: e.target.value })
                    }
                  />
                </label>
                <label className="control radius-control">
                  <span className="control__label">
                    Search radius <strong>{session.radiusKm} km</strong>
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="220"
                    step="10"
                    value={session.radiusKm}
                    onChange={(e) =>
                      setSession({
                        ...session,
                        radiusKm: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="control">
                  <span className="control__label">Travel mode</span>
                  <select
                    className="field"
                    value={session.travelMode}
                    onChange={(e) =>
                      setSession({
                        ...session,
                        travelMode: e.target.value as TravelMode,
                      })
                    }
                  >
                    <option value="driving">Driving</option>
                    <option value="public_transport">Public transport</option>
                    <option value="walking">Walking</option>
                  </select>
                </label>
                <button
                  className="button button--primary update-button"
                  disabled={loading || !session.startTime}
                  type="submit"
                >
                  {loading ? (
                    <Loader2 size={17} className="spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Update plan
                </button>
              </form>
            </m.section>
          )}
        </AnimatePresence>
        <div aria-live="polite">
          {dirty && (
            <p className="pending-note">
              Settings changed. Results still show the previous plan until you
              update.
            </p>
          )}
          {error && (
            <div role="alert" className="error-banner">
              {error} {plans.length > 0 && "Previous results remain below."}
            </div>
          )}
          {notice && (
            <div className="notice">
              <span>{notice}</span>
              <button
                className="icon-button"
                type="button"
                title="Dismiss message"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        {view === "explore" && (
          <div className="places-toolbar">
            <span>
              {loading
                ? "Checking forecasts..."
                : `${filtered.length} places / forecasts retrieved ${updated}`}
            </span>
            <div>
              <label>
                Sort by{" "}
                <select
                  value={currentProfile}
                  onChange={(e) =>
                    setPriorities(observingProfiles[e.target.value])
                  }
                >
                  {currentProfile === "Custom" && <option>Custom</option>}
                  {Object.keys(observingProfiles).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <Link href="/compare">
                Compare ({comparisonIds.length}) <GitCompareArrows size={16} />
              </Link>
            </div>
          </div>
        )}
        <div id="observing-content" tabIndex={-1}>
          <div id={`panel-${view}`} aria-busy={loading}>
            {view === "tonight" && (
              <TonightView
                time={
                  selectedTime ||
                  (session.startTime ? sydneyIso(session.startTime) : "")
                }
                latitude={selected?.latitude ?? session.location.latitude}
                longitude={selected?.longitude ?? session.location.longitude}
                location={selected?.name ?? session.location.label}
                plan={selected}
                hour={hour}
                onHour={setHour}
                onObserve={(id) => {
                  setRequestedTarget(id);
                  changeView("observe");
                }}
              />
            )}
            {view === "calendar" && <CalendarView />}
            <div hidden={!["observe", "journal", "model"].includes(view)}>
              {selected ? (
                <ObservationPlanner
                  plan={selected}
                  hour={hour}
                  onHour={setHour}
                  mode={
                    view === "journal"
                      ? "journal"
                      : view === "model"
                        ? "evidence"
                        : "observe"
                  }
                  requestedTarget={requestedTarget}
                />
              ) : (
                ["observe", "journal", "model"].includes(view) && (
                  <div className="empty-state">
                    <Telescope size={28} />
                    <h2>
                      {loading ? "Checking the sky..." : "Forecast unavailable"}
                    </h2>
                    <p>
                      Select an upcoming time in Date & location to check
                      observing conditions.
                    </p>
                  </div>
                )
              )}
            </div>
            {view === "explore" && (
              <div className="explore-layout">
                <aside className="locations-pane">
                  <div className="section-heading">
                    <h2>Where to go</h2>
                    <span>{filtered.length} locations</span>
                  </div>
                  <div className="places-location-search">
                    <p>
                      Search by NSW postcode or place name.
                    </p>
                    <form
                      className="location-filter"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void searchPlacesLocation();
                      }}
                    >
                      <Search size={16} aria-hidden="true" />
                      <input
                        aria-label="Find a location or region"
                        placeholder="Find a location or region"
                        value={query}
                        onChange={(e) => {
                          setPlaceSearchError("");
                          setQuery(e.target.value);
                        }}
                      />
                      <button type="submit" aria-label="Search location">
                        Search
                      </button>
                    </form>
                    {placeSearchError && (
                      <span role="alert">{placeSearchError}</span>
                    )}
                  </div>
                  <div className="rank-label">
                    <span>Ranked for {currentProfile.toLowerCase()}</span>
                    <span>Match / 100</span>
                  </div>
                  {loading && !plans.length && (
                    <div
                      className="loading-stack"
                      aria-label="Loading locations"
                    >
                      <div />
                      <div />
                      <div />
                    </div>
                  )}
                  {!loading && !filtered.length && (
                    <div className="empty-state">
                      <MapPin size={25} />
                      <h3>No matching locations</h3>
                      <p>
                        {query
                          ? "Try another name or region."
                          : "Increase your search radius or choose another starting point."}
                      </p>
                    </div>
                  )}
                  <div className="location-rows">
                    {filtered.map((p) => (
                      <article
                        key={p.id}
                        className={`location-row ${selected?.id === p.id ? "selected" : ""}`}
                      >
                        <button
                          className="location-select"
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          aria-pressed={selected?.id === p.id}
                        >
                          <span className="location-rank">
                            {String(ranked.indexOf(p) + 1).padStart(2, "0")}
                          </span>
                          <span className="location-copy">
                            <strong>{p.name}</strong>
                            <span>{p.region}</span>
                            <span className="location-metrics">
                              <span>
                                <Car size={13} />~
                                {formatMinutes(p.travelTimeMinutes)}
                              </span>
                              <span>
                                <Cloud size={13} />
                                {
                                  (p.weather.hourly[hour] ?? p.weather)
                                    .cloudCover
                                }
                                %
                              </span>
                            </span>
                          </span>
                          <span
                            className={`match-score ${p.condition}`}
                            title={`Location preference match: ${p.score} out of 100`}
                            aria-label={`Preference match ${p.score} out of 100`}
                          >
                            {p.score}
                          </span>
                        </button>
                        <div className="location-row-footer">
                          <span>{`Bortle ${p.bortleRating} (est.)`}</span>
                          <label>
                            <input
                              type="checkbox"
                              checked={comparisonIds.includes(p.id)}
                              disabled={
                                !comparisonIds.includes(p.id) &&
                                comparisonIds.length >= 3
                              }
                              onChange={() => toggleCompare(p.id)}
                            />
                            Compare
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="footnote">
                    Travel times are estimates from straight-line distance.
                    Access and opening hours require confirmation.
                  </p>
                </aside>
                <div className="observing-pane">
                  {!!unavailableSites.length && (
                    <p className="source-warning">
                      Forecast unavailable; excluded from results:{" "}
                      {unavailableSites.join(", ")}.
                    </p>
                  )}

                  <MapPreview
                    plans={filtered}
                    selectedId={selected?.id ?? ""}
                    onSelect={setSelectedId}
                    origin={applied?.location ?? session.location}
                  />
                  {selected && currentWeather && (
                    <section className="place-preview">
                      <div>
                        <span className="kicker">{selected.region}</span>
                        <h2>{selected.name}</h2>
                      </div>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={savePlan}
                        aria-pressed={isSaved}
                        title={isSaved ? "Remove saved place" : "Save place"}
                        aria-label={
                          isSaved ? "Remove saved place" : "Save place"
                        }
                      >
                        <Bookmark
                          size={20}
                          fill={isSaved ? "currentColor" : "none"}
                        />
                      </button>
                      <p>{selected.description}</p>
                      <div className="place-facts">
                        <span>
                          <Cloud size={16} />
                          {currentWeather.cloudCover}% cloud
                        </span>
                        <span>
                          <Navigation size={16} />
                          {formatMinutes(selected.travelTimeMinutes)} estimated
                        </span>
                        <span>
                          <Moon size={16} />
                          Bortle {selected.bortleRating} (est.)
                        </span>
                      </div>
                      <div className="place-actions">
                        <Link
                          className="button button--primary"
                          href="/observe"
                        >
                          Observe here <ArrowRight size={16} />
                        </Link>
                        <Link
                          className="text-button"
                          href={`/spot/${selected.id}?startTime=${encodeURIComponent(selectedTime)}&lat=${applied?.location.latitude}&lon=${applied?.location.longitude}&mode=${applied?.travelMode}`}
                        >
                          Site guide <ArrowRight size={16} />
                        </Link>
                        <a
                          className="text-button"
                          href={directions(
                            selected.latitude,
                            selected.longitude,
                            applied?.travelMode ?? "driving",
                            applied?.location,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Directions <Navigation size={16} />
                        </a>
                      </div>
                      <details className="place-extra">
                        <summary>Hourly forecast</summary>
                        <p className="footnote">
                          Estimated departure:{" "}
                          {departureTimeFor(
                            selectedTime,
                            selected.travelTimeMinutes,
                          )}
                          . Includes 20 minutes for setup.
                        </p>
                        <ForecastTimeline
                          plan={selected}
                          hour={hour}
                          onHour={setHour}
                        />
                      </details>
                      <div className="place-feedback">
                        <span>Does this spot suit you?</span>
                        <button
                          className="icon-button"
                          type="button"
                          title="This location suits me"
                          aria-label="This location suits me"
                          aria-pressed={selectedFeedback?.liked === true}
                          onClick={() => rate(true)}
                        >
                          <ThumbsUp size={16} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          title="This location is not for me"
                          aria-label="This location is not for me"
                          aria-pressed={selectedFeedback?.liked === false}
                          onClick={() => rate(false)}
                        >
                          <ThumbsDown size={16} />
                        </button>
                        <Link href="/method">Why this ranking?</Link>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
            {view === "compare" && (
              <Comparison
                plans={ranked}
                selected={comparisonIds}
                onSelect={toggleCompare}
                hour={hour}
              />
            )}
            {view === "model" && (
              <details className="preference-method">
                <summary>Location preferences and ranking</summary>
                <ModelLab
                  plans={ranked}
                  priorities={priorities}
                  onPriorities={setPriorities}
                  feedback={feedback}
                  learn={learn}
                  onLearn={setLearn}
                  onReset={() => {
                    setPriorities(defaultPriorities);
                    setFeedback([]);
                    setLearn(true);
                    setNotice("Preferences and ratings reset.");
                  }}
                />
              </details>
            )}
          </div>
        </div>
        <footer className="desk-footer">
          <span>
            <strong>AstroScout.</strong> / MQ Astronomy Night
          </span>
          <div>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Weather: Open-Meteo
            </a>
            <a
              href="https://github.com/cosinekitty/astronomy"
              target="_blank"
              rel="noreferrer"
            >
              Ephemerides: Astronomy Engine
            </a>
            <span>Times in Australia/Sydney</span>
          </div>
        </footer>
      </main>
      <dialog
        ref={savedPanel}
        className="saved-dialog"
        onCancel={() => setShowSaved(false)}
        onClose={() => setShowSaved(false)}
      >
        <div className="section-heading">
          <h2>Saved plans</h2>
          <button
            className="icon-button"
            type="button"
            onClick={() => setShowSaved(false)}
            title="Close saved plans"
            aria-label="Close saved plans"
          >
            <X size={20} />
          </button>
        </div>
        <p className="footnote">
          Saved on this device. Conditions can change before you leave.
        </p>
        {saved.length ? (
          saved.map((p) => (
            <div className="saved-row" key={`${p.id}-${p.time}`}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {new Intl.DateTimeFormat("en-AU", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Australia/Sydney",
                  }).format(new Date(p.time))}
                </span>
                <a
                  href={directions(p.latitude, p.longitude, p.mode)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions <ArrowRight size={14} />
                </a>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove ${p.name}`}
                title={`Remove ${p.name}`}
                onClick={() =>
                  setSaved((rows) =>
                    rows.filter((r) => !(r.id === p.id && r.time === p.time)),
                  )
                }
              >
                <X size={17} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Bookmark size={28} />
            <h3>Your next night starts here.</h3>
            <p>Save a location from the observing desk.</p>
          </div>
        )}
        <button
          className="button button--primary"
          type="button"
          onClick={() => setShowSaved(false)}
        >
          <Check size={16} />
          Done
        </button>
      </dialog>
    </div>
  );
}

function directions(
  latitude: number,
  longitude: number,
  mode: TravelMode,
  origin?: LocationPreset,
) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${mode === "public_transport" ? "transit" : mode}${origin ? `&origin=${origin.latitude},${origin.longitude}` : ""}`;
}

function defaultTime() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${date}T20:00`;
}

// Convert the wall-clock input using Sydney's offset, independent of the browser's timezone.
function sydneyIso(value: string) {
  const naive = new Date(`${value}Z`);
  const offsetName =
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      timeZoneName: "longOffset",
    })
      .formatToParts(naive)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+10:00";
  return new Date(`${value}${offsetName.replace("GMT", "")}`).toISOString();
}
