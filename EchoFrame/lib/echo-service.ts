import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

const STORAGE_BUCKET = "echoes";

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

/**
 * Initialize storage bucket - check if it exists and create if needed
 * Note: Public bucket creation requires elevated privileges and must be done via Supabase dashboard
 */
export async function initializeStorage(): Promise<boolean> {
  try {
    // Try to list objects in the bucket to verify it exists
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: 1 });

    if (error) {
      if (error.message.includes("Bucket not found")) {
        console.error(
          `Storage bucket "${STORAGE_BUCKET}" not found. Please create it in your Supabase dashboard:\n` +
            "1. Go to Storage in your Supabase project\n" +
            "2. Click 'Create a new bucket'\n" +
            "3. Name it 'echoes'\n" +
            "4. Enable 'Public bucket' for public image access\n" +
            "5. Click 'Create bucket'",
        );
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    return false;
  }
}

export async function uploadEcho(
  photoUri: string,
  latitude: number,
  longitude: number,
  visibility: "public" | "circle" = "public",
  userId: string,
): Promise<Echo | null> {
  try {
    // Verify storage bucket exists
    const storageReady = await initializeStorage();
    if (!storageReady) {
      throw new Error(
        `Storage bucket "${STORAGE_BUCKET}" not found. Create it in Supabase dashboard.`,
      );
    }

    // Read the image file
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: "base64",
    });

    const fileName = `${userId}/${Date.now()}.jpg`;
    const contentType = "image/jpeg";

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, decode(base64), {
        contentType,
      });

    if (storageError) throw storageError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

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
    // Simple lat/lon box query as fallback (without user join to avoid RLS issues)
    const radiusDegrees = radiusMeters / 111000; // Rough conversion

    const { data, error } = await supabase
      .from("echoes")
      .select(
        "id, user_id, image_url, latitude, longitude, timestamp, visibility, rating_score, created_at",
      )
      .eq("visibility", "public")
      .gte("latitude", latitude - radiusDegrees)
      .lte("latitude", latitude + radiusDegrees)
      .gte("longitude", longitude - radiusDegrees)
      .lte("longitude", longitude + radiusDegrees)
      .order("rating_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Fallback query error:", error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }

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
      .select(
        "id, user_id, image_url, latitude, longitude, timestamp, visibility, rating_score, created_at",
      )
      .eq("id", echoId)
      .single();

    if (error) throw error;

    if (data && data.user_id) {
      // Fetch user separately to avoid join issues with RLS
      const { data: userData } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", data.user_id)
        .single();

      return {
        ...data,
        user: userData || undefined,
      };
    }

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

/**
 * Delete an echo and its associated data
 * Only the owner (user_id) can delete their own echo
 */
export async function deleteEcho(echoId: string): Promise<boolean> {
  try {
    // Get echo to find image path
    const { data: echo, error: fetchError } = await supabase
      .from("echoes")
      .select("image_url, user_id")
      .eq("id", echoId)
      .single();

    // If echo not found, it may have already been deleted - this is not an error
    if (fetchError && fetchError.code === "PGRST116") {
      console.warn("Echo already deleted or not found:", echoId);
      return true; // Return success since the goal (deleted state) is achieved
    }

    if (fetchError) throw fetchError;
    if (!echo) {
      // Echo doesn't exist
      const error = new Error("Echo not found");
      (error as any).code = "ECHO_NOT_FOUND";
      throw error;
    }

    // Delete image from storage if it exists
    if (echo.image_url) {
      try {
        // Extract file path from URL
        const urlParts = echo.image_url.split(
          "/storage/v1/object/public/echoes/",
        );
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        }
      } catch (storageError) {
        console.warn("Failed to delete image from storage:", storageError);
        // Continue with echo deletion even if storage deletion fails
      }
    }

    // Delete all ratings for this echo
    const { error: ratingsError } = await supabase
      .from("ratings")
      .delete()
      .eq("echo_id", echoId);

    if (ratingsError) throw ratingsError;

    // Delete the echo record
    const { error: deleteError } = await supabase
      .from("echoes")
      .delete()
      .eq("id", echoId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error("Error deleting echo:", error);
    throw error;
  }
}
