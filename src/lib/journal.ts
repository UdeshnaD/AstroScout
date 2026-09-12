import type { EventTarget } from "./event-types";

export const journalRatings = [
  "Excellent",
  "Good",
  "Fair",
  "Poor",
  "Not recorded",
] as const;

export const observingConditions = [
  "Clear",
  "Hazy",
  "Partly cloudy",
  "Cloudy",
  "Windy",
  "Not recorded",
] as const;

export const equipmentOptions = [
  "Unaided eye",
  "Binoculars",
  "Telescope",
  "Camera",
  "Other",
] as const;

export type JournalRating = (typeof journalRatings)[number];
export type ObservingCondition = (typeof observingConditions)[number];

export type JournalEntry = {
  id: string;
  observedAt: string;
  location: string;
  target: string;
  equipment: string;
  notes: string;
  visibility: JournalRating;
  transparency: JournalRating;
  conditions: ObservingCondition;
};

export type ObservingList = {
  id: string;
  name: string;
  targets: string[];
};

export type PlannedAttempt = {
  id: string;
  plannedFor: string;
  location: string;
  target: string;
  plannedEquipment: "Unaided eye" | "Binoculars" | "Telescope";
  forecast: { fetchedAt: string; time: string; cloudCover: number | null; precipitation: number | null; visibility: number | null; wind: number | null };
  status: "planned" | "attempted" | "missed";
};

const cleanText = (value: unknown, limit: number) =>
  typeof value === "string" && value.trim() && value.trim().length <= limit
    ? value.trim()
    : null;

export function validJournalEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const entry = candidate as Record<string, unknown>;
    const id = cleanText(entry.id, 120);
    const observedAt = cleanText(entry.observedAt, 40);
    const location = cleanText(entry.location, 180);
    const target = cleanText(entry.target, 100);
    const equipment = cleanText(entry.equipment, 100);
    const notes = cleanText(entry.notes, 5000);
    const visibility = journalRatings.includes(entry.visibility as JournalRating)
      ? (entry.visibility as JournalRating)
      : "Not recorded";
    const transparency = journalRatings.includes(entry.transparency as JournalRating)
      ? (entry.transparency as JournalRating)
      : "Not recorded";
    const conditions = observingConditions.includes(
      entry.conditions as ObservingCondition,
    )
      ? (entry.conditions as ObservingCondition)
      : "Not recorded";
    if (
      !id ||
      !observedAt ||
      !Number.isFinite(Date.parse(observedAt)) ||
      !location ||
      !target ||
      !equipment ||
      !notes
    )
      return [];
    return [
      {
        id,
        observedAt: new Date(observedAt).toISOString(),
        location,
        target,
        equipment,
        notes,
        visibility,
        transparency,
        conditions,
      },
    ];
  }).slice(-500);
}

export function mergeJournalEntries(
  current: JournalEntry[],
  incoming: JournalEntry[],
) {
  const merged = new Map<string, JournalEntry>();
  for (const entry of [...current, ...incoming]) merged.set(entry.id, entry);
  return [...merged.values()]
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))
    .slice(0, 500);
}

export function validPlannedAttempts(value: unknown): PlannedAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    const forecast = row.forecast as Record<string, unknown> | undefined;
    const id = cleanText(row.id, 120), plannedFor = cleanText(row.plannedFor, 40);
    const location = cleanText(row.location, 180), target = cleanText(row.target, 100);
    if (!id || !plannedFor || !location || !target || !forecast || !Number.isFinite(Date.parse(plannedFor)) || !Number.isFinite(Date.parse(String(forecast.fetchedAt))) || !Number.isFinite(Date.parse(String(forecast.time))) || !["Unaided eye", "Binoculars", "Telescope"].includes(String(row.plannedEquipment)) || !["planned", "attempted", "missed"].includes(String(row.status))) return [];
    const number = (key: string) => typeof forecast[key] === "number" && Number.isFinite(forecast[key]) ? forecast[key] : null;
    return [{ id, plannedFor: new Date(plannedFor).toISOString(), location, target, plannedEquipment: row.plannedEquipment as PlannedAttempt["plannedEquipment"], status: row.status as PlannedAttempt["status"], forecast: { fetchedAt: String(forecast.fetchedAt), time: String(forecast.time), cloudCover: number("cloudCover"), precipitation: number("precipitation"), visibility: number("visibility"), wind: number("wind") } }];
  }).slice(-200);
}

export function validObservingLists(value: unknown): ObservingList[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const list = candidate as Record<string, unknown>;
    const id = cleanText(list.id, 120);
    const name = cleanText(list.name, 60);
    if (!id || !name || !Array.isArray(list.targets)) return [];
    const targets = [
      ...new Set(
        list.targets.flatMap((target) => {
          const value = cleanText(target, 100);
          return value ? [value] : [];
        }),
      ),
    ].slice(0, 30);
    return [{ id, name, targets }];
  }).slice(0, 30);
}

export function targetLabel(target: EventTarget) {
  return target[0].toUpperCase() + target.slice(1);
}
