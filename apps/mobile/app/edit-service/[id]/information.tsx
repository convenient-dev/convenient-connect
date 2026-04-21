import { BackButton } from "@/components/BackButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CustomField, CustomFieldInput } from "@/components/CustomFieldInput";
import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

const RADIUS_UNITS = ["mile", "km"] as const;
type RadiusUnit = (typeof RADIUS_UNITS)[number];
type ServiceType = "inPerson" | "remote";
type ServiceMode = "freelance" | "business";

interface Address {
  id: number;
  address: string;
  isDefault: boolean;
}

interface ServiceDetail {
  id: number;
  title: string;
  serviceType: ServiceType;
  serviceMode: ServiceMode;
  areaRadius: string | null;
  unit: RadiusUnit;
  aboutYou: string;
  description: string;
  slogan: string | null;
  images: { id: number; url: string; altText: string | null }[];
  certifications: {
    id: number;
    name: string;
    url: string;
    fileName: string | null;
  }[];
  customValues: {
    id: number;
    valueText: string | null;
    valueNumber: string | null;
    valueBoolean: boolean | null;
    valueJson: unknown | null;
    field: { fieldLabel: string; fieldType: string };
  }[];
  subcategory: {
    id: number;
    name: string;
    category: { id: number; name: string };
  } | null;
  address: { address: string } | null;
}

