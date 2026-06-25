import { ApiError } from "@/api/client";
import {
  Address,
  createAddress,
  deleteAddress,
  listAddresses,
  LocationPermissionError,
  resolveCurrentLocation,
  type ResolvedLocation,
  searchAddresses,
  updateAddress,
} from "@/api/address";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background } = Colors;

export default function AddAddressScreen() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedLocation[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAddresses = React.useCallback(async () => {
    let list = await listAddresses();
    // A lone address is always the default — promote it if the backend didn't.
    if (list.length === 1 && !list[0].isDefault) {
      const promoted = await updateAddress(list[0].id, {
        address: list[0].address,
        latitude: list[0].latitude,
        longitude: list[0].longitude,
        is_default: true,
      });
      list = [promoted];
    }
    setAddresses(list);
    setSelectedId((prev) => prev ?? list.find((a) => a.isDefault)?.id ?? null);
    return list;
  }, []);

  useEffect(() => {
    loadAddresses()
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load addresses."),
      )
      .finally(() => setLoading(false));
  }, [loadAddresses]);

  function messageFor(e: unknown, fallback: string): string {
    if (e instanceof LocationPermissionError) return e.message;
    if (e instanceof ApiError) return e.message;
    return fallback;
  }

  async function handleSearchSubmit() {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      const matches = await searchAddresses(trimmed);
      setResults(matches);
    } catch (e) {
      setResults([]);
      setError(messageFor(e, "Address search failed. Please try again."));
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectCandidate(place: ResolvedLocation) {
    if (savingResult) return;
    setSavingResult(true);
    setError(null);
    try {
      const saved =
        editingId !== null
          ? await updateAddress(editingId, place)
          : await createAddress(place);
      await loadAddresses();
      setSelectedId(saved.id);
      setQuery("");
      setResults([]);
      setSearched(false);
      setEditingId(null);
    } catch (e) {
      setError(messageFor(e, "Failed to save address. Please try again."));
    } finally {
      setSavingResult(false);
    }
  }

  async function handleCurrentLocation() {
    if (locating) return;
    setLocating(true);
    setError(null);
    try {
      const place = await resolveCurrentLocation();
      const saved = await createAddress(place);
      await loadAddresses();
      setSelectedId(saved.id);
    } catch (e) {
      setError(messageFor(e, "Couldn't get your location. Please try again."));
    } finally {
      setLocating(false);
    }
  }

  function handleEdit(address: Address) {
    setEditingId(address.id);
    setQuery(address.address);
    setResults([]);
    setSearched(false);
  }

  async function handleRemove(id: number) {
    setError(null);
    try {
      await deleteAddress(id);
      const list = await loadAddresses();
      if (selectedId === id) {
        setSelectedId(list.find((a) => a.isDefault)?.id ?? null);
      }
      if (editingId === id) {
        setEditingId(null);
        setQuery("");
      }
    } catch (e) {
      setError(messageFor(e, "Failed to remove address."));
    }
  }

  async function handleSave() {
    if (selectedId === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      const current = addresses.find((a) => a.id === selectedId);
      if (current && !current.isDefault) {
        await updateAddress(selectedId, {
          address: current.address,
          latitude: current.latitude,
          longitude: current.longitude,
          is_default: true,
        });
      }
      router.back();
    } catch (e) {
      setError(messageFor(e, "Failed to save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScreenHeader title="Add Address" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (value.trim() === "") {
                setResults([]);
                setSearched(false);
              }
            }}
            placeholder="Search for an address"
            placeholderTextColor={neutral[400]}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searching ? (
            <ActivityIndicator color={neutral[400]} />
          ) : (
            <TouchableOpacity onPress={handleSearchSubmit} hitSlop={8}>
              <MaterialIcons name="search" size={22} color={neutral[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results — pick the correct match before it is saved */}
        {searched && !searching && (
          <View style={styles.resultsList}>
            {results.length === 0 ? (
              <Text style={styles.noResultsText}>
                No matches found. Try adding more detail (street, city, ZIP).
              </Text>
            ) : (
              results.map((place, index) => (
                <TouchableOpacity
                  key={`${place.latitude},${place.longitude},${index}`}
                  style={styles.resultRow}
                  activeOpacity={0.7}
                  disabled={savingResult}
                  onPress={() => handleSelectCandidate(place)}
                >
                  <MaterialIcons
                    name="location-on"
                    size={22}
                    color={neutral[500]}
                  />
                  <Text style={styles.resultText}>{place.address}</Text>
                  <MaterialIcons
                    name="add"
                    size={22}
                    color={secondary[500]}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* My current location */}
        <TouchableOpacity
          style={styles.currentLocationRow}
          activeOpacity={0.7}
          onPress={handleCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color={secondary[500]} />
          ) : (
            <MaterialIcons name="my-location" size={22} color={secondary[500]} />
          )}
          <Text style={styles.currentLocationText}>My Current Location</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Your Addresses</Text>

        {loading ? (
          <ActivityIndicator style={styles.listLoader} color={primary[400]} />
        ) : addresses.length === 0 ? (
          <Text style={styles.emptyText}>
            No saved addresses yet. Search above or use your current location.
          </Text>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => {
              const isSelected = selectedId === address.id;
              return (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressCard,
                    isSelected && styles.addressCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedId(address.id)}
                >
                  {isSelected && (
                    <TouchableOpacity
                      style={styles.removeBadge}
                      hitSlop={8}
                      onPress={() => handleRemove(address.id)}
                    >
                      <MaterialIcons name="close" size={14} color={neutral[0]} />
                    </TouchableOpacity>
                  )}
                  <MaterialIcons
                    name="location-on"
                    size={24}
                    color={neutral[700]}
                  />
                  <Text style={styles.addressText}>{address.address}</Text>
                  <TouchableOpacity
                    hitSlop={8}
                    onPress={() => handleEdit(address)}
                  >
                    <Feather name="edit-2" size={18} color={neutral[600]} />
                  </TouchableOpacity>
                  <MaterialIcons
                    name={
                      isSelected
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                    size={22}
                    color={secondary[500]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (selectedId === null || saving) && styles.saveButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={selectedId === null || saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color={neutral[0]} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    backgroundColor: neutral[50],
    paddingHorizontal: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: text.primary,
    padding: 0,
  },
  resultsList: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: neutral[50],
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  resultText: {
    flex: 1,
    fontSize: 15,
    color: text.primary,
    lineHeight: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: neutral[400],
    lineHeight: 20,
    padding: 16,
  },
  currentLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  currentLocationText: {
    fontSize: 17,
    color: text.primary,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    marginTop: 16,
    marginBottom: 12,
  },
  listLoader: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    color: neutral[400],
    lineHeight: 20,
    marginTop: 4,
  },
  addressList: {
    gap: 24,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  addressCardSelected: {
    borderColor: secondary[200],
  },
  removeBadge: {
    position: "absolute",
    top: -10,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 17,
    color: text.primary,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 13,
    color: secondary[500],
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  saveButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
