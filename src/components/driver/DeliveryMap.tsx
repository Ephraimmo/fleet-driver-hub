import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";

export interface MapMarker {
  latitude: number;
  longitude: number;
  label: string;
  kind: "driver" | "pickup" | "dropoff";
}

// Default marker icons 404 under bundlers — fix once.
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const isValid = (m: MapMarker) =>
  Number.isFinite(m.latitude) &&
  Number.isFinite(m.longitude) &&
  m.latitude >= -90 &&
  m.latitude <= 90 &&
  m.longitude >= -180 &&
  m.longitude <= 180;

function Recenter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0]!, 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

export default function DeliveryMap({
  markers,
  className,
}: {
  markers: MapMarker[];
  className?: string;
}) {
  const valid = useMemo(() => markers.filter(isValid), [markers]);
  const points = useMemo<[number, number][]>(
    () => valid.map((m) => [m.latitude, m.longitude]),
    [valid],
  );

  if (valid.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center ${className ?? ""}`}
      >
        <MapPin className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No location coordinates available for this delivery yet.
        </p>
      </div>
    );
  }

  return (
    <div className={className} style={{ minHeight: 224 }}>
      <MapContainer
        center={points[0]!}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", minHeight: 224 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {valid.map((m, i) => (
          <Marker key={`${m.kind}-${i}`} position={[m.latitude, m.longitude]}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
        <Recenter points={points} />
      </MapContainer>
    </div>
  );
}
