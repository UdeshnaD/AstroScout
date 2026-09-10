"use client";

import "./ObservationPlanner.css";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Binoculars,
  Check,
  Download,
  Eye,
  FileText,
  Telescope,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  assessVisibility,
  canReport,
  equipmentPresets,
  observationFeatures,
  observationKey,
  predictObservation,
  targetIds,
  trainObservationModel,
  validEquipment,
  validateObservations,
  type Equipment,
  type Observation,
  type TargetId,
  targetLabels,
} from "@/lib/observation-model";
import type { RankedPlan } from "@/lib/recommender";
import { formatClock } from "@/lib/format";
import { getAstronomySummary } from "@/lib/astronomy";
import { observingSpots } from "@/data/observing-spots";
import { viewingProfile, viewingReadinessModifier } from "@/data/viewing-difficulty";

const storageKey = "astroscout.observations.v1";
const equipmentNames = {
  eye: "Unaided eye",
  binoculars: "Binoculars",
  telescope: "Telescope",
};
const equipmentIcons = {
  eye: Eye,
  binoculars: Binoculars,
  telescope: Telescope,
};
type JournalEntry = {
  id: string;
  observedAt: string;
  location: string;
  target: string;
  equipment: string;
  notes: string;
  visibility?: VisibilityRating;
  transparency?: TransparencyRating;
  conditions?: ObservingConditions;
};
type VisibilityRating = "Excellent" | "Good" | "Fair" | "Poor" | "Not recorded";
type TransparencyRating = "Excellent" | "Good" | "Fair" | "Poor" | "Not recorded";
type ObservingConditions = "Clear" | "Hazy" | "Partly cloudy" | "Cloudy" | "Windy" | "Not recorded";
const visibilityRatings: VisibilityRating[] = ["Excellent", "Good", "Fair", "Poor", "Not recorded"];
const observingConditions: ObservingConditions[] = ["Clear", "Hazy", "Partly cloudy", "Cloudy", "Windy", "Not recorded"];

function validJournalEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is JournalEntry =>
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.observedAt === "string" &&
        Number.isFinite(Date.parse(entry.observedAt)) &&
        typeof entry.location === "string" &&
        typeof entry.target === "string" &&
        typeof entry.equipment === "string" &&
        typeof entry.notes === "string" &&
        (entry.visibility === undefined || visibilityRatings.includes(entry.visibility)) &&
        (entry.transparency === undefined || visibilityRatings.includes(entry.transparency)) &&
        (entry.conditions === undefined || observingConditions.includes(entry.conditions)),
    )
    .slice(-500);
}

