import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { getNearbyEchoes, type Echo } from "../../lib/echo-service";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          accuracy: Location.Accuracy.Balanced,
        });

        const newLocation = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        };
        setLocation(newLocation);
        setError(null);

        // Fetch nearby echoes
        await fetchNearbyEchoes(newLocation);
      } catch (err) {
        console.error("Location error:", err);
        setError("Failed to get location");
      } finally {
        setLoading(false);
      }
    };

    requestLocationAndFetchEchoes();
  }, []);

  const fetchNearbyEchoes = async (loc: UserLocation) => {
    try {
      const nearbyEchoes = await getNearbyEchoes(
        loc.latitude,
        loc.longitude,
        500,
      );
      setEchoes(nearbyEchoes);
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
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* User location marker */}
        <Marker
          coordinate={location}
          title="Your Location"
          description="You are here"
          pinColor="#0084ff"
        />

        {/* Detection radius circle (500m) */}
        <Circle
          center={location}
          radius={500}
          fillColor="rgba(0, 132, 255, 0.1)"
          strokeColor="rgba(0, 132, 255, 0.3)"
          strokeWidth={1}
        />

        {/* Echo markers from nearby echoes */}
        {echoes.map((echo) => (
          <Marker
            key={echo.id}
            coordinate={{
              latitude: echo.latitude,
              longitude: echo.longitude,
            }}
            title={echo.user_id}
            description={`⭐ ${echo.rating_score || 0}`}
            pinColor="#ff6b6b"
            onPress={() => handleEchoPress(echo.id)}
          />
        ))}
      </MapView>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>EchoFrame</Text>
        <Text style={styles.infoText}>
          Your location: {location.latitude.toFixed(4)},{" "}
          {location.longitude.toFixed(4)}
        </Text>
        <Text style={styles.infoSubtext}>
          {echoes.length} {echoes.length === 1 ? "echo" : "echoes"} nearby • Tap
          to view
        </Text>
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
  infoBox: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0084ff",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 13,
    color: "#999",
  },
});
