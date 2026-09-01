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

/**
 * Build a Google Maps URL for the destination.
 *
 * Uses the canonical `/maps/place/<lat>,<lng>/@<lat>,<lng>,17z` format — the same
 * shape Google itself produces when you share a pin. Commas are left unencoded
 * (encoding them as %2C is what triggered ERR_BLOCKED_BY_RESPONSE).
 */
export function directionsUrl(dest: MapDestination, _origin?: GeoPoint | null): string | null {
  const lat = typeof dest.latitude === "number" && isFinite(dest.latitude) ? dest.latitude : null;
  const lng = typeof dest.longitude === "number" && isFinite(dest.longitude) ? dest.longitude : null;

  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},17z`;
  }

  const address = dest.address?.trim();
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}


/** Launch Google Maps navigation in a new tab / the native app. */
export function openDirections(dest: MapDestination, origin?: GeoPoint | null): boolean {
  const url = directionsUrl(dest, origin);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
