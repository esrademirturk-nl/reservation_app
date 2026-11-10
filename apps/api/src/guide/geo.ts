/** Straight-line distance in metres (haversine). */
export function distanceM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Walking minutes: streets are ~30% longer than a straight line, walking speed ~80 m/min. */
export const walkMinutes = (metres: number) =>
  Math.max(1, Math.ceil((metres * 1.3) / 80));
