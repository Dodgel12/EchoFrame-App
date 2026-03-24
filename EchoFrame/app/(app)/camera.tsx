import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../lib/auth-context";
import { uploadEcho } from "../../lib/echo-service";
import { getCurrentLocation } from "../../lib/location-service";

type CameraMode = "capture" | "preview" | "uploading";

interface CapturedPhoto {
  uri: string;
  latitude: number;
  longitude: number;
}

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [mode, setMode] = useState<CameraMode>("capture");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraStatus = await requestCameraPermission();
      const locationStatus = await Location.requestForegroundPermissionsAsync();

      const hasCamera = cameraStatus?.granted || false;
      const hasLocation = locationStatus.status === "granted";

      if (!hasCamera) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in Settings to capture echoes.",
          [
            {
              text: "Try Again",
              onPress: requestPermissions,
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ],
        );
      }

      if (!hasLocation) {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access in Settings to share your location with echoes.",
          [
            {
              text: "Try Again",
              onPress: requestPermissions,
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ],
        );
      }

      setHasPermission(hasCamera && hasLocation);
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert(
        "Permission Error",
        "Failed to request permissions. Please try again.",
      );
      setHasPermission(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      // Get location
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert("Error", "Could not get your location");
        setIsProcessing(false);
        return;
      }

      // Capture photo
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!photoData) throw new Error("Failed to capture photo");

      setPhoto({
        uri: photoData.uri,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setMode("preview");
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", "Failed to capture photo");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!photo || !user?.id) return;

    setIsProcessing(true);
    try {
      await uploadEcho(
        photo.uri,
        photo.latitude,
        photo.longitude,
        "public",
        user.id,
      );

      Alert.alert("Success", "Echo uploaded! Others will discover it nearby.");
      setPhoto(null);
      setMode("capture");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload echo. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setMode("capture");
  };

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#d32f2f" />
        <Text style={styles.errorText}>
          Camera & location permissions required
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermissions}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "preview" && photo) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />

        <View style={styles.previewInfo}>
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color="#0084ff" />
            <Text style={styles.locationText}>
              {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
            </Text>
          </View>
          <Text style={styles.previewLabel}>
            This echo will be public and discoverable nearby.
          </Text>
        </View>

        <View style={styles.previewControls}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton]}
            onPress={handleRetake}
            disabled={isProcessing}
          >
            <Ionicons name="refresh" size={20} color="#0084ff" />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.uploadButton,
              isProcessing && styles.buttonDisabled,
            ]}
            onPress={handleUpload}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Echo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={styles.overlay}>
        <View style={styles.focusRing} />
        <Text style={styles.overlayText}>Center your moment</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            isProcessing && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={!cameraReady || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.captureCircle} />
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>Tap to capture your echo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
  },
  permissionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#0084ff",
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  focusRing: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "rgba(0, 132, 255, 0.5)",
    borderRadius: 20,
  },
  overlayText: {
    position: "absolute",
    top: 40,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0084ff",
  },
  hint: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  previewInfo: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    color: "#0084ff",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "500",
  },
  previewLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  previewControls: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  retakeButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#0084ff",
  },
  retakeButtonText: {
    color: "#0084ff",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadButton: {
    backgroundColor: "#0084ff",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
