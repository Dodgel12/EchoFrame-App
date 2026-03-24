import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    useColorScheme,
    View,
} from "react-native";

interface Settings {
  notificationsEnabled: boolean;
  locationTrackingEnabled: boolean;
  defaultVisibility: "public" | "circle";
  proximityRadius: number;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    locationTrackingEnabled: true,
    defaultVisibility: "public",
    proximityRadius: 500,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem("app_settings");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem("app_settings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const toggleNotifications = () => {
    const newSettings = {
      ...settings,
      notificationsEnabled: !settings.notificationsEnabled,
    };
    saveSettings(newSettings);
  };

  const toggleLocationTracking = () => {
    const newSettings = {
      ...settings,
      locationTrackingEnabled: !settings.locationTrackingEnabled,
    };
    saveSettings(newSettings);
  };

  const isDark = colorScheme === "dark";

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          Notifications
        </Text>

        <View style={[styles.settingRow, isDark && styles.darkSettingRow]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDark && styles.darkText]}>
              Echo Alerts
            </Text>
            <Text
              style={[styles.settingDescription, isDark && styles.darkSubtext]}
            >
              Receive notifications when echoes are nearby
            </Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: "#ccc", true: "#81c784" }}
            thumbColor={settings.notificationsEnabled ? "#4caf50" : "#f1f3f5"}
          />
        </View>

        <View style={[styles.settingRow, isDark && styles.darkSettingRow]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDark && styles.darkText]}>
              Location Tracking
            </Text>
            <Text
              style={[styles.settingDescription, isDark && styles.darkSubtext]}
            >
              Allow background location access for discovery
            </Text>
          </View>
          <Switch
            value={settings.locationTrackingEnabled}
            onValueChange={toggleLocationTracking}
            trackColor={{ false: "#ccc", true: "#81c784" }}
            thumbColor={
              settings.locationTrackingEnabled ? "#4caf50" : "#f1f3f5"
            }
          />
        </View>
      </View>

      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          Privacy
        </Text>

        <View style={[styles.settingRow, isDark && styles.darkSettingRow]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDark && styles.darkText]}>
              Default Visibility
            </Text>
            <Text
              style={[styles.settingDescription, isDark && styles.darkSubtext]}
            >
              How new echoes appear by default
            </Text>
          </View>
          <Text style={[styles.visibilityBadge, styles.publicBadge]}>
            {settings.defaultVisibility === "public" ? "Public" : "Circle"}
          </Text>
        </View>
      </View>

      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          Discovery
        </Text>

        <View style={[styles.settingRow, isDark && styles.darkSettingRow]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDark && styles.darkText]}>
              Detection Radius
            </Text>
            <Text
              style={[styles.settingDescription, isDark && styles.darkSubtext]}
            >
              {settings.proximityRadius}m
            </Text>
          </View>
          <Text style={[styles.proximityValue, isDark && styles.darkText]}>
            500m
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.section,
          styles.infoSection,
          isDark && styles.darkSection,
        ]}
      >
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          About
        </Text>
        <Text style={[styles.infoText, isDark && styles.darkSubtext]}>
          EchoFrame v1.0.0{"\n"}Location-based photo discovery
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  darkContainer: {
    backgroundColor: "#1a1a1a",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  darkSection: {
    backgroundColor: "#2a2a2a",
    borderBottomColor: "#333",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0084ff",
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: "uppercase",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
  },
  darkSettingRow: {
    borderBottomColor: "#333",
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  darkText: {
    color: "#fff",
  },
  settingDescription: {
    fontSize: 13,
    color: "#999",
  },
  darkSubtext: {
    color: "#aaa",
  },
  visibilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  publicBadge: {
    backgroundColor: "#e8f1ff",
    color: "#0084ff",
  },
  proximityValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0084ff",
  },
  infoSection: {
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: "#999",
    paddingVertical: 12,
  },
});
