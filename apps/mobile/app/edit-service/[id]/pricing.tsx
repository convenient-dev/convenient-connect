import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, background, border } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const RATE_UNITS = ["booking", "hour"] as const;
type RateUnit = (typeof RATE_UNITS)[number];

function formatRateUnit(unit: RateUnit): string {
  return unit === "booking" ? "per booking" : "per hour";
}

interface AddonTemplate {
  id: number;
  name: string;
  description: string | null;
  defaultPrice: string | null;
  rateUnit: RateUnit;
}

interface ServicePricing {
  id: number;
  baseRate: string;
  baseRateUnit: RateUnit;
  addons: {
    id: number;
    price: string;
    template: { id: number; name: string; rateUnit: RateUnit };
  }[];
  subcategory: { id: number } | null;
}

export default function EditServicePricingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [baseRate, setBaseRate] = useState("");
  const [baseRateUnit, setBaseRateUnit] = useState<RateUnit>("booking");
  const [addonTemplates, setAddonTemplates] = useState<AddonTemplate[]>([]);
  const [addonRates, setAddonRates] = useState<Record<number, string>>({});
  const [addonUnits, setAddonUnits] = useState<Record<number, RateUnit>>({});

  // Rate unit picker
  const [rateUnitModalVisible, setRateUnitModalVisible] = useState(false);
  const [activeRateField, setActiveRateField] = useState<"base" | number>("base");
  const slideRateUnitAnim = useRef(new Animated.Value(300)).current;
  const backdropRateUnitAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetch(`${API_BASE_URL}/services/${id}`)
      .then((r) => r.json())
      .then(async (service: ServicePricing) => {
        setBaseRate(parseFloat(service.baseRate).toFixed(2));
        setBaseRateUnit(service.baseRateUnit);

        if (service.subcategory) {
          const subcatData = await fetch(
            `${API_BASE_URL}/subcategories/${service.subcategory.id}`,
          ).then((r) => r.json());

          const templates: AddonTemplate[] = subcatData?.addonTemplates ?? [];
          setAddonTemplates(templates);

          const rates: Record<number, string> = {};
          const units: Record<number, RateUnit> = {};

          templates.forEach((t) => {
            const existing = service.addons.find((a) => a.template.id === t.id);
            rates[t.id] = existing
              ? parseFloat(existing.price).toFixed(2)
              : t.defaultPrice
                ? parseFloat(t.defaultPrice).toFixed(2)
                : "";
            units[t.id] = existing ? existing.template.rateUnit : t.rateUnit;
          });

          setAddonRates(rates);
          setAddonUnits(units);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function openRateUnitPicker(field: "base" | number) {
    setActiveRateField(field);
    setRateUnitModalVisible(true);
    Animated.parallel([
      Animated.spring(slideRateUnitAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(backdropRateUnitAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeRateUnitPicker(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideRateUnitAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropRateUnitAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRateUnitModalVisible(false);
      callback?.();
    });
  }

  function getActiveRateUnit(): RateUnit {
    if (activeRateField === "base") return baseRateUnit;
    return addonUnits[activeRateField] ?? "booking";
  }

  function setActiveRateUnit(unit: RateUnit) {
    if (activeRateField === "base") {
      setBaseRateUnit(unit);
    } else {
      setAddonUnits((prev) => ({ ...prev, [activeRateField]: unit }));
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        baseRate: Number(baseRate),
        baseRateUnit,
        addons: addonTemplates
          .filter((t) => addonRates[t.id]?.trim())
          .map((t) => ({
            templateId: t.id,
            price: Number(addonRates[t.id]),
          })),
      };

      const res = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data?.error ?? "Failed to save. Please try again.");
        return;
      }

      router.back();
    } catch {
      setSaveError("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = baseRate.trim().length > 0 && !saving;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Pricing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Service Rate</Text>
          <Text style={styles.sectionDesc}>Service rate = base rate + add-ons</Text>

          {/* Base Rate */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Base Rate <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.rateRow}>
              <View style={styles.rateInputBox}>
                <Text style={styles.rateCurrency}>$</Text>
                <TextInput
                  style={styles.rateTextInput}
                  value={baseRate}
                  onChangeText={setBaseRate}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={neutral[300]}
                />
              </View>
              <TouchableOpacity
                style={styles.rateUnitDropdown}
                onPress={() => openRateUnitPicker("base")}
                activeOpacity={0.7}
              >
                <Text style={styles.rateUnitText}>{formatRateUnit(baseRateUnit)}</Text>
                <Feather name="chevron-down" size={14} color={neutral[400]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add-ons */}
          {addonTemplates.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Add-Ons</Text>
              {addonTemplates.map((template) => (
                <View key={template.id} style={styles.addOnRow}>
                  <Text style={styles.addOnLabel}>{template.name}</Text>
                  <View style={styles.rateInputBox}>
                    <Text style={styles.rateCurrency}>$</Text>
                    <TextInput
                      style={styles.rateTextInput}
                      value={addonRates[template.id] ?? ""}
                      onChangeText={(v) =>
                        setAddonRates((prev) => ({ ...prev, [template.id]: v }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={neutral[300]}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.rateUnitDropdown}
                    onPress={() => openRateUnitPicker(template.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rateUnitText}>
                      {formatRateUnit(addonUnits[template.id] ?? "booking")}
                    </Text>
                    <Feather name="chevron-down" size={14} color={neutral[400]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, canSave && styles.saveButtonActive]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, canSave && styles.saveButtonTextActive]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rate Unit bottom sheet */}
      <Modal
        visible={rateUnitModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeRateUnitPicker()}
      >
        <Animated.View
          style={[styles.bottomSheetBackdrop, { opacity: backdropRateUnitAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => closeRateUnitPicker()} />
        </Animated.View>
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY: slideRateUnitAnim }] }]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Billing Unit</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {RATE_UNITS.map((unit, index) => {
              const isSelected = getActiveRateUnit() === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.bottomSheetOption,
                    index < RATE_UNITS.length - 1 && styles.bottomSheetOptionBorder,
                    isSelected && styles.bottomSheetOptionSelected,
                  ]}
                  onPress={() => closeRateUnitPicker(() => setActiveRateUnit(unit))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bottomSheetOptionText,
                      isSelected && { color: primary[500], fontWeight: "600" },
                    ]}
                  >
                    {formatRateUnit(unit)}
                  </Text>
                  {isSelected && <Feather name="check" size={16} color={primary[400]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.screen },
  flex: { flex: 1 },
  loader: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#222b45" },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: neutral[800], marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: neutral[400], marginBottom: 20 },
  field: { marginBottom: 20, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: neutral[700] },
  required: { color: secondary[500] },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rateInputBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: border.default, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, gap: 4,
  },
  rateCurrency: { fontSize: 14, color: neutral[600], fontWeight: "500" },
  rateTextInput: { flex: 1, fontSize: 14, color: neutral[800], padding: 0 },
  rateUnitDropdown: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: border.default, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 13,
  },
  rateUnitText: { fontSize: 13, color: neutral[600], fontWeight: "500" },
  addOnRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  addOnLabel: { width: 100, fontSize: 13, color: neutral[600], lineHeight: 18 },
  saveError: {
    fontSize: 13, color: "#d32f2f", textAlign: "center",
    paddingHorizontal: 24, paddingBottom: 6,
  },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  cancelButton: {
    flex: 1, height: 50, borderRadius: 25,
    backgroundColor: secondary[500], alignItems: "center", justifyContent: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: neutral[0] },
  saveButton: {
    flex: 1, height: 50, borderRadius: 25,
    backgroundColor: neutral[200], alignItems: "center", justifyContent: "center",
  },
  saveButtonActive: { backgroundColor: primary[400] },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: neutral[400] },
  saveButtonTextActive: { color: neutral[0] },
  bottomSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  bottomSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: background.screen,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, maxHeight: "60%",
  },
  bottomSheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: neutral[200], alignSelf: "center",
    marginTop: 12, marginBottom: 4,
  },
  bottomSheetTitle: {
    fontSize: 15, fontWeight: "700", color: neutral[700],
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: border.default,
  },
  bottomSheetOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 15, paddingHorizontal: 20,
  },
  bottomSheetOptionBorder: { borderBottomWidth: 1, borderBottomColor: border.default },
  bottomSheetOptionSelected: { backgroundColor: primary[50] },
  bottomSheetOptionText: { fontSize: 15, color: neutral[700] },
});
