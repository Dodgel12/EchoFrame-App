import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { getNearbyEchoes, type Echo } from "../../lib/echo-service";
import { calculateDistance as haversineDistance } from "../../lib/location-service";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
}

const DETECTION_RADIUS_METERS = 1000; // Detect echoes up to 1000m away
const PROXIMITY_RADIUS_METERS = 75; // Reveal echo details at 75m or closer

// Use accurate Haversine distance calculation from location service
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  return haversineDistance(lat1, lon1, lat2, lon2);
};

export default function MapScreen() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closestDistance, setClosestDistance] = useState<number | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [radarPulse] = useState(new Animated.Value(0));
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const headingAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const lastEchoFetchRef = useRef<number>(0);
  const lastLocationRef = useRef<{ lat: number; lon: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied");
          setLoading(false);
          return;
        }

        // Get initial location
        const userLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maxAge: 0,
          timeout: 5000,
        });

        const newLocation = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          accuracy: userLocation.coords.accuracy ?? undefined,
          heading: userLocation.coords.heading ?? undefined,
        };
        setLocation(newLocation);
        if (
          userLocation.coords.heading !== null &&
          userLocation.coords.heading !== undefined
        ) {
          headingAnim.setValue(userLocation.coords.heading);
        }
        setError(null);

        // Fetch initial echoes
        await fetchNearbyEchoes(newLocation);

        // Start continuous location tracking with watchPositionAsync
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 500, // Update every 500ms to capture heading changes
            distanceInterval: 2, // Minimum 2m movement to avoid GPS noise while staying responsive
          },
          (result) => {
            const updated = {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
              accuracy: result.coords.accuracy ?? undefined,
              heading: result.coords.heading ?? undefined,
            };

            // Check if position has actually changed (avoid GPS noise artifacts)
            const currentLat = result.coords.latitude;
            const currentLon = result.coords.longitude;
            const hasPositionChanged =
              !lastLocationRef.current ||
              haversineDistance(
                lastLocationRef.current.lat,
                lastLocationRef.current.lon,
                currentLat,
                currentLon,
              ) >= 1; // Update if moved 1m or more

            // Always update heading if valid (rotates arrow even when stationary)
            if (
              result.coords.heading !== null &&
              result.coords.heading !== undefined &&
              result.coords.heading >= 0
            ) {
              headingAnim.setValue(result.coords.heading);
            }

            // Only update location state and map if position changed
            if (hasPositionChanged) {
              lastLocationRef.current = { lat: currentLat, lon: currentLon };
              setLocation(updated);

              // Animate map to follow user smoothly
              if (isFollowingUser && mapRef.current) {
                mapRef.current.animateToRegion(
                  {
                    latitude: updated.latitude,
                    longitude: updated.longitude,
                    latitudeDelta: 0.0035, // Increased precision zoom
                    longitudeDelta: 0.0035,
                  },
                  300, // 300ms animation for snappier response
                );
              }

              // Update echoes in real-time (debounce to avoid excessive calls)
              const now = Date.now();
              if (
                echoes.length === 0 ||
                now - lastEchoFetchRef.current > 1000
              ) {
                lastEchoFetchRef.current = now;
                fetchNearbyEchoes(updated);
              }
            }
          },
        );

        locationSubscriptionRef.current = subscription;
        setLoading(false);
      } catch (err) {
        console.error("Location error:", err);
        setError("Failed to get location");
        setLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, [isFollowingUser]);

  // Animate radar pulse
  useEffect(() => {
    if (echoes.length > 0) {
      Animated.sequence([
        Animated.timing(radarPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(radarPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]).start(() => {
        Animated.timing(radarPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [echoes.length]);

  const fetchNearbyEchoes = async (loc: UserLocation) => {
    try {
      const nearbyEchoes = await getNearbyEchoes(
        loc.latitude,
        loc.longitude,
        DETECTION_RADIUS_METERS,
      );

      if (!Array.isArray(nearbyEchoes)) {
        console.warn("getNearbyEchoes returned non-array:", nearbyEchoes);
        setEchoes([]);
        setClosestDistance(null);
        return;
      }

      setEchoes(nearbyEchoes);

      if (nearbyEchoes.length > 0) {
        const distances = nearbyEchoes.map((echo) =>
          haversineDistance(
            loc.latitude,
            loc.longitude,
            echo.latitude,
            echo.longitude,
          ),
        );
        const minDist = Math.min(...distances);
        setClosestDistance(isFinite(minDist) ? minDist : null);
      } else {
        setClosestDistance(null);
      }
    } catch (err) {
      console.error("Error fetching echoes:", err);
      setEchoes([]);
      setClosestDistance(null);
    }
  };

  const handleCenterOnMe = () => {
    if (location && mapRef.current) {
      setIsFollowingUser(true);
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0045,
          longitudeDelta: 0.0045,
        },
        500,
      );
    }
  };

  const handleEchoPress = (echoId: string) => {
    router.push(`/(app)/echo/${echoId}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0084ff" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not determine location</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0035,
          longitudeDelta: 0.0035,
        }}
        onRegionChangeComplete={() => setIsFollowingUser(false)}
        showsUserLocation={false}
        loadingEnabled={true}
        loadingIndicatorColor="#0084ff"
      >
        {/* User location marker - custom map pointer */}
        <Marker
          coordinate={location}
          title="You"
          flat={true}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={1}
        >
          <Animated.Image
            source={require("../../assets/echoframes/pngtree-navigation-arrow-map-pointer-vector-png-image_12636239.png")}
            style={[
              styles.userMarker,
              {
                transform: [
                  {
                    rotate: headingAnim.interpolate({
                      inputRange: [0, 360],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </Marker>

        {/* Proximity radius circle (50m) */}
        <Circle
          center={location}
          radius={PROXIMITY_RADIUS_METERS}
          fillColor="rgba(0, 132, 255, 0.08)"
          strokeColor="rgba(0, 132, 255, 0.4)"
          strokeWidth={2}
        />

        {/* Detection radius circle (500m) - subtle */}
        <Circle
          center={location}
          radius={DETECTION_RADIUS_METERS}
          fillColor="rgba(0, 132, 255, 0.02)"
          strokeColor="rgba(0, 132, 255, 0.15)"
          strokeWidth={1}
        />

        {/* Echo markers - revealed or mystery */}
        {echoes.map((echo) => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            echo.latitude,
            echo.longitude,
          );
          const isRevealed = distance <= PROXIMITY_RADIUS_METERS;

          return (
            <Marker
              key={echo.id}
              coordinate={{
                latitude: echo.latitude,
                longitude: echo.longitude,
              }}
              title={isRevealed ? "Echo" : "Mystery"}
              description={
                isRevealed
                  ? `⭐ ${echo.rating_score || 0}`
                  : "Get closer to reveal"
              }
              onPress={() => isRevealed && handleEchoPress(echo.id)}
              zIndex={100}
            >
              <TouchableOpacity
                onPress={() => isRevealed && handleEchoPress(echo.id)}
                disabled={!isRevealed}
                style={[
                  styles.markerContainer,
                  !isRevealed && styles.markerDisabled,
                ]}
              >
                <View
                  style={[
                    styles.echoMarker,
                    isRevealed ? styles.revealedMarker : styles.mysteryMarker,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {isRevealed ? "📍" : "?"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {/* Top status bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>EchoFrame Radar</Text>
        <Text style={styles.topBarSubtitle}>
          {echoes.length} {echoes.length === 1 ? "echo" : "echoes"} nearby
        </Text>
      </View>

      {/* Center on me button - Google Maps style */}
      <TouchableOpacity
        style={styles.centerOnMeButton}
        onPress={handleCenterOnMe}
      >
        <Ionicons name="locate" size={24} color="#0084ff" />
      </TouchableOpacity>

      {/* Map type toggle button - Satellite/Standard */}
      <TouchableOpacity
        style={styles.mapTypeButton}
        onPress={() =>
          setMapType(mapType === "standard" ? "satellite" : "standard")
        }
      >
        <Ionicons
          name={mapType === "satellite" ? "map" : "satellite"}
          size={24}
          color="#0084ff"
        />
      </TouchableOpacity>

      {/* Bottom info card - Life360 style */}
      <View style={styles.infoCard}>
        {echoes.length > 0 ? (
          <>
            <View style={styles.proximityIndicatorContainer}>
              <View style={styles.proximityDot} />
              <Text style={styles.proximityLabel}>
                Closest:{" "}
                {closestDistance && closestDistance < 1
                  ? "Right here!"
                  : `${closestDistance?.toFixed(0) || 0}m away`}
              </Text>
            </View>
            <Text style={styles.cardDescription}>
              {echoes.length === 1
                ? "1 echo detected"
                : `${echoes.length} echoes detected`}
            </Text>
            <Text style={styles.cardHint}>
              📍 = Revealed • ? = Mystery (get closer to reveal)
            </Text>
          </>
        ) : (
          <>
            <View style={styles.noEchoContainer}>
              <Text style={styles.noEchoEmoji}>🔍</Text>
              <Text style={styles.cardDescription}>No echoes nearby</Text>
              <Text style={styles.cardHint}>
                Walk within 500 meters to see mystery markers
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 16,
    textAlign: "center",
  },

  // User marker styles
  userMarkerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 132, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0084ff",
  },
  userMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0084ff",
  },

  // Custom user marker icon
  userMarker: {
    width: 40,
    height: 40,
  },

  // Echo marker styles
  markerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  markerDisabled: {
    opacity: 0.7,
  },
  echoMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  revealedMarker: {
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#ff6b6b",
  },
  mysteryMarker: {
    backgroundColor: "#6c757d",
    borderWidth: 2,
    borderColor: "#495057",
  },
  markerText: {
    fontSize: 20,
    fontWeight: "600",
  },

  // Top status bar
  topBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0084ff",
    marginBottom: 4,
  },
  topBarSubtitle: {
    fontSize: 13,
    color: "#666",
  },

  // Center on me button (floating action button)
  centerOnMeButton: {
    position: "absolute",
    bottom: 280,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Map type toggle button (Satellite/Standard)
  mapTypeButton: {
    position: "absolute",
    bottom: 350,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Bottom info card (Life360 style)
  infoCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },

  // Proximity indicator
  proximityIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  proximityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff6b6b",
    marginRight: 8,
  },
  proximityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Card text
  cardDescription: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  cardHint: {
    fontSize: 13,
    color: "#999",
  },

  // No echo state
  noEchoContainer: {
    alignItems: "center",
  },
  noEchoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
});
