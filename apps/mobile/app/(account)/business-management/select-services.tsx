import { getCategories, getSubcategories } from "@/api/legacy";
import { BackButton } from "@/components/BackButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  categoryNameToSlug,
  getSubcategoryIcon,
} from "@/components/SubcategoryIcon";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

interface Service {
  id: number;
  name: string;
  categorySlug: string;
  categoryName: string;
}

interface CategorySection {
  id: number;
  name: string;
  slug: string;
  services: Service[];
}

function ServiceTile({
  service,
  selected,
  onPress,
}: {
  service: Service;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <ExpoImage
        source={getSubcategoryIcon(service.categorySlug, service.name)}
        style={styles.tileIcon}
        contentFit="contain"
      />
      <Text
        style={[styles.tileLabel, selected && styles.tileLabelSelected]}
        numberOfLines={1}
      >
        {service.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function SelectServicesScreen() {
  const router = useRouter();
  // Business details entered on the previous screen, forwarded through
  // each step of the create-business flow.
  const params = useLocalSearchParams();

  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const categories: { id: number; name: string }[] =
          await getCategories();
        const loaded = await Promise.all(
          categories.map(async (category) => {
            const slug = categoryNameToSlug(category.name);
            const subcategories: { id: number; name: string }[] =
              await getSubcategories(category.id);
            return {
              id: category.id,
              name: category.name,
              slug,
              services: subcategories.map((s) => ({
                id: s.id,
                name: s.name,
                categorySlug: slug,
                categoryName: category.name,
              })),
            };
          }),
        );
        setSections(loaded);
      } catch {
        Alert.alert("Error", "Failed to load services");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sections;
    return sections
      .map((section) => ({
        ...section,
        services: section.services.filter((s) =>
          s.name.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (section) =>
          section.services.length > 0 ||
          section.name.toLowerCase().includes(query),
      );
  }, [sections, search]);

  const isSelected = (id: number) => selected.some((s) => s.id === id);

  function toggle(service: Service) {
    setSelected((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service],
    );
  }

  function handleContinue() {
    router.push({
      pathname: "/business-management/verify-business",
      params: {
        ...params,
        serviceIds: selected.map((s) => s.id).join(","),
        categoryNames: [...new Set(selected.map((s) => s.categoryName))].join(
          ",",
        ),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.subtitle}>
        Please select the services you are offering
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <View style={styles.body}>
          {/* Selected services tray */}
          {selected.length > 0 && (
            <View style={styles.tray}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trayContent}
              >
                {selected.map((service) => (
                  <View key={service.id} style={styles.trayItem}>
                    <ExpoImage
                      source={getSubcategoryIcon(
                        service.categorySlug,
                        service.name,
                      )}
                      style={styles.trayIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.trayLabel} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.trayRemove}
                      hitSlop={8}
                      onPress={() => toggle(service)}
                    >
                      <MaterialIcons
                        name="cancel"
                        size={22}
                        color={secondary[500]}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search services"
              placeholderTextColor={neutral[400]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <MaterialIcons name="search" size={24} color={neutral[800]} />
          </View>

          {/* Category sections */}
          <View style={styles.listCard}>
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {visibleSections.map((section) => (
                <View key={section.id} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <CategoryIcon name={section.name} size={24} />
                    <Text style={styles.sectionTitle}>{section.name}</Text>
                  </View>
                  <View style={styles.grid}>
                    {section.services.map((service) => (
                      <ServiceTile
                        key={service.id}
                        service={service}
                        selected={isSelected(service.id)}
                        onPress={() => toggle(service)}
                      />
                    ))}
                  </View>
                </View>
              ))}
              {visibleSections.length === 0 && (
                <Text style={styles.emptyText}>
                  No services match your search
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selected.length === 0 && styles.continueDisabled,
          ]}
          activeOpacity={0.85}
          disabled={selected.length === 0}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const TILE_GAP = 10;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { width: 40 },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  loader: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
  tray: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 16,
  },
  trayContent: {
    padding: 12,
    gap: 12,
  },
  trayItem: {
    width: 84,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: neutral[50],
  },
  trayIcon: {
    width: 44,
    height: 44,
  },
  trayLabel: {
    fontSize: 13,
    color: text.primary,
    letterSpacing: -0.408,
  },
  trayRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: neutral[0],
    borderRadius: 11,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  listCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 16,
    overflow: "hidden",
  },
  listContent: {
    padding: 14,
    gap: 18,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TILE_GAP,
  },
  tile: {
    // 4 columns: 3 gaps of TILE_GAP leave ~22.9% per tile
    flexBasis: "22.9%",
    flexGrow: 1,
    maxWidth: "23%",
    aspectRatio: 0.92,
    borderRadius: 14,
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  tileSelected: {
    backgroundColor: primary[400],
  },
  tileIcon: {
    width: 44,
    height: 44,
  },
  tileLabel: {
    fontSize: 13,
    color: text.primary,
    letterSpacing: -0.408,
  },
  tileLabelSelected: {
    color: neutral[0],
  },
  emptyText: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    paddingVertical: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  continueButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  continueDisabled: {
    opacity: 0.6,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
