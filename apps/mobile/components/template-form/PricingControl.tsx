import { Colors } from "@/constants/theme";
import {
  PRICING_VALUE_KEYS,
  allowedPriceUnitCodes,
  buildEvaluationContext,
  filterPriceUnits,
  getFormat,
  profilePricingScopeState,
  resolveCurrency,
  selectedFulfillmentCodes,
  selectedPriceUnitCode,
  selectedPricingType,
  type FormTemplate,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FieldShell } from "./FieldShell";
import { OptionSheet } from "./OptionSheet";
import type { ControlProps } from "./controls";
import { formStyles as s } from "./styles";

const { neutral, primary } = Colors;

interface Props extends ControlProps {
  template: FormTemplate;
}

/**
 * The composite pricing block: pricing type, amount with currency, price unit,
 * Charge in USD toggle and profile pricing scope. Every allowed set comes from
 * the template and capability, never from the screen.
 */
export function PricingControl({ field, template, values, errors, required, setValue }: Props) {
  const [unitOpen, setUnitOpen] = useState(false);

  const pricingType = selectedPricingType(values);
  const ctx = buildEvaluationContext(template, values);
  const format = getFormat(
    template.provider_listing_capability,
    ctx.context.format as string | null,
  );
  const allowedCodes = format ? allowedPriceUnitCodes(format, pricingType) : null;
  const units = allowedCodes
    ? filterPriceUnits(field.price_units, allowedCodes)
    : field.price_units ?? [];
  const unitId = values[PRICING_VALUE_KEYS.priceUnitId];
  const selectedUnit = units.find((u) => String(u.value) === String(unitId));
  const unitCode = selectedPriceUnitCode(template, values);

  const { currency, showChargeInUsd } = resolveCurrency(template.currency_context, {
    fulfillmentCodes: selectedFulfillmentCodes(template, values),
    chargeInUsd: values[PRICING_VALUE_KEYS.chargeInUsd] === true,
  });
  const scopeState = profilePricingScopeState(format, pricingType, unitCode);
  const scopeContract = format?.profile_pricing_scope;

  const subFields =
    pricingType === "fixed_price"
      ? field.fixed_price_fields ?? {}
      : field.quote_required_fields ?? {};
  const amountVisible = pricingType === "fixed_price" || subFields.amount?.visible !== false;
  const amountRequired =
    pricingType === "fixed_price" ? subFields.amount?.required !== false : !!subFields.amount?.required;

  const err = (key: string) => errors[key];

  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text}>
      <View style={{ gap: 14 }}>
        {/* Pricing type */}
        <View style={{ gap: 6 }}>
          <View style={s.segmentedControl}>
            {(field.pricing_types ?? []).map((option) => {
              const active = pricingType === option.value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[s.segmentButton, active && s.segmentButtonActive]}
                  onPress={() => setValue(PRICING_VALUE_KEYS.pricingType, option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {err(PRICING_VALUE_KEYS.pricingType) ? (
            <Text style={s.inlineError}>{err(PRICING_VALUE_KEYS.pricingType)}</Text>
          ) : null}
        </View>

        {pricingType ? (
          <>
            {/* Price unit */}
            <View style={{ gap: 6 }}>
              <Text style={s.subLabel}>
                {subFields.price_unit_id?.label ?? "Price Unit"}
                <Text style={s.required}> *</Text>
              </Text>
              <TouchableOpacity
                style={[s.dropdown, err(PRICING_VALUE_KEYS.priceUnitId) ? s.inputError : null]}
                onPress={() => setUnitOpen(true)}
                activeOpacity={0.7}
                disabled={units.length === 0}
              >
                <Text style={selectedUnit ? s.dropdownValue : s.dropdownPlaceholder}>
                  {selectedUnit?.label ??
                    (units.length ? subFields.price_unit_id?.placeholder ?? "Select price unit" : "Select a format first")}
                </Text>
                <Feather name="chevron-down" size={18} color={neutral[400]} />
              </TouchableOpacity>
              {err(PRICING_VALUE_KEYS.priceUnitId) ? (
                <Text style={s.inlineError}>{err(PRICING_VALUE_KEYS.priceUnitId)}</Text>
              ) : null}
            </View>

            {/* Amount */}
            {amountVisible ? (
              <View style={{ gap: 6 }}>
                <Text style={s.subLabel}>
                  {subFields.amount?.label ?? field.base_price?.label ?? "Base Price"}
                  {amountRequired ? <Text style={s.required}> *</Text> : null}
                </Text>
                <View style={[s.amountRow, err(PRICING_VALUE_KEYS.amount) ? s.inputError : null]}>
                  <Text style={s.amountCurrency}>{currency}</Text>
                  <TextInput
                    style={s.amountInput}
                    placeholder={subFields.amount?.placeholder ?? field.base_price?.placeholder ?? "0.00"}
                    placeholderTextColor={neutral[300]}
                    keyboardType="decimal-pad"
                    value={values[PRICING_VALUE_KEYS.amount] === undefined ? "" : String(values[PRICING_VALUE_KEYS.amount])}
                    onChangeText={(text) =>
                      setValue(PRICING_VALUE_KEYS.amount, text.replace(/[^0-9.]/g, "") || undefined)
                    }
                  />
                  {selectedUnit ? <Text style={s.amountCurrency}>/ {selectedUnit.label.replace(/^per\s+/i, "")}</Text> : null}
                </View>
                {err(PRICING_VALUE_KEYS.amount) ? (
                  <Text style={s.inlineError}>{err(PRICING_VALUE_KEYS.amount)}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Charge in USD */}
            {showChargeInUsd ? (
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>{field.charge_in_usd?.label ?? "Charge in USD"}</Text>
                <Switch
                  value={values[PRICING_VALUE_KEYS.chargeInUsd] === true}
                  onValueChange={(on) => setValue(PRICING_VALUE_KEYS.chargeInUsd, on)}
                  trackColor={{ true: primary[300], false: neutral[200] }}
                  thumbColor={values[PRICING_VALUE_KEYS.chargeInUsd] === true ? primary[500] : neutral[0]}
                />
              </View>
            ) : null}

            {/* Profile pricing scope */}
            {scopeState.state !== "prohibited" && scopeContract ? (
              <View style={{ gap: 6 }}>
                <Text style={s.subLabel}>
                  {scopeContract.label ?? "Price Applies To"}
                  {scopeState.state === "required" ? <Text style={s.required}> *</Text> : null}
                </Text>
                <View style={s.segmentedControl}>
                  {(scopeContract.options ?? [])
                    .filter(
                      (o) =>
                        !scopeState.allowed_values?.length ||
                        scopeState.allowed_values.some((v) => String(v) === String(o.value)),
                    )
                    .map((option) => {
                      const active = values[PRICING_VALUE_KEYS.profilePricingScope] === option.value;
                      return (
                        <TouchableOpacity
                          key={String(option.value)}
                          style={[s.segmentButton, active && s.segmentButtonActive]}
                          onPress={() =>
                            setValue(PRICING_VALUE_KEYS.profilePricingScope, active ? undefined : option.value)
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
                {scopeContract.help_text ? <Text style={s.helpText}>{scopeContract.help_text}</Text> : null}
                {err(PRICING_VALUE_KEYS.profilePricingScope) ? (
                  <Text style={s.inlineError}>{err(PRICING_VALUE_KEYS.profilePricingScope)}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <OptionSheet
        visible={unitOpen}
        title={subFields.price_unit_id?.label ?? "Price Unit"}
        options={units.map((u) => ({ label: u.label, value: String(u.value) }))}
        selectedValue={selectedUnit ? String(selectedUnit.value) : null}
        onSelect={(v) => {
          const unit = units.find((u) => String(u.value) === v);
          setValue(PRICING_VALUE_KEYS.priceUnitId, unit?.value);
        }}
        onClose={() => setUnitOpen(false)}
      />
    </FieldShell>
  );
}
