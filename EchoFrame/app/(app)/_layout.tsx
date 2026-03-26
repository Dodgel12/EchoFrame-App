import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";
import {
  setupNotificationResponseListener,
  startAutoPolling,
} from "../../lib/discovery-service";

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start location polling and notification listener
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    try {
      // Set up notification tap handler
      const subscription = setupNotificationResponseListener((echoId) => {
        // Navigation to echo detail handled by notification listener
        console.log("Echo tapped from notification:", echoId);
      });

      // Start auto-polling for echoes
      try {
        pollingInterval = startAutoPolling();
        console.log("Auto-polling started successfully");
      } catch (pollingError) {
        console.error(
          "Error starting auto-polling, app will continue without background polling:",
          pollingError,
        );
        // Don't throw - let the app continue even if polling fails
      }

      return () => {
        subscription?.remove();
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      };
    } catch (error) {
      console.error("Error in AppLayout effect:", error);
      // Return empty cleanup function - don't crash the app
      return () => {};
    }
  }, []);

  const tabBarBackgroundColor = colorScheme === "dark" ? "#1a1a1a" : "#fff";
  const tabBarActiveTintColor = "#0084ff";
  const tabBarInactiveTintColor = colorScheme === "dark" ? "#888" : "#999";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarActiveTintColor,
        tabBarInactiveTintColor: tabBarInactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopColor: colorScheme === "dark" ? "#333" : "#eee",
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderBottomColor: colorScheme === "dark" ? "#333" : "#eee",
          borderBottomWidth: 1,
        },
        headerTintColor: tabBarActiveTintColor,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <Ionicons name="map" size={28} color={color} />
          ),
          headerTitle: "Nearby Echoes",
        }}
      />

      <Tabs.Screen
        name="camera"
        options={{
          title: "Capture",
          tabBarIcon: ({ color }) => (
            <Ionicons name="camera" size={28} color={color} />
          ),
          headerTitle: "Capture Echo",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={28} color={color} />
          ),
          headerTitle: "Your Profile",
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={28} color={color} />
          ),
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}
