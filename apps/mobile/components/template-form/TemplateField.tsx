import type { Address } from "@/api/address";
import type { FormTemplate, FormValues, TemplateField as Field } from "@/services/template";
import React from "react";
import { PricingControl } from "./PricingControl";
import {
  AddressControl,
  CertificateBundleControl,
  FileUploadControl,
  MultiSelectControl,
  NumberControl,
  SingleSelectControl,
  TextControl,
  YesNoControl,
} from "./controls";

interface Props {
  field: Field;
  template: FormTemplate;
  values: FormValues;
  errors: Record<string, string>;
  required: boolean;
  setValue: (key: string, value: unknown) => void;
  defaultAddress?: Address | null;
  onAddAddress?: () => void;
}

/** Renders one template field by its `field_type` / `submit_as` type. */
export function TemplateField(props: Props) {
  const { field, template, defaultAddress, onAddAddress, ...control } = props;
  const base = { field, ...control };

  if (field.submit_as?.type === "display_only" || field.field_type === "address") {
    return (
      <AddressControl {...base} defaultAddress={defaultAddress} onAddAddress={onAddAddress ?? (() => {})} />
    );
  }
  if (field.submit_as?.type === "certificate_bundle") {
    return <CertificateBundleControl {...base} />;
  }

  switch (field.field_type) {
    case "text":
    case "textarea":
      return <TextControl {...base} />;
    case "number":
      return <NumberControl {...base} />;
    case "single_select":
      return <SingleSelectControl {...base} />;
    case "multi_select":
      return <MultiSelectControl {...base} />;
    case "yes_no":
      return <YesNoControl {...base} />;
    case "file_upload":
      return <FileUploadControl {...base} />;
    case "pricing":
      return <PricingControl {...base} template={template} />;
    default:
      return null;
  }
}
