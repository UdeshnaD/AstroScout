"use client";
import { useMemo } from "react";
import {
  featureNames,
  predictObservation,
  trainObservationModel,
  type Equipment,
  type TargetId,
} from "@/lib/observation-model";
import { jplFeatures, trainingObservations } from "@/lib/jpl-sighting";
import type {
  EventObservation,
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  SourceResult,
} from "@/lib/event-types";
export function JplModelEvidence({
  log,
  snapshot,
  weather,
  target,
  equipment,
  now,
}: {
  log: EventObservation[];
  snapshot?: HorizonsSnapshot;
  weather?: SourceResult<EventWeather>;
  target: EventTarget;
  equipment: Equipment;
  now: string;
}) {
  const model = useMemo(() => {
    try {
      return trainObservationModel(
        trainingObservations(log),
        target as TargetId,
        equipment.kind,
      );
    } catch {
      return {
        count: 0,
        nights: 0,
        status: "Stored evidence does not meet the model's validation rules.",
      };
    }
  }, [log, target, equipment.kind]);
  const features = jplFeatures(snapshot, weather, target, equipment, now);
  const prediction = predictObservation(model, features);
  return (
    <section id="jpl-model" className="jpl-model">
      <div className="event-section-heading">
        <h2>Experimental sighting model</h2>
        <span className="event-source">
          Visitor outcomes + JPL + Open-Meteo
        </span>
      </div>
      <strong>
        {prediction.probability === null
          ? "Probability withheld"
          : `${Math.round(prediction.probability * 100)}% experimental estimated success`}
      </strong>
      <p>{model.status}</p>
      {prediction.reason !== model.status && <p>{prediction.reason}</p>}
      {"brier" in model && model.brier !== undefined && (
        <p>
          Later-night Brier score: {model.brier.toFixed(3)} / baseline:{" "}
          {model.baselineBrier?.toFixed(3)}. Lower is better; this is limited
          evaluation evidence.
        </p>
      )}
      <p>
        {model.count} eligible attempts across {model.nights} observing nights
        for this target/equipment type.
      </p>
      {!features && (
        <p className="event-warning">
          Fresh, complete JPL and weather inputs for a nighttime, above-horizon
          target are required. Historical/future epochs more than five minutes
          from now cannot produce a current sighting probability.
        </p>
      )}
      <details>
        <summary>Current provider features</summary>
        {features ? (
          <dl className="event-small-data">
            {featureNames.map((name, index) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{features[index].toFixed(3)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>
            No complete, timely feature vector is available. Missing values are
            not filled in.
          </p>
        )}
      </details>
      <details>
        <summary>Training inputs &amp; evidence requirements</summary>
        <p>
          Only reports explicitly confirmed as real observations, with equipment
          and matching JPL Sun/Moon/target snapshots, are eligible. Older logs
          without this context remain in history but are excluded. Reports
          within the same half-hour at the same site/target/equipment type are
          deduplicated; conflicting labels are excluded. This does not
          independently verify a visitor&apos;s report.
        </p>
        <p>Inputs: {featureNames.join(", ")}.</p>
        <p>
          At least 60 eligible attempts across six nights are required, with
          both outcomes in each chronological training, calibration and test
          period. A 64-tree random forest is calibrated on separate nights;
          probabilities are withheld unless it beats the training-success
          baseline on later test nights, has enough calibration support, and the
          input is within the training ranges. These minimums are safeguards,
          not proof of reliable accuracy. No artificial training observations
          are supplied.
        </p>
      </details>
    </section>
  );
}
