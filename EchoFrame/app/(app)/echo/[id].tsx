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
import { useAuth } from "../../lib/auth-context";
import type { Echo } from "../../lib/echo-service";
import { getEchoById, rateEcho } from "../../lib/echo-service";

export default function EchoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [echo, setEcho] = useState<Echo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
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
        <Text style={styles.headerTitle}>Echo</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main image */}
      <Image source={{ uri: echo.image_url }} style={styles.mainImage} />

      {/* User info */}
      <View style={styles.userSection}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={32} color="#0084ff" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {echo.user?.username || "Anonymous"}
          </Text>
          <Text style={styles.timestamp}>{timeString}</Text>
        </View>
      </View>

      {/* Location info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#0084ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {echo.latitude.toFixed(4)}, {echo.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={18} color="#0084ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Captured</Text>
            <Text style={styles.infoValue}>
              {new Date(echo.timestamp).toLocaleDateString()}{" "}
              {new Date(echo.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="eye" size={18} color="#0084ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Visibility</Text>
            <Text style={styles.infoValue}>
              {echo.visibility === "public" ? "Public" : "Circle Only"}
            </Text>
          </View>
        </View>
      </View>

      {/* Rating section */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingLabel}>Rate This Echo</Text>
        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={[
              styles.ratingButton,
              userRating === 1 && styles.ratingButtonActive,
            ]}
            onPress={() => handleRate(1)}
            disabled={ratingLoading}
          >
            <Ionicons
              name="thumbs-up"
              size={24}
              color={userRating === 1 ? "#4caf50" : "#999"}
            />
            <Text
              style={[
                styles.ratingCount,
                userRating === 1 && styles.ratingCountActive,
              ]}
            >
              {(echo.rating_score ?? 0) + (userRating === 1 ? 1 : 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ratingButton,
              userRating === -1 && styles.ratingButtonActive,
            ]}
            onPress={() => handleRate(-1)}
            disabled={ratingLoading}
          >
            <Ionicons
              name="thumbs-down"
              size={24}
              color={userRating === -1 ? "#d32f2f" : "#999"}
            />
            <Text
              style={[
                styles.ratingCount,
                userRating === -1 && styles.ratingCountActive,
              ]}
            >
              {(echo.rating_score ?? 0) + (userRating === -1 ? -1 : 0)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments placeholder for Phase 2 */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments (Phase 2)</Text>
        <Text style={styles.commentsPlaceholder}>
          Comments and discussion threads coming in the next release.
        </Text>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    fontWeight: "600",
    color: "#333",
  },
  mainImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#e0e0e0",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e8f1ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: "#999",
  },
  infoSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  ratingSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: "row",
    gap: 12,
  },
  ratingButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#eee",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  ratingButtonActive: {
    backgroundColor: "#f5f5f5",
    borderColor: "#0084ff",
  },
  ratingCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontWeight: "500",
  },
  ratingCountActive: {
    color: "#0084ff",
  },
  commentsSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  commentsPlaceholder: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
});
