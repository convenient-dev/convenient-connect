import { getBusinessServices } from "@/api/business";
import { getServiceFormTemplate } from "@/api/service-management";
import { OptionSheet, type SheetOption } from "@/components/template-form/OptionSheet";
import { Colors } from "@/constants/theme";
import type { PriceUnitOption } from "@/services/template/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { primary, neutral, text } = Colors;

export interface GuidelineService {
  id: number;
  name: string;
}

interface ServiceRule {
  price: string;
  /** `price_unit_id` from the template's `pricing.price_units`. */
  unitId: number | null;
}

/**
 * Owner-set rules that apply to every member of a business: whether members
 * inherit the owner's schedule, and a price and billing unit per assigned
 * service.
 *
 * Billing units come from `GET /service-form-template` for each service's
 * subcategory, which is the submit allow-list for `price_unit_id`. The
 * contract has no guidelines endpoint yet, so the entered values live in
 * component state for the session and are not persisted.
 */
export function BusinessGuidelinesForm({
  businessId,
  services,
  disabled = false,
}: {
  businessId: number;
  services: GuidelineService[];
  disabled?: boolean;
}) {
  const [rules, setRules] = useState<Record<number, ServiceRule>>({});
  const [unitsByService, setUnitsByService] = useState<
    Record<number, PriceUnitOption[]>
  >({});
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [applySchedule, setApplySchedule] = useState(false);
  const [unitPickerFor, setUnitPickerFor] = useState<number | null>(null);

  const serviceIds = services.map((s) => s.id).join(",");

  // The template needs the parent category id, which the business payload
  // does not carry, so resolve it from the business's assigned services
  // first and then load one template per subcategory.
  useEffect(() => {
    if (!businessId || services.length === 0) {
      setUnitsLoading(false);
      return;
    }
    let cancelled = false;
    setUnitsLoading(true);

    (async () => {
      const assigned = await getBusinessServices(businessId).catch(() => []);
      const categoryBySubCategory = new Map<number, number>();
      for (const item of assigned) {
        const categoryId = item.category?.category_id;
        if (item.sub_category_id != null && categoryId != null) {
          categoryBySubCategory.set(item.sub_category_id, categoryId);
        }
      }

      const entries = await Promise.all(
        services.map(async (service) => {
          const categoryId = categoryBySubCategory.get(service.id);
          if (categoryId == null) return [service.id, []] as const;
          try {
            const template = await getServiceFormTemplate({
              categoryId,
              subcategoryId: service.id,
              providerType: "business",
              businessId,
            });
            const pricingField = template.fields?.find(
              (f) => f.field_type === "pricing",
            );
            const units: PriceUnitOption[] = (
              pricingField?.price_units ?? []
            ).map((u) => ({ label: u.label, value: u.value, code: u.code }));
            return [service.id, units] as const;
          } catch {
            return [service.id, []] as const;
          }
        }),
      );

      if (cancelled) return;
      setUnitsByService(Object.fromEntries(entries));
      setUnitsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // serviceIds captures the services the effect depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, serviceIds]);

  const unitsFor = (id: number): PriceUnitOption[] => unitsByService[id] ?? [];

  const ruleFor = (id: number): ServiceRule =>
    rules[id] ?? { price: "", unitId: unitsFor(id)[0]?.value ?? null };

  function updateRule(id: number, patch: Partial<ServiceRule>) {
    setRules((prev) => ({ ...prev, [id]: { ...ruleFor(id), ...patch } }));
  }

  function handlePriceChange(id: number, raw: string) {
    // Digits and a single decimal point, at most two decimals.
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const [whole, ...rest] = cleaned.split(".");
    const decimals = rest.join("").slice(0, 2);
    updateRule(id, {
      price: rest.length > 0 ? `${whole}.${decimals}` : whole,
    });
  }

  const pickerUnits = unitPickerFor !== null ? unitsFor(unitPickerFor) : [];
  const pickerOptions: SheetOption[] = pickerUnits.map((u) => ({
    label: u.label,
    value: String(u.value),
  }));
  const pickerSelected =
    unitPickerFor !== null ? ruleFor(unitPickerFor).unitId : null;

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>These rules apply to all members.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduling</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Apply with my Schedule</Text>
          <Switch
            value={applySchedule}
            onValueChange={setApplySchedule}
            disabled={disabled}
            trackColor={{ false: neutral[200], true: primary[400] }}
            thumbColor={neutral[0]}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Pricing</Text>
        {services.length === 0 ? (
          <Text style={styles.emptyText}>
            Add services to this business to set member pricing.
          </Text>
        ) : (
          services.map((service) => {
            const rule = ruleFor(service.id);
            const units = unitsFor(service.id);
            const selectedUnit = units.find((u) => u.value === rule.unitId);
            const unitDisabled = disabled || unitsLoading || units.length === 0;
            return (
              <View key={service.id} style={styles.serviceBlock}>
                <Text style={styles.serviceLabel}>{service.name}</Text>
                <View style={styles.ruleRow}>
                  <View style={styles.priceField}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={rule.price}
                      onChangeText={(value) =>
                        handlePriceChange(service.id, value)
                      }
                      placeholder="0.00"
                      placeholderTextColor={neutral[300]}
                      keyboardType="decimal-pad"
                      editable={!disabled}
                      accessibilityLabel={`${service.name} price`}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.unitField, unitDisabled && styles.unitFieldDisabled]}
                    onPress={() => setUnitPickerFor(service.id)}
                    disabled={unitDisabled}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${service.name} price unit`}
                  >
                    {unitsLoading ? (
                      <ActivityIndicator size="small" color={neutral[400]} />
                    ) : (
                      <Text
                        style={[
                          styles.unitText,
                          !selectedUnit && styles.unitTextPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedUnit?.label ??
                          (units.length === 0 ? "No units" : "Select unit")}
                      </Text>
                    )}
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={20}
                      color={neutral[500]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      <OptionSheet
        visible={unitPickerFor !== null}
        title="Price Unit"
        options={pickerOptions}
        selectedValue={pickerSelected !== null ? String(pickerSelected) : null}
        onSelect={(value) => {
          if (unitPickerFor !== null) {
            updateRule(unitPickerFor, { unitId: Number(value) });
          }
          setUnitPickerFor(null);
        }}
        onClose={() => setUnitPickerFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  intro: {
    fontSize: 15,
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  serviceBlock: {
    gap: 8,
  },
  serviceLabel: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
  ruleRow: {
    flexDirection: "row",
    gap: 12,
  },
  priceField: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  currency: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
    paddingVertical: 0,
  },
  unitField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 4,
  },
  unitFieldDisabled: {
    opacity: 0.6,
  },
  unitText: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  unitTextPlaceholder: {
    color: neutral[400],
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
});
