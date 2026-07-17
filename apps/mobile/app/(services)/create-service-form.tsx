import { Button } from "@/components/Button";
import { CustomField, CustomFieldInput } from "@/components/CustomFieldInput";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { useCurrentUser } from "@/constants/session";
import { getSubcategory, getLegacyUser, getUserAffiliations, createService, uploadImage, uploadPdf } from "@/api/legacy";
import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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

const { primary, secondary, neutral, background, border, status, overlay } =
  Colors;

const TOTAL_STEPS = 5;


const RADIUS_UNITS = ["mile", "km"] as const;
type RadiusUnit = (typeof RADIUS_UNITS)[number];

const RATE_UNITS = ["booking", "hour"] as const;
type RateUnit = (typeof RATE_UNITS)[number];

function formatRateUnit(unit: RateUnit): string {
  return unit === "booking" ? "per booking" : "per hour";
}

type ServiceType = "in-person" | "remote";

type AddonTemplate = {
  id: number;
  name: string;
  description: string | null;
  defaultPrice: string | null;
  defaultRateUnit: RateUnit;
  isRequired: boolean;
  displayOrder: number;
};

type SubcategoryData = {
  id: number;
  name: string;
  customFields: CustomField[];
  addonTemplates: AddonTemplate[];
  category: {
    id: number;
    name: string;
    customFields: CustomField[];
  };
};

type Address = {
  id: number;
  userId: number;
  address: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const SECTION_ICONS: Record<string, number> = {
  "SERVICE CATEGORY": require("@/assets/global-icons/category.svg"),
  "WORK TYPE": require("@/assets/global-icons/provider-type.svg"),
  "SERVICE INFORMATION": require("@/assets/global-icons/info.svg"),
  PRICING: require("@/assets/global-icons/pricing.svg"),
};

// ── Review helpers (mirror service-detail layout) ────────────────
function ReviewSectionHeader({
  label,
  onEdit,
}: {
  label: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.reviewSectionHeaderRow}>
      <View style={styles.reviewSectionHeaderLeft}>
        <ExpoImage source={SECTION_ICONS[label]} style={styles.sectionIcon} />
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          style={styles.editBtn}
          activeOpacity={0.7}
        >
          <ExpoImage
            source={require("@/assets/global-icons/edit.svg")}
            style={styles.editBtnIcon}
          />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ReviewFieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function ReviewInlineRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineRow}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={styles.inlineValue}>{value}</Text>
    </View>
  );
}

function ReviewPricingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pricingRow}>
      <Text style={styles.pricingLabel}>{label}</Text>
      <Text style={styles.pricingValue}>{value}</Text>
    </View>
  );
}

