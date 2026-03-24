import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Echo, getNearbyEchoes } from "./echo-service";
import { LocationCoordinates } from "./location-service";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Notification permission request failed:", error);
    return false;
  }
}

export async function checkForNearbyEchoes(
  userLocation: LocationCoordinates,
  proximityRadius: number = 500,
): Promise<Echo[]> {
  try {
    const nearbyEchoes = await getNearbyEchoes(
      userLocation.latitude,
      userLocation.longitude,
      proximityRadius,
    );

    if (!nearbyEchoes.length) {
      return [];
    }

    // Filter for echoes the user hasn't already discovered
    const discoveredEchoIds = await getDiscoveredEchoIds();
    const newEchoes = nearbyEchoes.filter(
      (echo) => !discoveredEchoIds.includes(echo.id),
    );

    return newEchoes;
  } catch (error) {
    console.error("Error checking for nearby echoes:", error);
    return [];
  }
}

export async function sendEchoDiscoveryNotification(echo: Echo): Promise<void> {
  try {
    // Get location name (placeholder - could use reverse geocoding)
    const locationName = `${echo.latitude.toFixed(4)}, ${echo.longitude.toFixed(4)}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎵 Echo Found Nearby",
        body: `Someone left a memory here at ${locationName}`,
        data: {
          echoId: echo.id,
          type: "echo_discovery",
        },
      },
      trigger: null, // Immediate
    });

    // Mark echo as discovered
    await markEchoAsDiscovered(echo.id);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

export async function getDiscoveredEchoIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem("discovered_echoes");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting discovered echoes:", error);
    return [];
  }
}

export async function markEchoAsDiscovered(echoId: string): Promise<void> {
  try {
    const discovered = await getDiscoveredEchoIds();
    if (!discovered.includes(echoId)) {
      discovered.push(echoId);
      await AsyncStorage.setItem(
        "discovered_echoes",
        JSON.stringify(discovered),
      );
    }
  } catch (error) {
    console.error("Error marking echo as discovered:", error);
  }
}

export async function clearDiscoveredEchoes(): Promise<void> {
  try {
    await AsyncStorage.removeItem("discovered_echoes");
  } catch (error) {
    console.error("Error clearing discovered echoes:", error);
  }
}

/**
 * Setup notification response handler for when user taps a notification
 */
export function setupNotificationResponseListener(
  onEchoDiscovered: (echoId: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const echoId = response.notification.request.content.data?.echoId;
    if (echoId) {
      onEchoDiscovered(echoId);
    }
  });
}

/**
 * Polling-based discovery: Check for nearby echoes periodically
 */
export async function startPollingForEchoes(
  getLocation: () => Promise<LocationCoordinates | null>,
  onEchoFound: (echo: Echo) => void,
  intervalSeconds: number = 60,
  proximityRadius: number = 500,
): Promise<NodeJS.Timeout | null> {
  const pollFunction = async () => {
    try {
      const location = await getLocation();
      if (!location) return;

      const newEchoes = await checkForNearbyEchoes(location, proximityRadius);

      for (const echo of newEchoes) {
        onEchoFound(echo);
      }
    } catch (error) {
      console.error("Error in polling loop:", error);
    }
  };

  // Run once immediately
  await pollFunction();

  // Set up interval
  const intervalId = setInterval(pollFunction, intervalSeconds * 1000);
  return intervalId;
}

export function stopPollingForEchoes(
  pollInterval: NodeJS.Timeout | null,
): void {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
}

/**
 * Simplified auto-starting polling for use in app layout
 * Starts background polling every 60 seconds for nearby echoes
 */
export function startAutoPolling(): NodeJS.Timeout {
  let pollInterval: NodeJS.Timeout | null = null;

  // Start polling with a small delay to allow location initialization
  setTimeout(async () => {
    try {
      const { getCurrentLocation } = await import("./location-service");

      pollInterval = setInterval(async () => {
        try {
          const location = await getCurrentLocation();
          if (!location) return;

          const newEchoes = await checkForNearbyEchoes(location, 500);
          for (const echo of newEchoes) {
            await sendEchoDiscoveryNotification(echo);
          }
        } catch (error) {
          console.error("Auto-polling error:", error);
        }
      }, 60000); // Poll every 60 seconds
    } catch (error) {
      console.error("Failed to initialize auto-polling:", error);
    }
  }, 1000);

  // Return a dummy interval that gets replaced
  return setInterval(() => {}, 60000);
}
