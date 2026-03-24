import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface UserLocation {
  latitude: number;
  longitude: number;
}

const DETECTION_RADIUS_METERS = 500; // Detect echoes up to 500m away
const PROXIMITY_RADIUS_METERS = 50; // Reveal echo details at 50m or closer

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111000; // Rough conversion to meters
};

export default function MapScreen() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closestDistance, setClosestDistance] = useState<number | null>(null);
  const [radarPulse] = useState(new Animated.Value(0));
  const router = useRouter();

  useEffect(() => {
    const requestLocationAndFetchEchoes = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied");
          setLoading(false);
          return;
        }

        const userLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        const newLocation = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        };
        setLocation(newLocation);
        setError(null);

        // Fetch echoes with 50m proximity radius
        await fetchNearbyEchoes(newLocation);

        // Start polling for location updates every 5 seconds
        const interval = setInterval(() => {
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          })
            .then((result) => {
              const updated = {
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
              };
              setLocation(updated);
              fetchNearbyEchoes(updated);
            })
            .catch(console.error);
        }, 5000);

        return () => clearInterval(interval);
      } catch (err) {
        console.error("Location error:", err);
        setError("Failed to get location");
      } finally {
        setLoading(false);
      }
    };

    requestLocationAndFetchEchoes();
  }, []);

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
        // Restart pulse
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
      // Fetch echoes within detection radius (500m)
      const nearbyEchoes = await getNearbyEchoes(
        loc.latitude,
        loc.longitude,
        DETECTION_RADIUS_METERS,
      );
      setEchoes(nearbyEchoes);

      // Calculate closest distance
      if (nearbyEchoes.length > 0) {
        const distances = nearbyEchoes.map((echo) =>
          calculateDistance(
            loc.latitude,
            loc.longitude,
            echo.latitude,
            echo.longitude,
          ),
        );
        setClosestDistance(Math.min(...distances));
      } else {
        setClosestDistance(null);
      }
    } catch (err) {
      console.error("Error fetching echoes:", err);
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
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0045,
          longitudeDelta: 0.0045,
        }}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0045,
          longitudeDelta: 0.0045,
        }}
      >
        {/* User location marker - blue pulse */}
        <Marker
          coordinate={location}
          title="You"
          pinColor="#0084ff"
          flat={true}
        >
          <View style={styles.userMarkerContainer}>
            <View style={styles.userMarkerInner} />
          </View>
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