export default function EditServiceInformationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedModalVisible, setSavedModalVisible] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("freelance");
  const [serviceType, setServiceType] = useState<ServiceType>("remote");
  const [address, setAddress] = useState("");
  const [addressId, setAddressId] = useState<number | null>(null);
  const [radiusValue, setRadiusValue] = useState("");
  const [radiusUnit, setRadiusUnit] = useState<RadiusUnit>("mile");
  const [description, setDescription] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [slogan, setSlogan] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<number, string>
  >({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  type Certification = {
    name: string;
    pdf: { uri: string; name: string } | null;
  };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [existingCertifications, setExistingCertifications] = useState<
    { id: number; name: string; fileName: string | null; url: string }[]
  >([]);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  // Address picker
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAddressAnim = useRef(new Animated.Value(300)).current;
  const backdropAddressAnim = useRef(new Animated.Value(0)).current;

  // Custom field picker
  const [pickerField, setPickerField] = useState<CustomField | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/services/${id}`).then((r) =>
        r.json(),
      ) as Promise<ServiceDetail>,
      fetch(`${API_BASE_URL}/users/1`).then((r) => r.json()),
    ])
      .then(([service, user]) => {
        setTitle(service.title);
        setServiceMode(service.serviceMode);
        setServiceType(service.serviceType);
        if (service.areaRadius) {
          setRadiusValue(parseFloat(service.areaRadius).toString());
        }
        setRadiusUnit(service.unit ?? "mile");
        setDescription(service.description ?? "");
        setAboutYou(service.aboutYou ?? "");
        setSlogan(service.slogan ?? "");
        setExistingImages(service.images);
        setExistingCertifications(
          service.certifications.map((c) => ({
            id: c.id,
            name: c.name,
            fileName: c.fileName,
            url: c.url,
          })),
        );

        if (service.address) {
          setAddress(service.address.address);
        }

        const addresses: Address[] = user?.address ?? [];
        setSavedAddresses(addresses);
        if (!service.address) {
          const defaultAddr =
            addresses.find((a) => a.isDefault) ?? addresses[0];
          if (defaultAddr) {
            setAddress(defaultAddr.address);
            setAddressId(defaultAddr.id);
          }
        }

        // Pre-fill custom field values
        const values: Record<number, string> = {};
        service.customValues.forEach((cv) => {
          if (cv.valueText) values[-cv.id] = cv.valueText;
        });

        // Fetch custom fields from subcategory
        if (service.subcategory) {
          fetch(`${API_BASE_URL}/subcategories/${service.subcategory.id}`)
            .then((r) => r.json())
            .then((subcatData) => {
              const fields: CustomField[] = [
                ...(subcatData?.customFields ?? []),
                ...(subcatData?.category?.customFields ?? []),
              ];
              setCustomFields(fields);

              // Map existing custom values by field id
              const mapped: Record<number, string> = {};
              service.customValues.forEach((cv) => {
                const field = fields.find(
                  (f) => f.fieldLabel === cv.field.fieldLabel,
                );
                if (field) {
                  if (cv.valueText) mapped[field.id] = cv.valueText;
                  else if (cv.valueNumber) mapped[field.id] = cv.valueNumber;
                  else if (cv.valueBoolean != null)
                    mapped[field.id] = cv.valueBoolean ? "Yes" : "No";
                  else if (cv.valueJson && Array.isArray(cv.valueJson))
                    mapped[field.id] = JSON.stringify(cv.valueJson);
                }
              });
              setCustomFieldValues(mapped);
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  async function handlePickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  }

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

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        title,
        serviceType: serviceType === "inPerson" ? "in-person" : "remote",
        addressId,
        areaRadius: radiusValue ? Number(radiusValue) : undefined,
        unit: radiusValue ? radiusUnit : undefined,
        description,
        aboutYou,
        slogan,
        customValues: Object.entries(customFieldValues).map(
          ([fieldId, value]) => ({
            fieldId: Number(fieldId),
            value,
          }),
        ),
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

      const service = await res.json();

      // Persist existing certification name changes
      if (existingCertifications.length > 0) {
        await Promise.allSettled(
          existingCertifications.map((cert) =>
            fetch(`${API_BASE_URL}/uploads/pdfs/${cert.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: cert.name }),
            }),
          ),
        );
      }

      // Upload new images
      if (selectedImages.length > 0) {
        await Promise.allSettled(
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
            await fetch(`${API_BASE_URL}/uploads/images`, {
              method: "POST",
              body: formData,
            });
          }),
        );
      }

      // Upload new certifications (name + PDF both required when providing a cert)
      const incompleteCert = certifications.find(
        (c) => c.name.trim() && !c.pdf,
      );
      if (incompleteCert) {
        setSaveError(
          `Please upload a PDF for "${incompleteCert.name.trim()}".`,
        );
        return;
      }
      const certsWithPdf = certifications.filter((c) => c.name.trim() && c.pdf);
      if (certsWithPdf.length > 0) {
        await Promise.allSettled(
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
            await fetch(`${API_BASE_URL}/uploads/pdfs`, {
              method: "POST",
              body: formData,
            });
          }),
        );
      }

      setSavedModalVisible(true);
    } catch {
      setSaveError("Network error. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    aboutYou.trim().length > 0 &&
    (serviceType !== "inPerson" ||
      (radiusValue.trim().length > 0 && address.trim().length > 0)) &&
    !saving;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Service Information</Text>
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
          {/* Title */}
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

          {/* Service Type */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Service Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  serviceType === "inPerson" && styles.segmentButtonActive,
                ]}
                onPress={() => setServiceType("inPerson")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    serviceType === "inPerson" && styles.segmentTextActive,
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

          {serviceType === "inPerson" && (
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
                    serviceMode === "business" ? undefined : openAddressPicker
                  }
                  activeOpacity={serviceMode === "business" ? 1 : 0.7}
                >
                  <Feather name="map-pin" size={16} color={neutral[400]} />
                  <Text
                    style={[
                      styles.addressInput,
                      address ? styles.addressValue : styles.addressPlaceholder,
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
                    Managed by affilidated business
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
                  />
                  <View style={styles.radiusUnitGroup}>
                    {RADIUS_UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.radiusUnitButton,
                          radiusUnit === unit && styles.radiusUnitButtonActive,
                        ]}
                        onPress={() => setRadiusUnit(unit)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.radiusUnitText,
                            radiusUnit === unit && styles.radiusUnitTextActive,
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

          {/* Dynamic custom fields */}
          {customFields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={field}
              value={customFieldValues[field.id] ?? ""}
              onChange={(v) =>
                setCustomFieldValues((prev) => ({ ...prev, [field.id]: v }))
              }
              onBlur={() => {}}
              touched={false}
              onOpenPicker={openFieldPicker}
            />
          ))}

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Service Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textarea}
              placeholder="Briefly describe your experience, specialties, approach..."
              placeholderTextColor={neutral[300]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* About You */}
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

          {/* Slogan */}
          <View style={styles.field}>
            <Text style={styles.label}>Your Slogan</Text>
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

          {/* Images */}
          <View style={styles.field}>
            <Text style={styles.label}>Images / Portfolio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageThumbnailRow}
            >
              {existingImages.map((img) => (
                <View
                  key={`existing-${img.id}`}
                  style={styles.imageThumbnailWrap}
                >
                  <ExpoImage
                    source={{ uri: img.url }}
                    style={styles.imageThumbnail}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.imageThumbnailRemove}
                    onPress={() => {
                      fetch(`${API_BASE_URL}/uploads/images/${img.id}`, {
                        method: "DELETE",
                      }).then((res) => {
                        if (res.ok) {
                          setExistingImages((prev) =>
                            prev.filter((e) => e.id !== img.id),
                          );
                        }
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.map((uri, i) => (
                <View key={`new-${i}`} style={styles.imageThumbnailWrap}>
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
                    <Feather name="x" size={12} color="#fff" />
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
          </View>

          {/* Certifications */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Certifications / Licenses</Text>
              <Feather name="info" size={15} color={neutral[400]} />
            </View>
            {existingCertifications.map((cert) => (
              <View key={`existing-${cert.id}`} style={styles.certRecord}>
                <View style={styles.certRecordHeader}>
                  <TextInput
                    style={[styles.input, styles.certNameInput]}
                    value={cert.name}
                    placeholder="Certification name"
                    placeholderTextColor={neutral[300]}
                    onChangeText={(v) =>
                      setExistingCertifications((prev) =>
                        prev.map((c) =>
                          c.id === cert.id ? { ...c, name: v } : c,
                        ),
                      )
                    }
                  />
                  <TouchableOpacity
                    style={styles.certRemoveBtn}
                    onPress={() => {
                      fetch(`${API_BASE_URL}/uploads/pdfs/${cert.id}`, {
                        method: "DELETE",
                      }).then((res) => {
                        if (res.ok) {
                          setExistingCertifications((prev) =>
                            prev.filter((c) => c.id !== cert.id),
                          );
                        }
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={16} color={neutral[400]} />
                  </TouchableOpacity>
                </View>
                {cert.url ? (
                  <TouchableOpacity
                    style={styles.certPdfRow}
                    onPress={() => WebBrowser.openBrowserAsync(cert.url)}
                    activeOpacity={0.7}
                  >
                    <Feather name="file-text" size={14} color={neutral[400]} />
                    <Text
                      style={[styles.certPdfName, styles.certPdfLink]}
                      numberOfLines={1}
                    >
                      {cert.fileName
                        ? decodeURIComponent(cert.fileName)
                        : "Certificate"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
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
                        prev.map((c, j) => (j === i ? { ...c, name: v } : c)),
                      )
                    }
                  />
                  {certifications.length > 1 && (
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
                    <Feather name="file-text" size={14} color={neutral[400]} />
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
                  <TouchableOpacity
                    style={styles.certUploadBtn}
                    onPress={() => handlePickPdf(i)}
                    activeOpacity={0.7}
                  >
                    <Feather name="upload" size={13} color={neutral[400]} />
                    <Text style={styles.certUploadText}>Upload PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.certAddBtn}
              onPress={() =>
                setCertifications((prev) => [...prev, { name: "", pdf: null }])
              }
              activeOpacity={0.7}
            >
              <Feather name="plus" size={15} color={primary[500]} />
              <Text style={styles.certAddText}>Add Certification</Text>
            </TouchableOpacity>
          </View>
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
          <Text
            style={[
              styles.saveButtonText,
              canSave && styles.saveButtonTextActive,
            ]}
          >
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address bottom sheet */}
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
            {searchResults.length > 0 ? (
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
                      setSearchResults([]);
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.addressOptionRow}>
                    <Feather name="map-pin" size={16} color={neutral[400]} />
                    <Text style={[styles.bottomSheetOptionText, { flex: 1 }]}>
                      {result.display_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
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
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[
                            styles.bottomSheetOptionText,
                            address === a.address && { color: primary[500] },
                          ]}
                        >
                          {a.address}
                        </Text>
                        {a.isDefault && (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: primary[500],
                            }}
                          >
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

      <ConfirmModal
        visible={savedModalVisible}
        icon="success"
        title="Service Updated"
        message="Your service information has been saved successfully."
        confirmLabel="View Service"
        onConfirm={() => {
          setSavedModalVisible(false);
          router.replace(`/service-detail/${id}`);
        }}
      />

      {/* Custom field picker bottom sheet */}
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
                      isSelected && { color: primary[500], fontWeight: "600" },
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
            <TouchableOpacity
              style={styles.multiSelectDoneBtn}
              onPress={() => closeFieldPicker()}
              activeOpacity={0.8}
            >
              <Text style={styles.multiSelectDoneText}>Done</Text>
            </TouchableOpacity>
          )}
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
  field: { marginBottom: 20, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: neutral[700] },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  required: { color: secondary[500] },
  input: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: neutral[800],
  },
  segmentedControl: { flexDirection: "row", gap: 10 },
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
  segmentText: { fontSize: 14, fontWeight: "500", color: neutral[500] },
  segmentTextActive: { color: primary[500], fontWeight: "600" },
  radiusRow: { flexDirection: "row", gap: 10, alignItems: "center" },
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
  radiusUnitButtonActive: { backgroundColor: primary[50] },
  radiusUnitText: { fontSize: 14, fontWeight: "500", color: neutral[500] },
  radiusUnitTextActive: { color: primary[500], fontWeight: "600" },
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
  addressInput: { flex: 1, fontSize: 14, padding: 0 },
  addressInputRowDisabled: {
    backgroundColor: background.subtle,
    borderColor: border.default,
  },
  addressLockedHint: { fontSize: 12, color: neutral[400], marginTop: 2 },
  addressValue: { color: neutral[800] },
  addressPlaceholder: { color: neutral[300] },
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
  dropdownPlaceholder: { fontSize: 14, color: neutral[300] },
  dropdownValue: { fontSize: 14, color: neutral[800] },
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
  imageThumbnailRow: { marginBottom: 4 },
  imageThumbnailWrap: { position: "relative", marginRight: 8 },
  imageThumbnail: { width: 80, height: 80, borderRadius: 8 },
  imageThumbnailRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
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
  certRecord: { gap: 8, marginBottom: 12 },
  certRecordHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  certNameInput: { flex: 1, marginBottom: 0 },
  certRemoveBtn: { padding: 4 },
  certPdfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  certPdfName: { flex: 1, fontSize: 12, color: neutral[600] },
  certPdfLink: { color: primary[500], textDecorationLine: "underline" },
  certUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  certUploadText: { fontSize: 12, color: neutral[400] },
  certAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  certAddText: { fontSize: 13, fontWeight: "600", color: primary[500] },
  saveError: {
    fontSize: 13,
    color: "#d32f2f",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: neutral[0] },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonActive: { backgroundColor: primary[400] },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: neutral[400] },
  saveButtonTextActive: { color: neutral[0] },
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
  bottomSheetOptionSelected: { backgroundColor: primary[50] },
  bottomSheetOptionText: { fontSize: 15, color: neutral[700] },
  multiSelectDoneBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: primary[400],
    alignItems: "center",
  },
  multiSelectDoneText: { fontSize: 15, fontWeight: "600", color: "#fff" },
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
  addressOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
});
