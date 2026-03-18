"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import Link from "next/link";
import { Star } from "lucide-react";
import type { PublicRestaurant } from "@/lib/api/restaurants";

import "leaflet/dist/leaflet.css";

const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RestaurantMapProps {
  restaurants: PublicRestaurant[];
}

export function RestaurantMap({ restaurants }: RestaurantMapProps) {
  const withCoords = restaurants.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  if (withCoords.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border bg-muted">
        <p className="text-muted-foreground">
          Keine Restaurants mit Standortdaten vorhanden.
        </p>
      </div>
    );
  }

  // Center on first restaurant or Germany center
  const center: [number, number] = [
    withCoords[0].latitude!,
    withCoords[0].longitude!,
  ];

  return (
    <div className="h-[500px] overflow-hidden rounded-lg border">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((restaurant) => (
          <Marker
            key={restaurant.id}
            position={[restaurant.latitude!, restaurant.longitude!]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                <Link
                  href={`/restaurants/${restaurant.slug}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {restaurant.name}
                </Link>
                {restaurant.average_rating !== null && (
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">
                      {restaurant.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {restaurant.address && (
                  <p className="mt-1 text-xs text-gray-600">
                    {restaurant.address}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
