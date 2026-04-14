import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
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

const { primary, secondary, neutral, background, border } = Colors;

const TOTAL_STEPS = 5;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const RADIUS_UNITS = ["mile", "km"] as const;
type RadiusUnit = (typeof RADIUS_UNITS)[number];

const PET_TYPES = ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Reptile"];

const RATE_UNITS = ["per booking", "per hour", "per night", "per day"] as const;
type RateUnit = (typeof RATE_UNITS)[number];

type RateField = "base" | "additionalPet" | "petWeight";

type ServiceType = "in-person" | "remote";

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
  const router = useRouter();
  const { subcategoryName } = useLocalSearchParams<{
    subcategoryId: string;
    subcategoryName: string;
  }>();

  // Step navigation
  const [formStep, setFormStep] = useState(3);
  const progress = formStep / TOTAL_STEPS;

  // ── Step 3 state ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);

  // Pet type picker
  const [petType, setPetType] = useState<string | null>(null);
  const [petTypeModalVisible, setPetTypeModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  function openPetTypePicker() {
    setPetTypeModalVisible(true);
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

  function closePetTypePicker(callback?: () => void) {
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
      setPetTypeModalVisible(false);
      callback?.();
    });
  }

  // Address picker
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [address, setAddress] = useState("");
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
    fetch(`${API_BASE_URL}/users/1`)
      .then((r) => r.json())
      .then((user) => {
        const addresses: Address[] = user?.address ?? [];
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (defaultAddr) setAddress(defaultAddr.address);
      })
      .catch(() => {});
  }, []);

  const [aboutYou, setAboutYou] = useState("");
  const [slogan, setSlogan] = useState("");
  const [certifications, setCertifications] = useState("");

  const canProceedStep3 =
    title.trim().length > 0 &&
    serviceType !== null &&
    (serviceType !== "in-person" ||
      (radiusValue.trim().length > 0 && address.trim().length > 0)) &&
    petType !== null &&
    description.trim().length > 0 &&
    aboutYou.trim().length > 0 &&
    slogan.trim().length > 0;

  // ── Step 4 state ──────────────────────────────────────────────
  const [baseRate, setBaseRate] = useState("");
  const [baseRateUnit, setBaseRateUnit] = useState<RateUnit>("per booking");
  const [additionalPetRate, setAdditionalPetRate] = useState("");
  const [additionalPetUnit, setAdditionalPetUnit] =
    useState<RateUnit>("per booking");
  const [petWeightRate, setPetWeightRate] = useState("");
  const [petWeightUnit, setPetWeightUnit] = useState<RateUnit>("per booking");

  const [rateUnitModalVisible, setRateUnitModalVisible] = useState(false);
  const [activeRateField, setActiveRateField] = useState<RateField>("base");
  const slideRateUnitAnim = useRef(new Animated.Value(300)).current;
  const backdropRateUnitAnim = useRef(new Animated.Value(0)).current;

  function openRateUnitPicker(field: RateField) {
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
    if (activeRateField === "additionalPet") return additionalPetUnit;
    return petWeightUnit;
  }

  function setActiveRateUnit(unit: RateUnit) {
    if (activeRateField === "base") setBaseRateUnit(unit);
    else if (activeRateField === "additionalPet") setAdditionalPetUnit(unit);
    else setPetWeightUnit(unit);
  }

  const canProceedStep4 = baseRate.trim().length > 0;

  // ── Navigation ────────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);

  const canProceed =
    formStep === 3 ? canProceedStep3 : formStep === 4 ? canProceedStep4 : true;

  function handleNext() {
    if (formStep === 3 && canProceedStep3) setFormStep(4);
    else if (formStep === 4 && canProceedStep4) setFormStep(5);
    else if (formStep === 5) setSubmitted(true);
  }

  function handleBack() {
    if (formStep > 3) setFormStep(formStep - 1);
    else router.back();
  }

  const formatRate = (rate: string, unit: string) =>
    `$${parseFloat(rate || "0").toFixed(2)} ${unit}`;

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
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

          <TouchableOpacity
            style={styles.createAnotherBtn}
            onPress={() => router.replace("/(tabs)/services")}
            activeOpacity={0.85}
          >
            <Text style={styles.createAnotherText}>Create another Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          contentContainerStyle={
            formStep === 5 ? styles.scrollContentReview : styles.scrollContent
          }
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
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Service Type <Text style={styles.required}>*</Text>
                </Text>
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
                      style={styles.addressInputRow}
                      onPress={openAddressPicker}
                      activeOpacity={0.7}
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
                      <Feather
                        name="chevron-down"
                        size={18}
                        color={neutral[400]}
                      />
                    </TouchableOpacity>
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
                  </View>
                </>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>
                  Pet Type <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={openPetTypePicker}
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      petType
                        ? styles.dropdownValue
                        : styles.dropdownPlaceholder
                    }
                  >
                    {petType ?? "Type"}
                  </Text>
                  <Feather name="chevron-down" size={18} color={neutral[400]} />
                </TouchableOpacity>
              </View>

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
                />
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
                />
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
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Images / Portfolio</Text>
                <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
                  <Feather name="upload" size={22} color={neutral[400]} />
                  <Text style={styles.uploadText}>Upload Images</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Certifications / Licenses</Text>
                  <Feather name="info" size={15} color={neutral[400]} />
                </View>
                <TextInput
                  style={styles.textarea}
                  placeholder="List your certifications or licenses."
                  placeholderTextColor={neutral[300]}
                  value={certifications}
                  onChangeText={setCertifications}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.uploadPdfRow}
                  activeOpacity={0.7}
                >
                  <Feather name="upload" size={15} color={neutral[400]} />
                  <Text style={styles.uploadPdfText}>Upload PDF</Text>
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
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.rateUnitDropdown}
                      onPress={() => openRateUnitPicker("base")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rateUnitText}>{baseRateUnit}</Text>
                      <Feather
                        name="chevron-down"
                        size={14}
                        color={neutral[400]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Add-Ons</Text>
                  <View style={styles.addOnRow}>
                    <Text style={styles.addOnLabel}>Additional Pet</Text>
                    <View style={styles.rateInputBox}>
                      <Text style={styles.rateCurrency}>$</Text>
                      <TextInput
                        style={styles.rateTextInput}
                        value={additionalPetRate}
                        onChangeText={setAdditionalPetRate}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={neutral[300]}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.rateUnitDropdown}
                      onPress={() => openRateUnitPicker("additionalPet")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rateUnitText}>
                        {additionalPetUnit}
                      </Text>
                      <Feather
                        name="chevron-down"
                        size={14}
                        color={neutral[400]}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.addOnRow}>
                    <Text style={styles.addOnLabel}>
                      {"Pet Weight >\n50 lbs"}
                    </Text>
                    <View style={styles.rateInputBox}>
                      <Text style={styles.rateCurrency}>$</Text>
                      <TextInput
                        style={styles.rateTextInput}
                        value={petWeightRate}
                        onChangeText={setPetWeightRate}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={neutral[300]}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.rateUnitDropdown}
                      onPress={() => openRateUnitPicker("petWeight")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rateUnitText}>{petWeightUnit}</Text>
                      <Feather
                        name="chevron-down"
                        size={14}
                        color={neutral[400]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
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
              {subcategoryName ? (
                <View style={styles.reviewSection}>
                  <ReviewSectionHeader label="SERVICE CATEGORY" />
                  <Text style={styles.categoryText}>{subcategoryName}</Text>
                </View>
              ) : null}

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
                {petType ? (
                  <ReviewInlineRow label="Pet Type" value={petType} />
                ) : null}

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

                {certifications ? (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockLabel}>
                      Certifications / Licenses
                    </Text>
                    <View style={styles.certRow}>
                      <MaterialIcons
                        name="workspace-premium"
                        size={15}
                        color={primary[400]}
                      />
                      <Text style={styles.certText}>{certifications}</Text>
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

                {additionalPetRate || petWeightRate ? (
                  <>
                    <View style={styles.pricingDivider} />
                    {additionalPetRate ? (
                      <ReviewPricingRow
                        label="Additional Pet"
                        value={formatRate(additionalPetRate, additionalPetUnit)}
                      />
                    ) : null}
                    {petWeightRate ? (
                      <ReviewPricingRow
                        label="Pet Weight > 50 lbs"
                        value={formatRate(petWeightRate, petWeightUnit)}
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, canProceed && styles.nextButtonActive]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.nextButtonText,
              canProceed && styles.nextButtonTextActive,
            ]}
          >
            {formStep === 5 ? "Submit" : "Next"}
          </Text>
        </TouchableOpacity>
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
                    closeAddressPicker(() => setAddress("My Current Location"))
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
                      closeAddressPicker(() => setAddress(a.address))
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

      {/* Pet Type bottom sheet */}
      <Modal
        visible={petTypeModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closePetTypePicker()}
      >
        <Animated.View
          style={[styles.bottomSheetBackdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => closePetTypePicker()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Pet Type</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {PET_TYPES.map((type, index) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.bottomSheetOption,
                  index < PET_TYPES.length - 1 &&
                    styles.bottomSheetOptionBorder,
                  petType === type && styles.bottomSheetOptionSelected,
                ]}
                onPress={() => closePetTypePicker(() => setPetType(type))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.bottomSheetOptionText,
                    petType === type && styles.bottomSheetOptionTextSelected,
                  ]}
                >
                  {type}
                </Text>
                {petType === type && (
                  <Feather name="check" size={16} color={primary[400]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
                    {unit}
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
    borderWidth: 1,
    borderColor: border.default,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: background.subtle,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[400],
  },
  uploadPdfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  uploadPdfText: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[400],
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
  // ── Step 5: Review (mirrors service-detail layout) ────────────
  reviewSection: {
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    padding: 16,
    gap: 8,
    shadowColor: "#000",
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
    color: "#303030",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222b45",
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
    color: "#303030",
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
    color: "#303030",
  },
  subBlock: {
    gap: 5,
    marginTop: 2,
  },
  subBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#303030",
  },
  bodyText: {
    fontSize: 12,
    color: "#505050",
    lineHeight: 19,
  },
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  certText: {
    fontSize: 12,
    color: "#303030",
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
    color: "#303030",
    flex: 1,
  },
  pricingValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#222b45",
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
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonActive: {
    backgroundColor: primary[400],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[400],
  },
  nextButtonTextActive: {
    color: neutral[0],
  },
  // Bottom sheet
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
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
  createAnotherBtn: {
    marginTop: 16,
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: primary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  createAnotherText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
});
