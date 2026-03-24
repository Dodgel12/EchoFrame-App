import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in, redirect to auth
      router.replace("/(auth)/signin");
    } else if (session && inAuthGroup) {
      // Signed in, redirect to app
      router.replace("/(app)/map");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {!session ? (
        <Stack.Group>
          <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="(app)" options={{ animationEnabled: false }} />
        </Stack.Group>
      )}
    </Stack>
  );
}
