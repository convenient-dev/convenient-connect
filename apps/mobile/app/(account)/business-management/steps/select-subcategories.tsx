import { getBusinessForEdit, updateBusinessProfile } from "@/api/business";
import { getServiceCategories } from "@/api/services";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

const NUM_COLUMNS = 4;

interface Subcategory {
  id: number;
  name: string;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  iconUrl: string | null;
}

// Fields from the business edit response that the update endpoint requires
// to be resent alongside the new service ids.
interface BusinessEditData {
  business_id: number;
  business_name: string;
  business_address: string;
  about: string | null;
  country_id: number;
  state_id: number;
  city_id: number;
  zipcode: string | null;
  business_ein: string | null;
  service_sub_category_ids: number[];
}

interface ModalState {
  type: "success" | "error";
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm?: () => void;
}

function SubcategoryItem({
  item,
  selected,
  onPress,
}: {
  item: Subcategory;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cell, selected && styles.cellSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconWrapper, selected && styles.iconWrapperSelected]}
      >
        {item.iconUrl && (
          <ExpoImage
            source={{ uri: item.iconUrl }}
            style={styles.icon}
            contentFit="contain"
          />
        )}
      </View>
      <Text
        style={[styles.cellLabel, selected && styles.cellLabelSelected]}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function SelectSubcategoriesScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId: string;
    categorySlug: string;
    categoryName: string;
    flow?: string;
    businessId?: string;
  }>();
  // Editing an existing business's services: preselect its current
  // subcategories and save directly instead of continuing the create flow.
  const isEditMode = params.flow === "edit-business" && !!params.businessId;

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Subcategory[]>([]);
  const [business, setBusiness] = useState<BusinessEditData | null>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const showLoadError = useCallback(
    (message: string) => {
      setModal({
        type: "error",
        title: "Error",
        message,
        confirmLabel: "OK",
        onConfirm: () => router.back(),
      });
    },
    [router],
  );

  useEffect(() => {
    (async () => {
      try {
        if (!params.categoryId) return;
        const categories = await getServiceCategories();
        const category = categories.find(
          (cat) => cat.category_id === parseInt(params.categoryId!, 10),
        );

        if (!category) {
          showLoadError("Category not found");
          setLoading(false);
          return;
        }

        const list: Subcategory[] = category.sub_category_list.map((sub) => ({
          id: sub.sub_category_id,
          name: sub.sub_category_name,
          categoryId: category.category_id,
          categorySlug: params.categorySlug ?? "",
          categoryName: params.categoryName ?? "",
          iconUrl: sub.sub_category_logo,
        }));
        setSubcategories(list);

        if (isEditMode) {
          const data: BusinessEditData = await getBusinessForEdit(
            Number(params.businessId),
          );
          setBusiness(data);
          const currentIds = data.service_sub_category_ids ?? [];
          setSelected(list.filter((sub) => currentIds.includes(sub.id)));
        }
      } catch {
        showLoadError("Failed to load services");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    params.categoryId,
    params.categorySlug,
    params.categoryName,
    isEditMode,
    params.businessId,
    showLoadError,
  ]);

  const isSelected = (id: number) => selected.some((s) => s.id === id);

  function toggle(subcategory: Subcategory) {
    setSelected((prev) =>
      prev.some((s) => s.id === subcategory.id)
        ? prev.filter((s) => s.id !== subcategory.id)
        : [...prev, subcategory],
    );
  }

  async function saveServices() {
    if (!business || saving) return;
    setSaving(true);
    try {
      // The update endpoint requires the full business record, so resend the
      // existing fields with only the service ids changed. Documents are
      // omitted; the server keeps the ones already on file.
      await updateBusinessProfile(business.business_id, {
        businessName: business.business_name,
        businessAddress: business.business_address,
        about: business.about,
        countryId: business.country_id,
        stateId: business.state_id,
        cityId: business.city_id,
        zipcode: business.zipcode,
        businessEin: business.business_ein,
        serviceSubCategoryIds: selected.map((s) => s.id),
      });
      setModal({
        type: "success",
        title: "Success",
        message:
          "Your services have been updated. Your business will be reviewed again before it can accept new bookings.",
        confirmLabel: "Done",
        // The business detail screen refetches on focus.
        onConfirm: () =>
          router.dismissTo({
            pathname: "/business-management/[id]",
            params: { id: String(business.business_id) },
          }),
      });
    } catch (error: any) {
      setModal({
        type: "error",
        title: "Error",
        message: error?.message || "Failed to update services. Please try again.",
        confirmLabel: "OK",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleContinue() {
    if (isEditMode) {
      saveServices();
      return;
    }
    router.push({
      pathname: "/business-management/steps/documents",
      params: {
        ...params,
        serviceIds: selected.map((s) => s.id).join(","),
        categoryNames: params.categoryName,
      },
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title={`Select from ${params.categoryName}`} />

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
        <FlatList
          data={subcategories}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={[styles.grid, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SubcategoryItem
              item={item}
              selected={isSelected(item.id)}
              onPress={() => toggle(item)}
            />
          )}
        />
      )}

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Continue"
          variant="secondary"
          size="lg"
          disabled={
            selected.length === 0 || saving || (isEditMode && !business)
          }
          loading={saving}
          onPress={handleContinue}
        />
      </View>

      <ConfirmModal
        visible={modal !== null}
        type={modal?.type ?? "error"}
        title={modal?.title ?? ""}
        message={modal?.message ?? ""}
        confirmLabel={modal?.confirmLabel}
        onConfirm={() => {
          const fn = modal?.onConfirm;
          setModal(null);
          fn?.();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  subtitle: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    alignSelf: "center",
  },
  loader: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cell: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
    borderRadius: 10,
    margin: 2,
  },
  cellSelected: {
    backgroundColor: primary[50],
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: background.subtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapperSelected: {
    backgroundColor: primary[50],
  },
  icon: {
    width: 44,
    height: 44,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[600],
    textAlign: "center",
    lineHeight: 14,
  },
  cellLabelSelected: {
    color: primary[500],
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
});
