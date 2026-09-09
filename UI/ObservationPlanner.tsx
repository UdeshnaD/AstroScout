"use client";
import { EventDesk } from "./EventDesk";
import type { RankedPlan } from "@/lib/recommender";
import type { TargetId } from "@/lib/observation-model";
export function ObservationPlanner(props: { plan: RankedPlan; hour: number; onHour: (hour: number) => void; mode?: "observe" | "journal" | "evidence"; requestedTarget?: TargetId }) {
  return <EventDesk initialLocation={{ latitude: props.plan.latitude, longitude: props.plan.longitude, elevation: 0 }} initialUtc={props.plan.weather.hourly[props.hour]?.time} />;
}
