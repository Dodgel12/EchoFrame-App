import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../../lib/auth-context";
import type { Echo } from "../../../lib/echo-service";
import { deleteEcho, getEchoById, rateEcho } from "../../../lib/echo-service";

export default function EchoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [echo, setEcho] = useState<Echo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [userRating, setUserRating] = useState<1 | -1 | null>(null);

  const fetchEcho = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getEchoById(id as string);
      setEcho(data);
      // TODO: Fetch user's rating from database
    } catch (error) {
      console.error("Error fetching echo:", error);
      Alert.alert("Error", "Failed to load echo");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEcho();
  }, [fetchEcho]);

  const handleRate = async (value: 1 | -1) => {
    if (!echo || !user?.id || ratingLoading) return;

    setRatingLoading(true);
    try {
      const success = await rateEcho(echo.id, user.id, value);
      if (success) {
        setUserRating(userRating === value ? null : value);
        // Refresh echo to get updated rating
        fetchEcho();
      } else {
        Alert.alert("Error", "Failed to rate echo");
      }
    } catch (error) {
      console.error("Rating error:", error);
      Alert.alert("Error", "Failed to rate echo");
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!echo) return;

    Alert.alert(
      "Delete Echo",
      "Are you sure you want to delete this echo? This action cannot be undone.",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            setDeletingLoading(true);
            try {
              await deleteEcho(echo.id);
              // Clear the echo state immediately
              setEcho(null);
              Alert.alert("Success", "Echo deleted successfully", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              console.error("Delete error:", error);
              // Handle already-deleted echoes gracefully
              if (
                error.message?.includes("not found") ||
                error.code === "ECHO_NOT_FOUND" ||
                error.code === "PGRST116"
              ) {
                Alert.alert(
                  "Echo Already Deleted",
                  "This echo was already deleted. Returning to previous screen...",
                  [
                    {
                      text: "OK",
                      onPress: () => router.back(),
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete echo. Please try again.",
                );
              }
            } finally {
              setDeletingLoading(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  if (!echo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Echo not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const timeAgo = new Date(echo.created_at);
  const now = new Date();
  const diffMs = now.getTime() - timeAgo.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let timeString = "";
  if (diffMins < 60) timeString = `${diffMins}m ago`;
  else if (diffHours < 24) timeString = `${diffHours}h ago`;
  else timeString = `${diffDays}d ago`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0084ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Echo Details</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main image with overlay */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: echo.image_url }} style={styles.mainImage} />
        <View style={styles.imageOverlay}>
          <Text style={styles.echoLabel}>📸 Echo</Text>
          <Text style={styles.visibilityBadge}>
            {echo.visibility === "public" ? "🌍 Public" : "👥 Circle"}
          </Text>
        </View>
      </View>

      {/* What is this section */}
      <View style={styles.explanationSection}>
        <Text style={styles.explanationTitle}>What is an Echo?</Text>
        <Text style={styles.explanationText}>
          A moment captured and shared at a specific location. Walk within 50m
          to discover echoes from people around you.
        </Text>
      </View>

      {/* User info - more prominent */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {echo.user?.username || "Anonymous"}
          </Text>
          <Text style={styles.timestamp}>{timeString}</Text>
          <Text style={styles.userHint}>Shared a moment</Text>
        </View>
      </View>

      {/* Location & Timestamp info - card style */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="location" size={20} color="#0084ff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {echo.latitude.toFixed(4)}, {echo.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="time" size={20} color="#0084ff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Captured</Text>
            <Text style={styles.infoValue}>
              {new Date(echo.timestamp).toLocaleDateString()}{" "}
              {new Date(echo.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="star" size={20} color="#ffa500" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Community Rating</Text>
            <Text style={styles.infoValue}>
              {echo.rating_score || 0} engagement
              {echo.visibility === "public" ? " • Public" : " • Private"}
            </Text>
          </View>
        </View>
      </View>

      {/* Rating section */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingTitle}>How do you feel about this echo?</Text>
        <Text style={styles.ratingSubtitle}>
          Help others discover great moments
        </Text>

        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={[
              styles.ratingButton,
              userRating === 1 && styles.ratingButtonActive,
            ]}
            onPress={() => handleRate(1)}
            disabled={ratingLoading}
          >
            <Text style={styles.ratingEmoji}>👍</Text>
            <Text style={styles.ratingButtonText}>Love It</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ratingButton,
              userRating === -1 && styles.ratingButtonDislike,
            ]}
            onPress={() => handleRate(-1)}
            disabled={ratingLoading}
          >
            <Text style={styles.ratingEmoji}>👎</Text>
            <Text style={styles.ratingButtonText}>Not for Me</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete button - only show if user is owner */}
      {echo.user_id === user?.id && (
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deletingLoading}
          >
            {deletingLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete Echo</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.deleteHint}>
            You can only delete your own echoes
          </Text>
        </View>
      )}

      {/* Help section at bottom */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>About Echoes</Text>
        <View style={styles.helpItem}>
          <Text style={styles.helpIcon}>📍</Text>
          <Text style={styles.helpText}>
            Location-based moments shared with users nearby
          </Text>
        </View>
        <View style={styles.helpItem}>
          <Text style={styles.helpIcon}>👥</Text>
          <Text style={styles.helpText}>
            Discover echoes by walking within 50 meters
          </Text>
        </View>
        <View style={styles.helpItem}>
          <Text style={styles.helpIcon}>⭐</Text>
          <Text style={styles.helpText}>
            Rate echoes to help the community find quality moments
          </Text>
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0084ff",
    borderRadius: 6,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0084ff",
  },

  // Image container with overlay
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 380,
  },
  mainImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e0e0e0",
  },
  imageOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  echoLabel: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  visibilityBadge: {
    fontSize: 11,
    color: "#ddd",
    fontWeight: "500",
  },

  // Explanation section
  explanationSection: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0084ff",
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },

  // User section
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    marginTop: 8,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0084ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 13,
    color: "#999",
    marginBottom: 2,
  },
  userHint: {
    fontSize: 12,
    color: "#0084ff",
    fontWeight: "500",
  },

  // Info card
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f1ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },

  // Rating section
  ratingSection: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: "row",
    gap: 12,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  ratingButtonActive: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "#4caf50",
  },
  ratingButtonDislike: {
    backgroundColor: "rgba(211, 47, 47, 0.1)",
    borderColor: "#d32f2f",
  },
  ratingEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  // Help section
  helpSection: {
    backgroundColor: "#f0f8ff",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0084ff",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0084ff",
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  helpIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
  },
  helpText: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    lineHeight: 18,
  },

  // Delete section
  deleteSection: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: "#ffebee",
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#d32f2f",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
    textAlign: "center",
  },
});
