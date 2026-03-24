import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [shouldShowAuth, setShouldShowAuth] = useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in, redirect to auth
      console.log("Redirecting to signin - no session");
      setShouldShowAuth(true);
      router.replace("/(auth)/signin");
    } else if (session && inAuthGroup) {
      // Signed in, redirect to app
      console.log("Redirecting to map - session exists");
      setShouldShowAuth(false);
      router.replace("/(app)/map");
    } else {
      setShouldShowAuth(!session);
    }
  }, [session, loading, segments, router]);

  useEffect(() => {
    console.log("RootLayoutNav state:", {
      loading,
      session: !!session,
      segments,
    });
  }, [loading, session, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
      <Stack.Screen name="(app)" options={{ animationEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
