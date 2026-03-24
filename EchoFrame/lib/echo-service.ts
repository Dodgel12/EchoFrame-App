import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

export interface Echo {
  id: string;
  user_id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  visibility: "public" | "circle";
  rating_score: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

export async function uploadEcho(
  photoUri: string,
  latitude: number,
  longitude: number,
  visibility: "public" | "circle" = "public",
  userId: string,
): Promise<Echo | null> {
  try {
    // Read the image file
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileName = `${userId}/${Date.now()}.jpg`;
    const contentType = "image/jpeg";

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("echoes")
      .upload(fileName, decode(base64), {
        contentType,
      });

    if (storageError) throw storageError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("echoes").getPublicUrl(fileName);

    // Create echo record in database
    const { data: echoData, error: dbError } = await supabase
      .from("echoes")
      .insert({
        user_id: userId,
        image_url: publicUrl,
        latitude,
        longitude,
        location: `POINT(${longitude} ${latitude})`,
        visibility,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return echoData;
  } catch (error) {
    console.error("Error uploading echo:", error);
    throw error;
  }
}

export async function getNearbyEchoes(
  latitude: number,
  longitude: number,
  radiusMeters: number = 500,
): Promise<Echo[]> {
  try {
    // Use PostGIS ST_DWithin for distance queries
    const { data, error } = await supabase.rpc("get_nearby_echoes", {
      user_lat: latitude,
      user_lon: longitude,
      radius_meters: radiusMeters,
    });

    if (error) {
      // Fallback: use basic distance calculation if RPC not available
      return getFallbackNearbyEchoes(latitude, longitude, radiusMeters);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching nearby echoes:", error);
    return [];
  }
}

async function getFallbackNearbyEchoes(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<Echo[]> {
  try {
    // Simple lat/lon box query as fallback
    const radiusDegrees = radiusMeters / 111000; // Rough conversion

    const { data, error } = await supabase
      .from("echoes")
      .select("*, users(username, avatar_url)")
      .eq("visibility", "public")
      .gte("latitude", latitude - radiusDegrees)
      .lte("latitude", latitude + radiusDegrees)
      .gte("longitude", longitude - radiusDegrees)
      .lte("longitude", longitude + radiusDegrees)
      .order("rating_score", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in fallback nearby echoes:", error);
    return [];
  }
}

export async function getEchoById(echoId: string): Promise<Echo | null> {
  try {
    const { data, error } = await supabase
      .from("echoes")
      .select("*, users(username, avatar_url)")
      .eq("id", echoId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching echo:", error);
    return null;
  }
}

export async function getUserEchoes(userId: string): Promise<Echo[]> {
  try {
    const { data, error } = await supabase
      .from("echoes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user echoes:", error);
    return [];
  }
}

export async function rateEcho(
  echoId: string,
  userId: string,
  value: 1 | -1,
): Promise<boolean> {
  try {
    // Insert or update rating
    const { error } = await supabase.from("ratings").upsert(
      {
        echo_id: echoId,
        user_id: userId,
        value,
      },
      { onConflict: "user_id,echo_id" },
    );

    if (error) throw error;

    // Recalculate echo rating score
    const { data: ratings, error: ratingError } = await supabase
      .from("ratings")
      .select("value")
      .eq("echo_id", echoId);

    if (ratingError) throw ratingError;

    const totalScore =
      ratings?.reduce((sum, r) => sum + (r.value as number), 0) || 0;

    // Update echo rating_score
    const { error: updateError } = await supabase
      .from("echoes")
      .update({ rating_score: totalScore })
      .eq("id", echoId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error("Error rating echo:", error);
    return false;
  }
}
