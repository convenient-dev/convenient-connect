import { Colors } from "@/constants/theme";
import { StyleSheet } from "react-native";

const { primary, secondary, neutral, border, background, status, overlay } = Colors;

/** Shared styles for template-driven form controls. */
export const formStyles = StyleSheet.create({
  field: {
    marginBottom: 20,
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[700],
  },
  required: {
    color: secondary[500],
  },
  helpText: {
    fontSize: 12,
    color: neutral[400],
    lineHeight: 18,
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
  inputError: {
    borderColor: status.error,
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
    minHeight: 110,
  },
  inlineError: {
    fontSize: 12,
    color: status.error,
    marginTop: 2,
  },
  // Segmented (single choice among few options)
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  segmentButton: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
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
    textAlign: "center",
  },
  segmentTextActive: {
    color: primary[500],
    fontWeight: "600",
  },
  // Checkbox rows (multi choice)
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: background.card,
  },
  checkRowActive: {
    borderColor: primary[400],
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
  },
  checkboxChecked: {
    backgroundColor: primary[400],
    borderColor: primary[400],
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: neutral[700],
    lineHeight: 20,
  },
  // Number with unit
  unitRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  unitInput: {
    flex: 1,
  },
  unitGroup: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    overflow: "hidden",
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  unitButtonActive: {
    backgroundColor: primary[50],
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
  },
  unitTextActive: {
    color: primary[500],
    fontWeight: "600",
  },
  // Dropdown trigger
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
  // Files
  fileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  thumbWrap: {
    position: "relative",
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  docThumb: {
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
  docThumbName: {
    fontSize: 9,
    color: neutral[500],
    textAlign: "center",
  },
  thumbRemove: {
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
  // Pricing
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 6,
  },
  amountCurrency: {
    fontSize: 14,
    color: neutral[600],
    fontWeight: "500",
  },
  amountInput: {
    flex: 1,
    fontSize: 14,
    color: neutral[800],
    padding: 0,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 14,
    color: neutral[700],
    flex: 1,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral[600],
  },
  // Address (display only)
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: background.subtle,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: neutral[700],
  },
  addressMissing: {
    flex: 1,
    fontSize: 14,
    color: neutral[400],
    fontStyle: "italic",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: primary[500],
  },
});
