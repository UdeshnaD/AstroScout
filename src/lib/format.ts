export function formatDistance(km: number) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatClock(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}

export function departureTimeFor(
  startTime: string,
  travelTimeMinutes: number,
  setupMinutes = 20,
) {
  const date = new Date(startTime);
  date.setMinutes(date.getMinutes() - travelTimeMinutes - setupMinutes);
  return formatClock(date);
}

export function toDateTimeLocalValue(date: Date) {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
}