export function ObservationPlanner({
  plan,
  hour,
  onHour,
  mode = "observe",
  requestedTarget,
  isActive = true,
}: {
  plan: RankedPlan;
  hour: number;
  onHour: (hour: number) => void;
  mode?: "observe" | "journal" | "evidence";
  requestedTarget?: TargetId;
  /** Prevent hidden planner views from changing the shared sky timeline. */
  isActive?: boolean;
}) {
  const [target, setTarget] = useState<TargetId>("saturn");
  const [equipment, setEquipment] = useState<Equipment>(
    equipmentPresets.telescope,
  );
  const [observations, setObservations] = useState<Observation[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalDraft, setJournalDraft] = useState({
    observedAt: "",
    location: "",
    target: "",
    equipment: "",
    notes: "",
    visibility: "Not recorded" as VisibilityRating,
    transparency: "Not recorded" as TransparencyRating,
    conditions: "Not recorded" as ObservingConditions,
  });
  const [ready, setReady] = useState(false);
  const [storageWritable, setStorageWritable] = useState(true);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  const upload = useRef<HTMLInputElement>(null);
  const journalLocationOptions = useMemo(
    () => [...new Set([plan.name, ...observingSpots.map((spot) => spot.name)])],
    [plan.name],
  );
  useEffect(() => {
    if (requestedTarget) setTarget(requestedTarget);
  }, [requestedTarget]);

  useEffect(() => {
    setNow(Date.now());
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (stored) {
        setObservations(validateObservations(stored.observations));
        setJournalEntries(validJournalEntries(stored.journalEntries));
        if (validEquipment(stored.equipment)) setEquipment(stored.equipment);
        if (targetIds.includes(stored.target)) setTarget(stored.target);
      }
    } catch {
      setStorageWritable(false);
      setMessage(
        "Stored observations could not be read. New records will stay in this visit; export them before leaving.",
      );
    }
    setReady(true);
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready || !storageWritable) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ observations, journalEntries, equipment, target }),
      );
    } catch {
      setStorageWritable(false);
      setMessage(
        "Browser storage is unavailable. Export observations before leaving this page.",
      );
    }
  }, [ready, storageWritable, observations, journalEntries, equipment, target]);

  const assessment = assessVisibility(
    plan.astronomy,
    plan.weather,
    hour,
    target,
    equipment,
  );
  const visibleHours = useMemo(
    () =>
      plan.weather.hourly
        .map((point, index) => {
          const sky = getAstronomySummary(
            point.time,
            plan.latitude,
            plan.longitude,
          );
          const object = sky.highlights.find((item) => item.id === target);
          return {
            index,
            point,
            visible:
              (object?.altitude ?? -90) > 0 && (sky.sunAltitude ?? 0) < 0,
          };
        })
        .filter((entry) => entry.visible),
    [plan.latitude, plan.longitude, plan.weather.hourly, target],
  );
  useEffect(() => {
    if (!isActive) return;
    if (
      visibleHours.length > 0 &&
      !visibleHours.some((entry) => entry.index === hour)
    )
      onHour(visibleHours[0].index);
  }, [hour, isActive, onHour, visibleHours]);
  const model = useMemo(
    () => trainObservationModel(observations, target, equipment.kind),
    [observations, target, equipment.kind],
  );
  const selectedTarget = plan.astronomy.highlights.find((t) => t.id === target);
  const point = plan.weather.hourly[hour];
  const capturedAt = new Date(now || 0).toISOString();
  const features = observationFeatures(
    plan.astronomy,
    plan.weather,
    hour,
    target,
    equipment,
    plan.bortleRating,
    capturedAt,
  );
  const prediction = predictObservation(model, features);
  const forecastAge = now - Date.parse(plan.weather.fetchedAt);
  const stale = forecastAge > 3600000;
  const availableProbability =
    !assessment.blocked && !stale ? prediction.probability : null;
  const readiness =
    availableProbability === null && !assessment.blocked && !stale && point
      ? Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 - point.cloudCover * 0.55 - point.precipitationChance * 0.35 - Math.max(0, 25 - (selectedTarget?.altitude ?? 0)) * 1.25 + viewingReadinessModifier(target, equipment.kind),
            ),
          ),
        )
      : null;
  const key = point
    ? observationKey({ siteId: plan.id, time: point.time, target, equipment })
    : "";
  const existing = observations.find((row) => observationKey(row) === key);
  const canCapture =
    ready &&
    !!point &&
    !!features &&
    !assessment.blocked &&
    !stale &&
    Date.parse(point.time) >= now &&
    !existing &&
    observations.length < 2000;

  function capture() {
    if (!canCapture || !point || !features) return;
    const capturedAt = new Date().toISOString();
    const snapshot = observationFeatures(
      plan.astronomy,
      plan.weather,
      hour,
      target,
      equipment,
      plan.bortleRating,
      capturedAt,
    );
    if (!snapshot || Date.parse(point.time) < Date.now()) {
      setMessage("Choose an upcoming hour before planning this attempt.");
      return;
    }
    const row: Observation = {
      version: 1,
      id: crypto.randomUUID(),
      siteId: plan.id,
      siteName: plan.name,
      target,
      equipment: { ...equipment },
      time: point.time,
      capturedAt,
      forecastFetchedAt: plan.weather.fetchedAt,
      source: "open-meteo",
      features: snapshot,
      seen: null,
      reportedAt: null,
    };
    try {
      setObservations(validateObservations([...observations, row]));
      setMessage(
        `Attempt planned for ${formatClock(row.time)}. Record the outcome after observing.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save this attempt.",
      );
    }
  }

  function report(key: string, seen: boolean) {
    const timestamp = Date.now();
    setObservations((rows) =>
      rows.map((row) =>
        observationKey(row) === key && canReport(row, timestamp)
          ? { ...row, seen, reportedAt: new Date(timestamp).toISOString() }
          : row,
      ),
    );
    setMessage(
      seen
        ? "Sighting recorded."
        : "Unsuccessful attempt recorded. Only log this after actually trying.",
    );
  }

  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { schema: "astroscout.observations.v1", observations, journalEntries },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "astroscout-observations.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 3_000_000)
        throw new Error("Choose an observation file smaller than 3 MB.");
      const data = JSON.parse(await file.text());
      if (data.schema !== "astroscout.observations.v1")
        throw new Error("This file is not an AstroScout observation export.");
      const incoming = validateObservations(data.observations);
      const merged = validateObservations([...observations, ...incoming]);
      const incomingEntries = validJournalEntries(data.journalEntries);
      setJournalEntries((entries) =>
        [...entries, ...incomingEntries].filter(
          (entry, index, all) =>
            all.findIndex((candidate) => candidate.id === entry.id) === index,
        ),
      );
      setObservations(merged);
      setMessage(
        `${merged.length} unique attempts in your log. Imported outcomes are self-reported and are not independently verified.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to import observations.",
      );
    }
    if (upload.current) upload.current.value = "";
  }

  function addJournalEntry() {
    if (
      !journalDraft.observedAt ||
      !journalDraft.location.trim() ||
      !journalDraft.notes.trim()
    ) {
      setMessage("Add a date, location and notes before saving your journal entry.");
      return;
    }
    const observedAtTimestamp = Date.parse(journalDraft.observedAt);
    if (!Number.isFinite(observedAtTimestamp)) {
      setMessage("Enter a valid observation date and time.");
      return;
    }
    const observedAt = new Date(observedAtTimestamp).toISOString();
    setJournalEntries((entries) => [
      ...entries,
      {
        id: crypto.randomUUID(),
        observedAt,
        location: journalDraft.location.trim(),
        target: journalDraft.target.trim() || "Not specified",
        equipment: journalDraft.equipment.trim() || "Not specified",
        notes: journalDraft.notes.trim(),
        visibility: journalDraft.visibility,
        transparency: journalDraft.transparency,
        conditions: journalDraft.conditions,
      },
    ]);
    setJournalDraft({ observedAt: "", location: "", target: "", equipment: "", notes: "", visibility: "Not recorded", transparency: "Not recorded", conditions: "Not recorded" });
    setMessage("Journal entry saved on this device.");
  }

  return (
    <section
      className="observation-planner"
      aria-labelledby="observation-heading"
    >
      <div hidden={mode !== "observe"}>
        <div className="section-heading">
          <h2 id="observation-heading">
            <Telescope size={20} /> Can I see it?
          </h2>
          <span>
            {point ? formatClock(point.time) : "No forecast"} / {plan.name}
          </span>
        </div>
        <div className="observation-controls">
          <label>
            Observing time
            <select
              value={hour}
              onChange={(event) => onHour(Number(event.target.value))}
              disabled={!visibleHours.length}
            >
              {visibleHours.map(({ point: visiblePoint, index }) => (
                <option key={visiblePoint.time} value={index}>
                  {formatClock(visiblePoint.time)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Object
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as TargetId)}
            >
              {targetIds.map((id) => (
                <option key={id} value={id}>
                  {targetLabels[id]}
                </option>
              ))}
            </select>
          </label>
          <small className="visible-hours-note">
            {visibleHours.length
              ? `Only times when ${targetLabels[target]} is above the NSW horizon after sunset are shown.`
              : `${targetLabels[target]} is not visible above the NSW horizon in this forecast window.`}
          </small>
          <fieldset>
            <legend>My equipment</legend>
            <ToggleGroup.Root
              className="equipment-segments"
              type="single"
              value={equipment.kind}
              aria-label="My equipment"
              onValueChange={(kind) => {
                if (kind && kind in equipmentPresets)
                  setEquipment(equipmentPresets[kind as Equipment["kind"]]);
              }}
            >
              {(Object.keys(equipmentPresets) as Equipment["kind"][]).map(
                (kind) => {
                  const Icon = equipmentIcons[kind];
                  return (
                    <ToggleGroup.Item
                      type="button"
                      key={kind}
                      value={kind}
                      title={equipmentNames[kind]}
                    >
                      <Icon size={18} />
                      <span>{equipmentNames[kind]}</span>
                    </ToggleGroup.Item>
                  );
                },
              )}
            </ToggleGroup.Root>
          </fieldset>
          {equipment.kind !== "eye" && (
            <>
              <label>
                Aperture (mm)
                <input
                  type="number"
                  min={7}
                  max={500}
                  step={1}
                  value={equipment.aperture}
                  onChange={(e) =>
                    setEquipment({
                      ...equipment,
                      aperture: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Magnification (x)
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={equipment.magnification}
                  onChange={(e) =>
                    setEquipment({
                      ...equipment,
                      magnification: Number(e.target.value),
                    })
                  }
                />
              </label>
            </>
          )}
        </div>
        <p className="observation-objective">
          Success means locating and seeing {selectedTarget?.name ?? target}{" "}
          with this equipment. Resolving rings, moons or surface detail is a
          separate goal.
        </p>
        <div className="viewing-difficulty" aria-label="Viewing difficulty by equipment">
          {(Object.keys(equipmentNames) as Equipment["kind"][]).map((kind) => <span key={kind}><strong>{equipmentNames[kind]}</strong> {viewingProfile(target)[kind]}</span>)}
          <a href={viewingProfile(target).sourceUrl} target="_blank" rel="noreferrer">Evidence: {viewingProfile(target).source}</a>
        </div>
        <div className="observation-result" aria-live="polite">
          <div>
            <span className="kicker">
              {availableProbability === null ? "TONIGHT'S READINESS" : "SIGHTING PROBABILITY"}
            </span>
            <strong className="observation-probability">
              {availableProbability === null
                ? readiness === null
                  ? "Unavailable"
                  : `${readiness}%`
                : `${Math.round(availableProbability * 100)}%`}
            </strong>
            <p>
              {assessment.blocked
                ? assessment.title
                : stale
                  ? "Forecast snapshot expired. Update the plan."
                  : availableProbability === null
                    ? "A forecast-and-position readiness guide. It is not a personal sighting prediction."
                    : prediction.reason}
            </p>
            {availableProbability !== null && (
              <small>
                Experimental estimate / {prediction.calibrationCount} attempts
                in this calibration group. Uncertainty remains substantial.
              </small>
            )}
            {availableProbability === null && readiness !== null && (
              <small>
                Based on the selected forecast and calculated altitude. Personal sighting predictions unlock only after sufficient logged attempts.
              </small>
            )}
          </div>
          <div className="observation-evidence">
            <strong>{assessment.title}</strong>
            <span>
              {selectedTarget?.direction} /{" "}
              {selectedTarget?.altitude?.toFixed(0)}
              &deg; altitude
            </span>
            <ul>
              {assessment.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
        {selectedTarget?.reference && (
          <p className="observation-reference">
            <strong>Documented observation:</strong>{" "}
            <a href={selectedTarget.reference.url} target="_blank" rel="noreferrer">
              {selectedTarget.reference.label}
            </a>{" "}
            <span>— professional/archival reference, not a local success claim.</span>
          </p>
        )}
        <div className="observation-capture">
          <button
            className="button button--primary"
            type="button"
            disabled={!canCapture}
            onClick={capture}
          >
            <Check size={16} />
            {existing ? "Attempt saved" : "Plan this attempt"}
          </button>
          <span>
            {stale
              ? "Refresh the forecast before planning an attempt."
              : point && Date.parse(point.time) < now
                ? "Select an upcoming hour to save a forecast before observing."
                : "Forecast saved before observing. Outcomes can be recorded for two hours after the planned time."}
          </span>
        </div>
      </div>
      {message && (
        <p role="status" className="observation-message">
          {message}
        </p>
      )}
      <details
        className="observation-log"
        open={mode === "journal"}
        hidden={mode !== "journal"}
      >
        <summary>
          Observation log{" "}
          <span>
            {observations.filter((r) => r.seen !== null).length} completed /{" "}
            {observations.filter((r) => r.seen === null).length} planned
          </span>
        </summary>
        <div className="observation-log-toolbar">
          <p>
            Forecast-linked attempts and journal notes stay on this device
            {!storageWritable ? " for this visit only" : ""}. A missed outing
            is not an unsuccessful sighting.
          </p>
          <button
            type="button"
            className="button button--secondary"
            disabled={!observations.length && !journalEntries.length}
            onClick={download}
          >
            <Download size={18} />
            Export JSON
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => upload.current?.click()}
          >
            <Upload size={18} />
            Import JSON
          </button>
          <input
            ref={upload}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
        <p className="journal-import-note">
          Import an AstroScout observation export (.json, up to 3 MB). PDFs,
          Word documents, images and spreadsheets are not supported because
          they cannot be safely converted into forecast-backed observations.
        </p>
        <form
          className="journal-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            addJournalEntry();
          }}
        >
          <div>
            <FileText size={18} aria-hidden="true" />
            <div>
              <h3>Add a journal entry</h3>
              <p>
                Record notes from an outing without adding them to the
                forecast-based observation model.
              </p>
            </div>
          </div>
          <div className="journal-entry-fields">
            <label>
              Date and time
              <input
                type="datetime-local"
                required
                value={journalDraft.observedAt}
                onChange={(event) =>
                  setJournalDraft({ ...journalDraft, observedAt: event.target.value })
                }
              />
            </label>
            <label>
              Location
              <input
                required
                list="journal-location-options"
                placeholder="e.g. Long Reef Headland"
                value={journalDraft.location}
                onChange={(event) =>
                  setJournalDraft({ ...journalDraft, location: event.target.value })
                }
              />
            </label>
            <label>
              Object observed
              <input
                list="journal-target-options"
                placeholder="e.g. Saturn"
                value={journalDraft.target}
                onChange={(event) =>
                  setJournalDraft({ ...journalDraft, target: event.target.value })
                }
              />
            </label>
            <label>
              Equipment
              <input
                list="journal-equipment-options"
                placeholder="e.g. 8×42 binoculars"
                value={journalDraft.equipment}
                onChange={(event) =>
                  setJournalDraft({ ...journalDraft, equipment: event.target.value })
                }
              />
            </label>
            <label>
              Visibility
              <select value={journalDraft.visibility} onChange={(event) => setJournalDraft({ ...journalDraft, visibility: event.target.value as VisibilityRating })}>
                {visibilityRatings.map((rating) => <option key={rating}>{rating}</option>)}
              </select>
            </label>
            <label>
              Transparency
              <select value={journalDraft.transparency} onChange={(event) => setJournalDraft({ ...journalDraft, transparency: event.target.value as TransparencyRating })}>
                {visibilityRatings.map((rating) => <option key={rating}>{rating}</option>)}
              </select>
            </label>
            <label>
              Conditions
              <select value={journalDraft.conditions} onChange={(event) => setJournalDraft({ ...journalDraft, conditions: event.target.value as ObservingConditions })}>
                {observingConditions.map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
            <label className="journal-notes-field">
              Notes
              <textarea
                required
                placeholder="What did you see? Include conditions, equipment or anything to remember next time."
                value={journalDraft.notes}
                onChange={(event) =>
                  setJournalDraft({ ...journalDraft, notes: event.target.value })
                }
              />
            </label>
          </div>
          <datalist id="journal-location-options">
            {journalLocationOptions.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
          <datalist id="journal-target-options">
            {targetIds.map((id) => (
              <option key={id} value={targetLabels[id]} />
            ))}
          </datalist>
          <datalist id="journal-equipment-options">
            <option value="Unaided eye" />
            <option value="10×50 binoculars" />
            <option value="8×42 binoculars" />
            <option value="130 mm telescope / 65×" />
            <option value="200 mm telescope / 100×" />
          </datalist>
          <button className="button button--primary" type="submit">
            <Check size={16} /> Save journal entry
          </button>
        </form>
        {journalEntries.length > 0 && (
          <div className="journal-entry-list">
            <h3>Journal notes</h3>
            {journalEntries
              .slice()
              .reverse()
              .map((entry) => (
                <article key={entry.id}>
                  <div>
                    <strong>{entry.target} / {entry.location}</strong>
                    <span>
                      {new Intl.DateTimeFormat("en-AU", {
                        timeZone: "Australia/Sydney",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.observedAt))} / {entry.equipment}
                    </span>
                    <span className="journal-entry-conditions">
                      Visibility: {entry.visibility ?? "Not recorded"} · Transparency: {entry.transparency ?? "Not recorded"} · Conditions: {entry.conditions ?? "Not recorded"}
                    </span>
                    <p>{entry.notes}</p>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    title="Delete journal entry"
                    aria-label={`Delete journal entry for ${entry.location}`}
                    onClick={() =>
                      setJournalEntries((entries) =>
                        entries.filter((candidate) => candidate.id !== entry.id),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
          </div>
        )}
        {!observations.length && (
          <p className="footnote">No observation records yet.</p>
        )}
        <div className="observation-records">
          {observations
            .slice()
            .reverse()
            .map((row) => (
              <div className="observation-record" key={observationKey(row)}>
                <div>
                  <strong>
                    {targetLabels[row.target]} /{" "}
                    {row.siteName}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("en-AU", {
                      timeZone: "Australia/Sydney",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(row.time))}{" "}
                    / {equipmentNames[row.equipment.kind]}{" "}
                    {row.equipment.aperture} mm, {row.equipment.magnification}x
                  </span>
                </div>
                <div className="observation-outcome">
                  {canReport(row, now) ? (
                    <>
                      <button
                        type="button"
                        aria-pressed={row.seen === true}
                        title="I located and saw the object"
                        onClick={() => report(observationKey(row), true)}
                      >
                        <Check size={15} />
                        Saw it
                      </button>
                      <button
                        type="button"
                        aria-pressed={row.seen === false}
                        title="I tried but could not see the object"
                        onClick={() => report(observationKey(row), false)}
                      >
                        <X size={15} />
                        Tried, not seen
                      </button>
                    </>
                  ) : (
                    <span>
                      {row.seen === null
                        ? now < Date.parse(row.time)
                          ? "Upcoming"
                          : "Unreported"
                        : row.seen
                          ? "Seen"
                          : "Not seen"}
                    </span>
                  )}
                  <button
                    className="icon-button"
                    type="button"
                    title="Delete attempt"
                    aria-label={`Delete ${row.target} attempt at ${row.siteName}`}
                    onClick={() =>
                      setObservations((rows) =>
                        rows.filter(
                          (r) => observationKey(r) !== observationKey(row),
                        ),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </details>
      <details
        className="observation-log"
        open={mode === "evidence"}
        hidden={mode !== "evidence"}
      >
        <summary>
          Model evidence{" "}
          <span>
            {model.count} attempts / {model.nights} nights for {target}
          </span>
        </summary>
        <p>{model.status}</p>
        {model.split && (
          <p>
            Training: {model.split.train}. Calibration:{" "}
            {model.split.calibration}. Evaluation: {model.split.test}. Nights
            are kept together and ordered by date.
          </p>
        )}
        {model.brier !== undefined && (
          <p>
            Brier score: {model.brier.toFixed(3)}. Constant baseline:{" "}
            {model.baselineBrier?.toFixed(3)}. Lower is better.
          </p>
        )}
        <p className="footnote">
          Random forest trained on actual reported outcomes for this object and
          equipment type. Forecasts are model estimates; seeing, eyesight, mount
          quality and local obstructions are not measured. Self-reported
          outcomes and repeated observations can bias these results. No
          pre-trained sighting dataset is bundled.
        </p>
      </details>
    </section>
  );
}