export default function CreateServiceFormScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const {
    subcategoryId,
    subcategoryName,
    serviceMode,
    businessAffiliationId,
    businessName,
  } = useLocalSearchParams<{
    subcategoryId: string;
    subcategoryName: string;
    serviceMode: string;
    businessAffiliationId: string;
    businessName: string;
  }>();

  // Step navigation
  const [formStep, setFormStep] = useState(3);
  const progress = formStep / TOTAL_STEPS;

  // ── Subcategory data from API ─────────────────────────────────
  const [subcategoryData, setSubcategoryData] =
    useState<SubcategoryData | null>(null);

  useEffect(() => {
    if (!subcategoryId) return;
    getSubcategory(subcategoryId)
      .then((data: SubcategoryData) => setSubcategoryData(data))
      .catch(() => {});
  }, [subcategoryId]);

  // Merge subcategory-level and category-level custom fields
  const allCustomFields: CustomField[] = [
    ...(subcategoryData?.customFields ?? []),
    ...(subcategoryData?.category.customFields ?? []),
  ];

  // ── Step 3 state ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);

  // Custom field values: fieldId → selected/entered value
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<number, string>
  >({});

  // Generic select-field picker bottom sheet
  const [pickerField, setPickerField] = useState<CustomField | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  function openFieldPicker(field: CustomField) {
    setPickerField(field);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeFieldPicker(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPickerField(null);
      callback?.();
    });
  }

  // Address picker
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [address, setAddress] = useState("");
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const slideAddressAnim = useRef(new Animated.Value(300)).current;
  const backdropAddressAnim = useRef(new Animated.Value(0)).current;
  const [addressSearch, setAddressSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openAddressPicker() {
    setAddressSearch("");
    setSearchResults([]);
    setAddressModalVisible(true);
    Animated.parallel([
      Animated.spring(slideAddressAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(backdropAddressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeAddressPicker(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAddressAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAddressAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAddressModalVisible(false);
      callback?.();
    });
  }

  function handleAddressSearch(text: string) {
    setAddressSearch(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "my-app-mobile/1.0",
          },
        },
      )
        .then((r) => r.json())
        .then((results) => setSearchResults(results))
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 400);
  }

  const [radiusValue, setRadiusValue] = useState("");
  const [radiusUnit, setRadiusUnit] = useState<RadiusUnit>("mile");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (serviceMode === "business") return;
    getLegacyUser(userId)
      .then((user) => {
        const addresses: Address[] = user?.address ?? [];
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (defaultAddr) {
          setAddress(defaultAddr.address);
          setAddressId(defaultAddr.id);
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (serviceMode !== "business" || !businessAffiliationId) return;
    getUserAffiliations(userId)
      .then(
        (
          businesses: {
            id: number;
            name: string;
            address: string | null;
            addressId: number | null;
          }[],
        ) => {
          const business = businesses.find(
            (b) => b.id === Number(businessAffiliationId),
          );
          if (business?.address) setAddress(business.address);
          if (business?.addressId) setAddressId(business.addressId);
        },
      )
      .catch(() => {});
  }, [userId]);

  const [aboutYou, setAboutYou] = useState("");
  const [slogan, setSlogan] = useState("");
  type Certification = {
    name: string;
    pdf: { uri: string; name: string } | null;
  };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  async function handlePickPdf(index: number) {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setCertifications((prev) =>
        prev.map((c, i) =>
          i === index ? { ...c, pdf: { uri: asset.uri, name: asset.name } } : c,
        ),
      );
    }
  }

  async function handlePickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, //the quality of compression
      orderedSelection: true,
    });

    console.log(result);

    if (!result.canceled) {
      setSelectedImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  }

  const requiredFieldsFilled = allCustomFields
    .filter((f) => f.isRequired)
    .every((f) => (customFieldValues[f.id] ?? "").trim().length > 0);

  const canProceedStep3 =
    title.trim().length > 0 &&
    serviceType !== null &&
    (serviceType !== "in-person" ||
      (radiusValue.trim().length > 0 && address.trim().length > 0)) &&
    requiredFieldsFilled &&
    description.trim().length > 0 &&
    aboutYou.trim().length > 0 &&
    slogan.trim().length > 0 &&
    selectedImages.length > 0 &&
    !certifications.some((c) => c.name.trim() && !c.pdf);

  // ── Step 4 state ──────────────────────────────────────────────
  const [baseRate, setBaseRate] = useState("");
  const [baseRateUnit, setBaseRateUnit] = useState<RateUnit>("booking");

  // Addon state keyed by template ID
  const [addonRates, setAddonRates] = useState<Record<number, string>>({});
  const [addonUnits, setAddonUnits] = useState<Record<number, RateUnit>>({});

  // Pre-fill addon state when subcategory data loads
  useEffect(() => {
    if (!subcategoryData) return;
    const rates: Record<number, string> = {};
    const units: Record<number, RateUnit> = {};
    subcategoryData.addonTemplates.forEach((t) => {
      rates[t.id] = t.defaultPrice ? parseFloat(t.defaultPrice).toFixed(2) : "";
      units[t.id] = t.defaultRateUnit;
    });
    setAddonRates(rates);
    setAddonUnits(units);
  }, [subcategoryData]);

  const [rateUnitModalVisible, setRateUnitModalVisible] = useState(false);
  const [activeRateField, setActiveRateField] = useState<"base" | number>(
    "base",
  );
  const slideRateUnitAnim = useRef(new Animated.Value(300)).current;
  const backdropRateUnitAnim = useRef(new Animated.Value(0)).current;

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

  const canProceedStep4 = baseRate.trim().length > 0;

  // ── Inline validation touched state ──────────────────────────
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));
  const touchAll3 = () =>
    setTouched((prev) => ({
      ...prev,
      title: true,
      serviceType: true,
      address: true,
      radius: true,
      description: true,
      aboutYou: true,
      slogan: true,
      images: true,
      ...Object.fromEntries(
        allCustomFields
          .filter((f) => f.isRequired)
          .map((f) => [`cf_${f.id}`, true]),
      ),
    }));
  const touchAll4 = () => setTouched((prev) => ({ ...prev, baseRate: true }));

  // ── Navigation & submission ───────────────────────────────────
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);

  const canProceed =
    formStep === 3
      ? canProceedStep3
      : formStep === 4
        ? canProceedStep4
        : consented && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        subcategoryId: subcategoryId ? Number(subcategoryId) : undefined,
        serviceMode: serviceMode ?? "freelance",
        businessAffiliationId: businessAffiliationId
          ? Number(businessAffiliationId)
          : undefined,
        title,
        serviceType,
        addressId,
        areaRadius: radiusValue ? Number(radiusValue) : undefined,
        description,
        aboutYou,
        slogan,
        baseRate: Number(baseRate),
        baseRateUnit,
        customValues: Object.entries(customFieldValues).map(
          ([fieldId, value]) => ({ fieldId: Number(fieldId), value }),
        ),
        addons: (subcategoryData?.addonTemplates ?? [])
          .filter((t) => addonRates[t.id]?.trim())
          .map((t) => ({
            templateId: t.id,
            price: Number(addonRates[t.id]),
            rateUnit: addonUnits[t.id] ?? "booking",
          })),
      };

      const service = await createService(userId, body);

      // Upload selected images to the service_images bucket
      if (selectedImages.length > 0) {
        const uploadResults = await Promise.allSettled(
          selectedImages.map(async (uri) => {
            const ext = uri.split(".").pop() ?? "jpg";
            const mimeType =
              ext === "png"
                ? "image/png"
                : ext === "webp"
                  ? "image/webp"
                  : "image/jpeg";

            const formData = new FormData();
            formData.append("serviceId", String(service.id));

            if (Platform.OS === "web") {
              const blobRes = await fetch(uri);
              const blob = await blobRes.blob();
              formData.append(
                "file",
                new File([blob], `image.${ext}`, { type: mimeType }),
              );
            } else {
              formData.append("file", {
                uri,
                name: `image.${ext}`,
                type: mimeType,
              } as unknown as Blob);
            }

            await uploadImage(formData);
          }),
        );

        const failed = uploadResults.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          const reason = (failed[0] as PromiseRejectedResult).reason?.message;
          setSubmitError(
            `${failed.length} image${failed.length > 1 ? "s" : ""} failed to upload: ${reason}`,
          );
          return;
        }
      }

      // Upload certifications (name + PDF both required when providing a cert)
      const incompleteCert = certifications.find(
        (c) => c.name.trim() && !c.pdf,
      );
      if (incompleteCert) {
        setSubmitError(
          `Please upload a PDF for "${incompleteCert.name.trim()}".`,
        );
        return;
      }
      const certsWithPdf = certifications.filter((c) => c.name.trim() && c.pdf);
      if (certsWithPdf.length > 0) {
        const certResults = await Promise.allSettled(
          certsWithPdf.map(async (cert) => {
            const formData = new FormData();
            formData.append("serviceId", String(service.id));
            formData.append("name", cert.name.trim());

            if (Platform.OS === "web") {
              const blobRes = await fetch(cert.pdf!.uri);
              const blob = await blobRes.blob();
              formData.append(
                "file",
                new File([blob], cert.pdf!.name, { type: "application/pdf" }),
              );
            } else {
              formData.append("file", {
                uri: cert.pdf!.uri,
                name: cert.pdf!.name,
                type: "application/pdf",
              } as unknown as Blob);
            }

            await uploadPdf(formData);
          }),
        );

        const failed = certResults.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          const reason = (failed[0] as PromiseRejectedResult).reason?.message;
          setSubmitError(
            `${failed.length} certification PDF${failed.length > 1 ? "s" : ""} failed to upload: ${reason}`,
          );
          return;
        }
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (formStep === 3) {
      if (canProceedStep3) setFormStep(4);
      else touchAll3();
    } else if (formStep === 4) {
      if (canProceedStep4) setFormStep(5);
      else touchAll4();
    } else if (formStep === 5) {
      handleSubmit();
    }
  }

  function handleBack() {
    if (formStep > 3) setFormStep(formStep - 1);
    else router.back();
  }

  const formatRate = (rate: string, unit: RateUnit) =>
    `$${parseFloat(rate || "0").toFixed(2)} ${formatRateUnit(unit)}`;

  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <View style={styles.successContainer}>
          {/* Illustration */}
          <ExpoImage
            source={require("@/assets/global-icons/successful.svg")}
            style={styles.illustrationImg}
            contentFit="contain"
          />

          <Text style={styles.successTitle}>Service Submitted!</Text>
          <Text style={styles.successDesc}>
            Your service profile is under review, which usually takes up to 24
            hours. We'll notify you once it's approved.
          </Text>

          <Button
            title="View my Services"
            variant="primary"
            size="lg"
            style={{ marginTop: 16 }}
            onPress={() => router.replace("/(tabs)/services")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      {/* Step indicator + progress bar */}
      <View style={styles.stepHeader}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>
            Step {formStep} of {TOTAL_STEPS}
          </Text>
          <Text style={styles.stepPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            formStep === 5 ? styles.scrollContentReview : styles.scrollContent,
            contentWidthStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step 3: About Your Service ───────────────────── */}
          {formStep === 3 && (
            <>
              <Text style={styles.title}>About Your Service</Text>
              <Text style={styles.subtitle}>
                Describe what makes your service unique
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Service Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Overnight boarding with..."
                  placeholderTextColor={neutral[300]}
                  value={title}
                  onChangeText={setTitle}
                  onBlur={() => touch("title")}
                />
                {touched.title && !title.trim() && (
                  <Text style={styles.inlineError}>
                    Service title is required.
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Service Type <Text style={styles.required}>*</Text>
                </Text>
                {touched.serviceType && serviceType === null && (
                  <Text style={styles.inlineError}>
                    Please select a service type.
                  </Text>
                )}
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      serviceType === "in-person" && styles.segmentButtonActive,
                    ]}
                    onPress={() => setServiceType("in-person")}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        serviceType === "in-person" && styles.segmentTextActive,
                      ]}
                    >
                      In-person
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      serviceType === "remote" && styles.segmentButtonActive,
                    ]}
                    onPress={() => setServiceType("remote")}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        serviceType === "remote" && styles.segmentTextActive,
                      ]}
                    >
                      Remote
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {serviceType === "in-person" && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Service Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.addressInputRow,
                        serviceMode === "business" &&
                          styles.addressInputRowDisabled,
                      ]}
                      onPress={
                        serviceMode === "business"
                          ? undefined
                          : () => {
                              touch("address");
                              openAddressPicker();
                            }
                      }
                      activeOpacity={serviceMode === "business" ? 1 : 0.7}
                    >
                      <Feather
                        name="map-pin"
                        size={16}
                        color={neutral[400]}
                        style={styles.addressIcon}
                      />
                      <Text
                        style={[
                          styles.addressInput,
                          address
                            ? styles.addressValue
                            : styles.addressPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {address || "Select service address"}
                      </Text>
                      {serviceMode === "business" ? (
                        <Feather name="lock" size={16} color={neutral[300]} />
                      ) : (
                        <Feather
                          name="chevron-down"
                          size={18}
                          color={neutral[400]}
                        />
                      )}
                    </TouchableOpacity>
                    {serviceMode === "business" && (
                      <Text style={styles.addressLockedHint}>
                        Managed by affiliated business
                      </Text>
                    )}
                    {touched.address && !address && (
                      <Text style={styles.inlineError}>
                        Service address is required.
                      </Text>
                    )}
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Service Area Radius <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.radiusRow}>
                      <TextInput
                        style={styles.radiusInput}
                        placeholder="e.g. 10"
                        placeholderTextColor={neutral[300]}
                        value={radiusValue}
                        onChangeText={(v) =>
                          setRadiusValue(v.replace(/[^0-9.]/g, ""))
                        }
                        keyboardType="decimal-pad"
                        onBlur={() => touch("radius")}
                      />
                      <View style={styles.radiusUnitGroup}>
                        {RADIUS_UNITS.map((unit) => (
                          <TouchableOpacity
                            key={unit}
                            style={[
                              styles.radiusUnitButton,
                              radiusUnit === unit &&
                                styles.radiusUnitButtonActive,
                            ]}
                            onPress={() => setRadiusUnit(unit)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.radiusUnitText,
                                radiusUnit === unit &&
                                  styles.radiusUnitTextActive,
                              ]}
                            >
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {touched.radius && !radiusValue.trim() && (
                      <Text style={styles.inlineError}>
                        Service area radius is required.
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Dynamic custom fields from subcategory */}
              {allCustomFields.map((field) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={customFieldValues[field.id] ?? ""}
                  onChange={(v) =>
                    setCustomFieldValues((prev) => ({ ...prev, [field.id]: v }))
                  }
                  onBlur={() => touch(`cf_${field.id}`)}
                  touched={!!touched[`cf_${field.id}`]}
                  onOpenPicker={(f) => {
                    touch(`cf_${f.id}`);
                    openFieldPicker(f);
                  }}
                />
              ))}

              <View style={styles.field}>
                <Text style={styles.label}>
                  Service Description <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Briefly describe your experience, specialties, approach, and the type of clients you typically serve."
                  placeholderTextColor={neutral[300]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  onBlur={() => touch("description")}
                />
                {touched.description && !description.trim() && (
                  <Text style={styles.inlineError}>
                    Service description is required.
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  About You <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textareaLarge}
                  placeholderTextColor={neutral[300]}
                  value={aboutYou}
                  onChangeText={setAboutYou}
                  multiline
                  textAlignVertical="top"
                  onBlur={() => touch("aboutYou")}
                />
                {touched.aboutYou && !aboutYou.trim() && (
                  <Text style={styles.inlineError}>About you is required.</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Your slogan <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textarea}
                  placeholder='e.g. "Reliable handyman for small home repairs"'
                  placeholderTextColor={neutral[300]}
                  value={slogan}
                  onChangeText={setSlogan}
                  multiline
                  textAlignVertical="top"
                  onBlur={() => touch("slogan")}
                />
                {touched.slogan && !slogan.trim() && (
                  <Text style={styles.inlineError}>Slogan is required.</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Images / Portfolio <Text style={styles.required}>*</Text>
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageThumbnailRow}
                >
                  {selectedImages.map((uri, i) => (
                    <View key={i} style={styles.imageThumbnailWrap}>
                      <ExpoImage
                        source={{ uri }}
                        style={styles.imageThumbnail}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={styles.imageThumbnailRemove}
                        onPress={() =>
                          setSelectedImages((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Feather name="x" size={12} color={neutral[0]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handlePickImages}
                    activeOpacity={0.7}
                  >
                    <Feather name="upload" size={22} color={neutral[400]} />
                    <Text style={styles.uploadText}>Upload Image</Text>
                  </TouchableOpacity>
                </ScrollView>
                {touched.images && selectedImages.length === 0 && (
                  <Text style={styles.inlineError}>
                    At least one image is required.
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Certifications / Licenses</Text>
                  <Feather name="info" size={15} color={neutral[400]} />
                </View>
                {certifications.map((cert, i) => (
                  <View key={i} style={styles.certRecord}>
                    <View style={styles.certRecordHeader}>
                      <TextInput
                        style={[styles.input, styles.certNameInput]}
                        placeholder="Certification name"
                        placeholderTextColor={neutral[300]}
                        value={cert.name}
                        onChangeText={(v) =>
                          setCertifications((prev) =>
                            prev.map((c, j) =>
                              j === i ? { ...c, name: v } : c,
                            ),
                          )
                        }
                      />
                      {certifications.length >= 1 && (
                        <TouchableOpacity
                          style={styles.certRemoveBtn}
                          onPress={() =>
                            setCertifications((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Feather name="x" size={16} color={neutral[400]} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {cert.pdf ? (
                      <View style={styles.certPdfRow}>
                        <Feather
                          name="file-text"
                          size={14}
                          color={neutral[400]}
                        />
                        <Text style={styles.certPdfName} numberOfLines={1}>
                          {cert.pdf.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setCertifications((prev) =>
                              prev.map((c, j) =>
                                j === i ? { ...c, pdf: null } : c,
                              ),
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Feather name="x" size={14} color={neutral[400]} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.certUploadBtn}
                          onPress={() => handlePickPdf(i)}
                          activeOpacity={0.7}
                        >
                          <Feather
                            name="upload"
                            size={13}
                            color={neutral[400]}
                          />
                          <Text style={styles.certUploadText}>Upload PDF</Text>
                        </TouchableOpacity>
                        {cert.name.trim() ? (
                          <Text style={styles.certPdfError}>
                            Please upload a PDF for this certification.
                          </Text>
                        ) : null}
                      </>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.certAddBtn}
                  onPress={() =>
                    setCertifications((prev) => [
                      ...prev,
                      { name: "", pdf: null },
                    ])
                  }
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={15} color={primary[500]} />
                  <Text style={styles.certAddText}>Add Certification</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 4: Pricing ──────────────────────────────── */}
          {formStep === 4 && (
            <>
              <Text style={styles.title}>Pricing</Text>
              <Text style={styles.subtitle}>Set your pricing model</Text>

              <View style={styles.pricingSection}>
                <Text style={styles.pricingSectionTitle}>Service Rate</Text>
                <Text style={styles.pricingSectionDesc}>
                  Service rate = base rate + add-ons
                </Text>

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
                        onBlur={() => touch("baseRate")}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.rateUnitDropdown}
                      onPress={() => openRateUnitPicker("base")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rateUnitText}>
                        {formatRateUnit(baseRateUnit)}
                      </Text>
                      <Feather
                        name="chevron-down"
                        size={14}
                        color={neutral[400]}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.baseRate && !baseRate.trim() && (
                    <Text style={styles.inlineError}>
                      Base rate is required.
                    </Text>
                  )}
                </View>

                {/* Dynamic addon rows from subcategory templates */}
                {(subcategoryData?.addonTemplates ?? []).length > 0 && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Add-Ons</Text>
                    {subcategoryData!.addonTemplates.map((template) => (
                      <View key={template.id} style={styles.addOnRow}>
                        <Text style={styles.addOnLabel}>{template.name}</Text>
                        <View style={styles.rateInputBox}>
                          <Text style={styles.rateCurrency}>$</Text>
                          <TextInput
                            style={styles.rateTextInput}
                            value={addonRates[template.id] ?? ""}
                            onChangeText={(v) =>
                              setAddonRates((prev) => ({
                                ...prev,
                                [template.id]: v,
                              }))
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
                            {formatRateUnit(
                              addonUnits[template.id] ?? "booking",
                            )}
                          </Text>
                          <Feather
                            name="chevron-down"
                            size={14}
                            color={neutral[400]}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Step 5: Review Your Service ──────────────────── */}
          {formStep === 5 && (
            <>
              <Text style={[styles.title, styles.reviewTitle]}>
                Review Your Service
              </Text>
              <Text style={[styles.subtitle, styles.reviewSubtitle]}>
                Make sure everything looks right before submitting
              </Text>

              {/* SERVICE CATEGORY */}
              <View style={styles.reviewSection}>
                <ReviewSectionHeader label="SERVICE CATEGORY" />
                {subcategoryData?.category.name ? (
                  <ReviewInlineRow
                    label="Category"
                    value={subcategoryData.category.name}
                  />
                ) : null}
                {subcategoryName ? (
                  <ReviewInlineRow
                    label="Subcategory"
                    value={subcategoryName}
                  />
                ) : null}
              </View>

              {/* WORK TYPE */}
              <View style={styles.reviewSection}>
                <ReviewSectionHeader label="WORK TYPE" />
                <ReviewInlineRow
                  label="Work Type"
                  value={serviceMode === "business" ? "Business" : "Freelance"}
                />
                {serviceMode === "business" && businessName ? (
                  <ReviewInlineRow label="Business" value={businessName} />
                ) : null}
              </View>

              {/* SERVICE INFORMATION */}
              <View style={styles.reviewSection}>
                <ReviewSectionHeader
                  label="SERVICE INFORMATION"
                  onEdit={() => setFormStep(3)}
                />

                <Text style={styles.serviceTitle}>{title}</Text>

                <ReviewInlineRow
                  label="Service Type"
                  value={serviceType === "in-person" ? "In-person" : "Remote"}
                />
                {serviceType === "in-person" && address ? (
                  <ReviewFieldBlock label="Service Address" value={address} />
                ) : null}
                {serviceType === "in-person" && radiusValue ? (
                  <ReviewInlineRow
                    label="Service Area Radius"
                    value={`${radiusValue} ${radiusUnit}`}
                  />
                ) : null}

                {/* Dynamic custom field values */}
                {allCustomFields.map((field) => {
                  const raw = customFieldValues[field.id];
                  if (!raw) return null;
                  let display = raw;
                  if (field.fieldType === "multiSelect") {
                    try {
                      const arr = JSON.parse(raw) as string[];
                      if (arr.length === 0) return null;
                      display = arr.join(", ");
                    } catch {
                      display = raw;
                    }
                  }
                  return (
                    <ReviewInlineRow
                      key={field.id}
                      label={field.fieldLabel}
                      value={display}
                    />
                  );
                })}

                {aboutYou ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>About</Text>
                    <Text style={styles.bodyText}>{aboutYou}</Text>
                  </View>
                ) : null}

                {description ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>Description</Text>
                    <Text style={styles.bodyText}>{description}</Text>
                  </View>
                ) : null}

                {slogan ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>Slogan</Text>
                    <Text style={styles.bodyText}>{slogan}</Text>
                  </View>
                ) : null}

                {/* Images */}
                {selectedImages.length > 0 ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>Images</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.imageThumbnailRow}
                    >
                      {selectedImages.map((uri, i) => (
                        <ExpoImage
                          key={i}
                          source={{ uri }}
                          style={styles.reviewImage}
                          contentFit="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {certifications.some((c) => c.name.trim()) ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>
                      Certifications / Licenses
                    </Text>
                    <View style={styles.pdfReviewList}>
                      {certifications
                        .filter((c) => c.name.trim())
                        .map((cert, i) => (
                          <View key={i} style={styles.certReviewRow}>
                            <View style={styles.certReviewLeft}>
                              <MaterialIcons
                                name="insert-drive-file"
                                size={14}
                                color={neutral[300]}
                              />
                              <Text style={styles.certText}>{cert.name}</Text>
                            </View>
                            <View style={styles.pdfReviewRow}>
                              <Text
                                style={styles.pdfReviewName}
                                numberOfLines={1}
                              >
                                {cert.pdf!.name}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </View>
                  </View>
                ) : null}
              </View>

              {/* PRICING */}
              <View style={styles.reviewSection}>
                <ReviewSectionHeader
                  label="PRICING"
                  onEdit={() => setFormStep(4)}
                />

                <ReviewPricingRow
                  label="Base Rate"
                  value={formatRate(baseRate, baseRateUnit)}
                />

                {(subcategoryData?.addonTemplates ?? []).some((t) =>
                  addonRates[t.id]?.trim(),
                ) ? (
                  <>
                    <View style={styles.pricingDivider} />
                    {subcategoryData!.addonTemplates.map((template) => {
                      const rate = addonRates[template.id];
                      if (!rate?.trim()) return null;
                      return (
                        <ReviewPricingRow
                          key={template.id}
                          label={template.name}
                          value={formatRate(
                            rate,
                            addonUnits[template.id] ?? "booking",
                          )}
                        />
                      );
                    })}
                  </>
                ) : null}
              </View>

              {/* CONSENT */}
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsented((v) => !v)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, consented && styles.checkboxChecked]}
                >
                  {consented && (
                    <Feather name="check" size={13} color={neutral[0]} />
                  )}
                </View>
                <Text style={styles.consentText}>
                  I confirm that the information provided is accurate. I
                  acknowledge that providing false or misleading information may
                  result in removal from the platform.
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit error */}
      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      {/* Footer */}
      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Back"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          onPress={handleBack}
        />
        <Button
          title={formStep === 5 ? "Submit" : "Next"}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
          disabled={!canProceed}
          loading={formStep === 5 && submitting}
          onPress={handleNext}
        />
      </View>

      {/* Address picker bottom sheet */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeAddressPicker()}
      >
        <Animated.View
          style={[styles.bottomSheetBackdrop, { opacity: backdropAddressAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => closeAddressPicker()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAddressAnim }] },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Service Address</Text>

          <View style={styles.addressSearchRow}>
            <Feather name="search" size={16} color={neutral[400]} />
            <TextInput
              style={styles.addressSearchInput}
              placeholder="Search for an address..."
              placeholderTextColor={neutral[300]}
              value={addressSearch}
              onChangeText={handleAddressSearch}
              autoCorrect={false}
            />
            {searchLoading && (
              <Feather name="loader" size={14} color={neutral[300]} />
            )}
            {addressSearch.length > 0 && !searchLoading && (
              <TouchableOpacity
                onPress={() => {
                  setAddressSearch("");
                  setSearchResults([]);
                }}
              >
                <Feather name="x" size={16} color={neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.length > 0 &&
              searchResults.map((result, index) => (
                <TouchableOpacity
                  key={`${result.lat}-${result.lon}`}
                  style={[
                    styles.bottomSheetOption,
                    index < searchResults.length - 1 &&
                      styles.bottomSheetOptionBorder,
                  ]}
                  onPress={() =>
                    closeAddressPicker(() => {
                      setAddress(result.display_name);
                      setAddressSearch("");
                      setSearchResults([]);
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.addressOptionRow}>
                    <Feather name="map-pin" size={16} color={neutral[400]} />
                    <Text
                      style={[
                        styles.bottomSheetOptionText,
                        styles.searchResultText,
                      ]}
                    >
                      {result.display_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

            {searchResults.length === 0 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.bottomSheetOption,
                    styles.bottomSheetOptionBorder,
                  ]}
                  onPress={() =>
                    closeAddressPicker(() => {
                      setAddress("My Current Location");
                      setAddressId(null);
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.addressOptionRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={primary[400]}
                    />
                    <Text
                      style={[
                        styles.bottomSheetOptionText,
                        { color: primary[500] },
                      ]}
                    >
                      Use My Current Location
                    </Text>
                  </View>
                  {address === "My Current Location" && (
                    <Feather name="check" size={16} color={primary[400]} />
                  )}
                </TouchableOpacity>

                {savedAddresses.map((a, index) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.bottomSheetOption,
                      index < savedAddresses.length - 1 &&
                        styles.bottomSheetOptionBorder,
                      address === a.address && styles.bottomSheetOptionSelected,
                    ]}
                    onPress={() =>
                      closeAddressPicker(() => {
                        setAddress(a.address);
                        setAddressId(a.id);
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressOptionRow}>
                      <Feather name="map-pin" size={16} color={neutral[400]} />
                      <View style={styles.addressOptionTextGroup}>
                        <Text
                          style={[
                            styles.bottomSheetOptionText,
                            address === a.address &&
                              styles.bottomSheetOptionTextSelected,
                          ]}
                        >
                          {a.address}
                        </Text>
                        {a.isDefault && (
                          <Text style={styles.addressDefaultBadge}>
                            Default
                          </Text>
                        )}
                      </View>
                    </View>
                    {address === a.address && (
                      <Feather name="check" size={16} color={primary[400]} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* Generic select-field options bottom sheet */}
      <Modal
        visible={pickerField !== null}
        transparent
        animationType="none"
        onRequestClose={() => closeFieldPicker()}
      >
        <Animated.View
          style={[styles.bottomSheetBackdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => closeFieldPicker()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>{pickerField?.fieldLabel}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(pickerField?.options ?? []).map((option, index) => {
              const options = pickerField?.options ?? [];
              const isMulti = pickerField?.fieldType === "multiSelect";
              let isSelected: boolean;
              if (isMulti) {
                try {
                  const arr = JSON.parse(
                    customFieldValues[pickerField!.id] ?? "[]",
                  ) as string[];
                  isSelected = arr.includes(option);
                } catch {
                  isSelected = false;
                }
              } else {
                isSelected = customFieldValues[pickerField!.id] === option;
              }
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.bottomSheetOption,
                    index < options.length - 1 &&
                      styles.bottomSheetOptionBorder,
                    isSelected && styles.bottomSheetOptionSelected,
                  ]}
                  onPress={() => {
                    if (isMulti) {
                      setCustomFieldValues((prev) => {
                        let arr: string[];
                        try {
                          arr = JSON.parse(
                            prev[pickerField!.id] ?? "[]",
                          ) as string[];
                        } catch {
                          arr = [];
                        }
                        const next = arr.includes(option)
                          ? arr.filter((o) => o !== option)
                          : [...arr, option];
                        return {
                          ...prev,
                          [pickerField!.id]: JSON.stringify(next),
                        };
                      });
                    } else {
                      closeFieldPicker(() =>
                        setCustomFieldValues((prev) => ({
                          ...prev,
                          [pickerField!.id]: option,
                        })),
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bottomSheetOptionText,
                      isSelected && styles.bottomSheetOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color={primary[400]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {pickerField?.fieldType === "multiSelect" && (
            <Button
              title="Done"
              variant="primary"
              size="md"
              style={{ marginHorizontal: 20, marginTop: 12 }}
              onPress={() => closeFieldPicker()}
            />
          )}
        </Animated.View>
      </Modal>

      {/* Rate Unit bottom sheet */}
      <Modal
        visible={rateUnitModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeRateUnitPicker()}
      >
        <Animated.View
          style={[
            styles.bottomSheetBackdrop,
            { opacity: backdropRateUnitAnim },
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => closeRateUnitPicker()}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideRateUnitAnim }] },
          ]}
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
                    index < RATE_UNITS.length - 1 &&
                      styles.bottomSheetOptionBorder,
                    isSelected && styles.bottomSheetOptionSelected,
                  ]}
                  onPress={() =>
                    closeRateUnitPicker(() => setActiveRateUnit(unit))
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bottomSheetOptionText,
                      isSelected && styles.bottomSheetOptionTextSelected,
                    ]}
                  >
                    {formatRateUnit(unit)}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color={primary[400]} />
                  )}
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
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: {
    flex: 1,
  },
  // Step header
  stepHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[500],
  },
  stepPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: primary[400],
  },
  progressTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[100],
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: primary[400],
    borderRadius: 2,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  scrollContentReview: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  // Title
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[800],
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  reviewTitle: {
    marginTop: 16,
  },
  reviewSubtitle: {
    marginBottom: 4,
  },
  // Fields
  field: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[700],
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  required: {
    color: secondary[500],
  },
  input: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: neutral[800],
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    borderColor: primary[400],
    backgroundColor: primary[50],
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
  },
  segmentTextActive: {
    color: primary[500],
    fontWeight: "600",
  },
  radiusRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  radiusInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: neutral[800],
  },
  radiusUnitGroup: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    overflow: "hidden",
  },
  radiusUnitButton: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusUnitButtonActive: {
    backgroundColor: primary[50],
  },
  radiusUnitText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
  },
  radiusUnitTextActive: {
    color: primary[500],
    fontWeight: "600",
  },
  addressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  addressInputRowDisabled: {
    backgroundColor: background.subtle,
    borderColor: border.default,
  },
  addressLockedHint: {
    fontSize: 12,
    color: neutral[400],
  },
  addressIcon: {
    flexShrink: 0,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  addressValue: {
    color: neutral[800],
  },
  addressPlaceholder: {
    color: neutral[300],
  },
  addressSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressSearchInput: {
    flex: 1,
    fontSize: 14,
    color: neutral[800],
    padding: 0,
  },
  searchResultText: {
    flex: 1,
    flexShrink: 1,
  },
  addressOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  addressOptionTextGroup: {
    flex: 1,
    gap: 2,
  },
  addressDefaultBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: primary[500],
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: neutral[300],
  },
  dropdownValue: {
    fontSize: 14,
    color: neutral[800],
  },
  textarea: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 14,
    color: neutral[800],
    minHeight: 100,
  },
  textareaLarge: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 14,
    color: neutral[800],
    minHeight: 130,
  },
  uploadBox: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: border.default,
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: background.subtle,
  },
  uploadText: {
    fontSize: 10,
    fontWeight: "500",
    color: neutral[400],
    textAlign: "center",
  },
  pdfThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.subtle,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  pdfThumbnailName: {
    fontSize: 9,
    color: neutral[500],
    textAlign: "center",
  },
  pdfReviewList: {
    gap: 6,
    marginTop: 4,
  },
  pdfReviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pdfReviewName: {
    fontSize: 12,
    color: neutral[700],
    flex: 1,
  },
  // ── Step 4: Pricing ───────────────────────────────────────────
  pricingSection: {
    marginBottom: 24,
  },
  pricingSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: neutral[800],
    marginBottom: 4,
  },
  pricingSectionDesc: {
    fontSize: 13,
    color: neutral[400],
    marginBottom: 20,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rateInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 4,
  },
  rateCurrency: {
    fontSize: 14,
    color: neutral[600],
    fontWeight: "500",
  },
  rateTextInput: {
    flex: 1,
    fontSize: 14,
    color: neutral[800],
    padding: 0,
  },
  rateUnitDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  rateUnitText: {
    fontSize: 13,
    color: neutral[600],
    fontWeight: "500",
  },
  addOnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  addOnLabel: {
    width: 100,
    fontSize: 13,
    color: neutral[600],
    lineHeight: 18,
  },
  // ── Step 5: Review ────────────────────────────────────────────
  reviewSection: {
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    padding: 16,
    gap: 8,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  reviewSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionIcon: {
    width: 30,
    height: 30,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.screen,
  },
  editBtnIcon: {
    width: 13,
    height: 13,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral[600],
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[700],
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[800],
  },
  fieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[400],
  },
  fieldValue: {
    fontSize: 13,
    color: neutral[700],
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inlineLabel: {
    fontSize: 12,
    color: neutral[400],
  },
  inlineValue: {
    fontSize: 12,
    color: neutral[700],
  },
  subBlock: {
    gap: 5,
    marginTop: 2,
  },
  subBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[700],
  },
  bodyText: {
    fontSize: 12,
    color: neutral[600],
    lineHeight: 19,
  },
  certRecord: {
    gap: 8,
    marginBottom: 12,
  },
  certRecordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  certNameInput: {
    flex: 1,
    marginBottom: 0,
  },
  certRemoveBtn: {
    padding: 4,
  },
  certPdfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  certPdfName: {
    flex: 1,
    fontSize: 12,
    color: neutral[600],
  },
  certUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  certUploadText: {
    fontSize: 12,
    color: neutral[400],
  },
  certPdfError: {
    fontSize: 12,
    color: status.error,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  inlineError: {
    fontSize: 12,
    color: status.error,
    marginTop: 4,
  },
  certAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  certAddText: {
    fontSize: 13,
    fontWeight: "600",
    color: primary[500],
  },
  certReviewRow: {
    gap: 2,
  },
  certReviewLeft: {
    flexDirection: "row",
    gap: 6,
  },
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  certText: {
    fontSize: 12,
    color: neutral[700],
    flex: 1,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  pricingLabel: {
    fontSize: 13,
    color: neutral[700],
    flex: 1,
  },
  pricingValue: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[800],
  },
  pricingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginVertical: 4,
  },
  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // Bottom sheet
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.light,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: background.screen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  bottomSheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: neutral[700],
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  bottomSheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  bottomSheetOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  bottomSheetOptionSelected: {
    backgroundColor: primary[50],
  },
  bottomSheetOptionText: {
    fontSize: 15,
    color: neutral[700],
  },
  bottomSheetOptionTextSelected: {
    color: primary[500],
    fontWeight: "600",
  },
  // ── Success screen ────────────────────────────────────────────
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  illustrationImg: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: neutral[800],
    textAlign: "center",
  },
  successDesc: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 21,
  },
  submitError: {
    fontSize: 13,
    color: status.error,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  // Image thumbnails
  imageThumbnailRow: {
    marginBottom: 4,
  },
  imageThumbnailWrap: {
    position: "relative",
    marginRight: 8,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imageThumbnailRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: overlay.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  // Consent
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: neutral[300],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: primary[400],
    borderColor: primary[400],
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: neutral[600],
    lineHeight: 20,
  },
  consentLink: {
    color: primary[500],
    fontWeight: "600",
  },
});
