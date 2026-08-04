import {
  LocationPermissionError,
  resolveCurrentLocation,
  type ResolvedLocation,
} from "@/api/address";
import { Button } from "@/components/Button";
import { MAX_DIALOG_WIDTH } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

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

          <Button
            title="Use my current location"
            variant="primary"
            size="lg"
            loading={locating}
            onPress={handleUseCurrentLocation}
            icon={<MaterialIcons name="my-location" size={20} color={neutral[0]} />}
            style={styles.button}
          />

          <Text style={styles.or}>or</Text>

          <Button
            title="Add address"
            variant="secondary"
            size="lg"
            disabled={locating}
            onPress={onAddAddress}
            icon={<MaterialIcons name="location-on" size={20} color={neutral[0]} />}
            style={styles.button}
          />

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
    maxWidth: MAX_DIALOG_WIDTH,
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
    alignSelf: "stretch",
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
