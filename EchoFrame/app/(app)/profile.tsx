import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

interface UserStats {
  echo_count: number;
  rating_count: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    echo_count: 0,
    rating_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!user?.id) return;

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch echo count
        const { count: echoCount, error: echoError } = await supabase
          .from("echoes")
          .select("id", { count: "exact" })
          .eq("user_id", user.id);

        if (echoError) throw echoError;

        // Fetch rating count
        const { count: ratingCount, error: ratingError } = await supabase
          .from("ratings")
          .select("id", { count: "exact" })
          .eq("user_id", user.id);

        if (ratingError) throw ratingError;

        setStats({
          echo_count: echoCount || 0,
          rating_count: ratingCount || 0,
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#0084ff" />
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.echo_count}</Text>
          <Text style={styles.statLabel}>Echoes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.rating_count}</Text>
          <Text style={styles.statLabel}>Ratings</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionItem}>
          <Text style={styles.sectionItemText}>Email</Text>
          <Text style={styles.sectionItemValue}>{user?.email}</Text>
        </View>
        <View style={styles.sectionItem}>
          <Text style={styles.sectionItemText}>Member Since</Text>
          <Text style={styles.sectionItemValue}>
            {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          styles.signOutButton,
          signingOut && styles.buttonDisabled,
        ]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Ionicons name="log-out" size={20} color="#d32f2f" />
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
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
  },
  header: {
    backgroundColor: "#fff",
    paddingVertical: 24,
    alignItems: "center",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e8f1ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#999",
  },
  statsContainer: {
    backgroundColor: "#fff",
    flexDirection: "row",
    marginTop: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0084ff",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#eee",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0084ff",
    marginBottom: 8,
  },
  sectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomColor: "#f0f0f0",
    borderBottomWidth: 1,
  },
  sectionItemText: {
    fontSize: 14,
    color: "#333",
  },
  sectionItemValue: {
    fontSize: 14,
    color: "#999",
  },
  button: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  signOutButton: {
    backgroundColor: "#fff",
    borderColor: "#d32f2f",
    marginBottom: 24,
  },
  signOutButtonText: {
    color: "#d32f2f",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
