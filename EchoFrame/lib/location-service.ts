import * as Location from "expo-location";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Location permission request failed:", error);
    return false;
  }
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Background location permission request failed:", error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<LocationCoordinates | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Location permission not granted");
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

export async function startLocationTracking(
  callback: (location: LocationCoordinates) => void,
  intervalSeconds: number = 10,
): Promise<Location.LocationSubscription | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Location permission not granted");
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalSeconds * 1000,
        distanceInterval: 10, // Minimum 10m change to trigger update
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
        });
      },
    );

    return subscription;
  } catch (error) {
    console.error("Error starting location tracking:", error);
    return null;
  }
}

export function stopLocationTracking(
  subscription: Location.LocationSubscription | null,
): void {
  if (subscription) {
    subscription.remove();
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a coordinate is within a radius of another coordinate
 */
export function isWithinRadius(
  targetLat: number,
  targetLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(
    centerLat,
    centerLon,
    targetLat,
    targetLon,
  );
  return distance <= radiusMeters;
}
