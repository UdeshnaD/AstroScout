"use client";
import { EventDesk } from "./EventDesk";
import type { RankedPlan } from "@/lib/recommender";
import type { TargetId } from "@/lib/observation-model";
export function TonightView(props: { time: string; latitude: number; longitude: number; location: string; plan?: RankedPlan; hour: number; onHour: (hour: number) => void; onObserve: (target: TargetId) => void }) {
  return <EventDesk initialLocation={{ latitude: props.latitude, longitude: props.longitude, elevation: 0 }} initialUtc={props.time} />;
}
