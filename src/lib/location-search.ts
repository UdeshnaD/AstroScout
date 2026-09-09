export type LocationSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  elevation: number;
  country: string | null;
  region: string | null;
};

type GeoapifyResult = {
  place_id?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lon?: number;
};

type OpenMeteoResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  country?: string;
  admin1?: string;
  admin2?: string;
};

function finiteCoordinate(value: unknown, limit: number) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

export function parseGeoapifyResults(
  rows: GeoapifyResult[],
): LocationSearchResult[] {
  return rows.flatMap((row, index) => {
    if (!finiteCoordinate(row.lat, 90) || !finiteCoordinate(row.lon, 180))
      return [];
    const label =
      row.formatted?.trim() ||
      [row.address_line1, row.address_line2].filter(Boolean).join(", ") ||
      row.city?.trim();
    if (!label) return [];
    return [
      {
        id: row.place_id || `geoapify-${index}-${row.lat}-${row.lon}`,
        label,
        latitude: row.lat as number,
        longitude: row.lon as number,
        elevation: 0,
        country: row.country?.trim() || null,
        region: row.state?.trim() || null,
      },
    ];
  });
}

export function parseOpenMeteoResults(
  rows: OpenMeteoResult[],
): LocationSearchResult[] {
  return rows.flatMap((row, index) => {
    if (
      !row.name?.trim() ||
      !finiteCoordinate(row.latitude, 90) ||
      !finiteCoordinate(row.longitude, 180)
    )
      return [];
    const context = [row.admin2, row.admin1, row.country]
      .filter(
        (part, partIndex, all) =>
          part && all.indexOf(part) === partIndex,
      )
      .join(", ");
    return [
      {
        id: String(
          row.id ??
            `open-meteo-${index}-${row.latitude}-${row.longitude}`,
        ),
        label: context ? `${row.name}, ${context}` : row.name,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        elevation:
          typeof row.elevation === "number" && Number.isFinite(row.elevation)
            ? row.elevation
            : 0,
        country: row.country?.trim() || null,
        region: row.admin1?.trim() || null,
      },
    ];
  });
}
