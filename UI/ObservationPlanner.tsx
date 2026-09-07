"use client";

import "./ObservationPlanner.css";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Binoculars,
  Check,
  Download,
  Eye,
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
} from "@/lib/observation-model";
import type { RankedPlan } from "@/lib/recommender";
import { formatClock } from "@/lib/format";

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

export function ObservationPlanner({
  plan,
  hour,
  onHour,
  mode = "observe",
  requestedTarget,
}: {
  plan: RankedPlan;
  hour: number;
  onHour: (hour: number) => void;
  mode?: "observe" | "journal" | "evidence";
  requestedTarget?: TargetId;
}) {
  const [target, setTarget] = useState<TargetId>("saturn");
  const [equipment, setEquipment] = useState<Equipment>(
    equipmentPresets.telescope,
  );
  const [observations, setObservations] = useState<Observation[]>([]);
  const [ready, setReady] = useState(false);
  const [storageWritable, setStorageWritable] = useState(true);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (requestedTarget) setTarget(requestedTarget);
  }, [requestedTarget]);

  useEffect(() => {
    setNow(Date.now());
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (stored) {
        setObservations(validateObservations(stored.observations));
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
        JSON.stringify({ observations, equipment, target }),
      );
    } catch {
      setStorageWritable(false);
      setMessage(
        "Browser storage is unavailable. Export observations before leaving this page.",
      );
    }
  }, [ready, storageWritable, observations, equipment, target]);

  const assessment = assessVisibility(
    plan.astronomy,
    plan.weather,
    hour,
    target,
    equipment,
  );
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
          { schema: "astroscout.observations.v1", observations },
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
            >
              {plan.weather.hourly.map((p, index) => (
                <option key={p.time} value={index}>
                  {formatClock(p.time)}
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
                  {id[0].toUpperCase() + id.slice(1)}
                </option>
              ))}
            </select>
          </label>
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
        <div className="observation-result" aria-live="polite">
          <div>
            <span className="kicker">SIGHTING PROBABILITY</span>
            <strong className="observation-probability">
              {availableProbability === null
                ? "Not available yet"
                : `${Math.round(availableProbability * 100)}%`}
            </strong>
            <p>
              {assessment.blocked
                ? assessment.title
                : stale
                  ? "Forecast snapshot expired. Update the plan."
                  : prediction.reason}
            </p>
            {availableProbability !== null && (
              <small>
                Experimental estimate / {prediction.calibrationCount} attempts
                in this calibration group. Uncertainty remains substantial.
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
            On this device{!storageWritable ? ", this visit only" : ""}. A
            missed outing is not an unsuccessful sighting.
          </p>
          <button
            type="button"
            className="icon-button"
            title="Export observations"
            aria-label="Export observations"
            disabled={!observations.length}
            onClick={download}
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Import observation export"
            aria-label="Import observation export"
            onClick={() => upload.current?.click()}
          >
            <Upload size={18} />
          </button>
          <input
            ref={upload}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
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
                    {row.target[0].toUpperCase() + row.target.slice(1)} /{" "}
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
