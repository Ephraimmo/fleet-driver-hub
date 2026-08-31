export interface GeoPoint {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}

const R = 6371;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function etaMinutes(distanceKm: number, avgSpeedKmh = 28): number {
  if (!isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function formatKm(km?: number | null) {
  if (km === null || km === undefined || !isFinite(km)) return "—";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatMoney(value?: number | null) {
  const n = typeof value === "number" && isFinite(value) ? value : 0;
  return `R${n.toFixed(2)}`;
}

export interface MapDestination {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  address?: string | null | undefined;
}

/** Build a Google Maps URL using the ?q=lat,lng format (drops a pin at the order location). */
export function directionsUrl(dest: MapDestination, origin?: GeoPoint | null): string | null {
  const hasCoords =
    typeof dest.latitude === "number" &&
    typeof dest.longitude === "number" &&
    isFinite(dest.latitude) &&
    isFinite(dest.longitude);
  const destination = hasCoords
    ? `${dest.latitude},${dest.longitude}`
    : dest.address?.trim()
      ? dest.address.trim()
      : null;
  if (!destination) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(destination)}`;
}

/** Launch Google Maps navigation in a new tab / the native app. */
export function openDirections(dest: MapDestination, origin?: GeoPoint | null): boolean {
  const url = directionsUrl(dest, origin);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
