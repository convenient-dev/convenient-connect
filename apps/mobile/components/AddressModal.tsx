import {
  LocationPermissionError,
  resolveCurrentLocation,
  type ResolvedLocation,
} from "@/api/address";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { primary, secondary, neutral, text, background, border, overlay } =
  Colors;

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Called once the device location has been resolved. May return a promise;
   * the modal keeps its spinner up until it settles, then closes.
   */
  onUseCurrentLocation: (location: ResolvedLocation) => void | Promise<void>;
  /** Called when the user chooses to enter an address manually. */
  onAddAddress: () => void;
}

export function AddressModal({
  visible,
  onClose,
  onUseCurrentLocation,
  onAddAddress,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUseCurrentLocation() {
    if (locating) return;
    setLocating(true);
    setError(null);
    try {
      const location = await resolveCurrentLocation();
      await onUseCurrentLocation(location);
    } catch (e) {
      setError(
        e instanceof LocationPermissionError
          ? "Location permission is required to use your current location."
          : "Couldn't get your location. Please try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  function handleClose() {
    if (locating) return;
    setError(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.illustration}>
            <MaterialIcons name="map" size={64} color={primary[300]} />
            <View style={styles.pin}>
              <MaterialIcons name="location-on" size={40} color={secondary[500]} />
            </View>
          </View>

          <Text style={styles.title}>Help us find you!</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.button, styles.currentLocationButton]}
            activeOpacity={0.85}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <>
                <MaterialIcons name="my-location" size={20} color={neutral[0]} />
                <Text style={styles.buttonText}>Use my current location</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.or}>or</Text>

          <TouchableOpacity
            style={[styles.button, styles.addAddressButton]}
            activeOpacity={0.85}
            onPress={onAddAddress}
            disabled={locating}
          >
            <MaterialIcons name="location-on" size={20} color={neutral[0]} />
            <Text style={styles.buttonText}>Add address</Text>
          </TouchableOpacity>

          {error && <Text style={styles.error}>{error}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: overlay.light,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: background.card,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  illustration: {
    width: 96,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: {
    position: "absolute",
    top: -6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    marginTop: 8,
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: border.default,
    marginTop: 16,
    marginBottom: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "stretch",
    height: 56,
    borderRadius: 999,
  },
  currentLocationButton: {
    backgroundColor: primary[400],
  },
  addAddressButton: {
    backgroundColor: secondary[500],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  or: {
    fontSize: 14,
    color: neutral[400],
    marginVertical: 12,
  },
  error: {
    fontSize: 13,
    color: secondary[500],
    textAlign: "center",
    marginTop: 16,
  },
});
