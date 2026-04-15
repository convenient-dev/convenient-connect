import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Map form values to Prisma enum values
const SERVICE_TYPE_MAP: Record<string, "inPerson" | "remote"> = {
  "in-person": "inPerson",
  remote: "remote",
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    userId,
    subcategoryId,
    serviceMode,
    businessAffiliationId,
    title,
    serviceType: rawServiceType,
    addressId,
    areaRadius,
    description,
    aboutYou,
    slogan,
    baseRate,
    baseRateUnit,
    customValues = [],
    addons = [],
  } = body;

  // ── Required field validation ──────────────────────────────────
  const missing = (
    [
      ["userId", userId],
      ["title", title],
      ["serviceType", rawServiceType],
      ["serviceMode", serviceMode],
      ["addressId", addressId],
      ["description", description],
      ["aboutYou", aboutYou],
      ["baseRate", baseRate],
      ["baseRateUnit", baseRateUnit],
    ] as [string, unknown][]
  )
    .filter(([, v]) => v == null || v === "")
    .map(([k]) => k);

  if (missing.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const serviceType = SERVICE_TYPE_MAP[rawServiceType];
  if (!serviceType) {
    return Response.json(
      { error: `Invalid serviceType: ${rawServiceType}` },
      { status: 400 },
    );
  }

  if (!["freelance", "business"].includes(serviceMode)) {
    return Response.json(
      { error: `Invalid serviceMode: ${serviceMode}` },
      { status: 400 },
    );
  }

  if (!["booking", "hour"].includes(baseRateUnit)) {
    return Response.json(
      { error: `Invalid baseRateUnit: ${baseRateUnit}` },
      { status: 400 },
    );
  }

  // ── Validate address belongs to user ──────────────────────────
  const address = await prisma.address.findFirst({
    where: { id: Number(addressId), userId: Number(userId) },
  });
  if (!address) {
    return Response.json(
      { error: "Address not found for this user" },
      { status: 400 },
    );
  }

  const parsedSubcategoryId = subcategoryId ? Number(subcategoryId) : null;

  // ── Validate addon templates belong to the subcategory ────────
  if (parsedSubcategoryId && addons.length > 0) {
    const templateIds: number[] = addons.map(
      (a: { templateId: number }) => a.templateId,
    );
    const valid = await prisma.subcategoryAddonTemplate.findMany({
      where: { id: { in: templateIds }, subcategoryId: parsedSubcategoryId },
      select: { id: true },
    });
    if (valid.length !== templateIds.length) {
      return Response.json(
        { error: "One or more addon templates do not belong to this subcategory" },
        { status: 400 },
      );
    }
  }

  // ── Validate custom field IDs belong to subcategory / category
  if (parsedSubcategoryId && customValues.length > 0) {
    const fieldIds: number[] = customValues.map(
      (v: { fieldId: number }) => v.fieldId,
    );
    const valid = await prisma.serviceCustomField.findMany({
      where: {
        id: { in: fieldIds },
        OR: [
          { subcategoryId: parsedSubcategoryId },
          {
            category: {
              subcategories: { some: { id: parsedSubcategoryId } },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (valid.length !== fieldIds.length) {
      return Response.json(
        { error: "One or more custom fields do not belong to this subcategory" },
        { status: 400 },
      );
    }
  }

  // ── Create service + related records in one transaction ───────
  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        userId: Number(userId),
        subcategoryId: parsedSubcategoryId ?? undefined,
        serviceMode,
        businessAffiliationId: businessAffiliationId
          ? Number(businessAffiliationId)
          : undefined,
        title,
        serviceType,
        addressId: Number(addressId),
        areaRadius: areaRadius != null ? Number(areaRadius) : undefined,
        description,
        aboutYou,
        slogan: slogan || undefined,
        baseRate: Number(baseRate),
        baseRateUnit,
        status: "pendingReview",
      },
    });

    // Create custom field values
    if (customValues.length > 0) {
      const fields = await tx.serviceCustomField.findMany({
        where: {
          id: { in: customValues.map((v: { fieldId: number }) => v.fieldId) },
        },
        select: { id: true, fieldType: true },
      });
      const fieldTypeMap = Object.fromEntries(fields.map((f) => [f.id, f.fieldType]));

      await tx.serviceCustomValue.createMany({
        data: customValues.map((v: { fieldId: number; value: string }) => {
          const fieldType = fieldTypeMap[v.fieldId];
          if (fieldType === "number") {
            return { serviceId: created.id, fieldId: v.fieldId, valueNumber: parseFloat(v.value) };
          }
          if (fieldType === "boolean") {
            return { serviceId: created.id, fieldId: v.fieldId, valueBoolean: v.value === "true" };
          }
          if (fieldType === "multiSelect") {
            return { serviceId: created.id, fieldId: v.fieldId, valueJson: JSON.parse(v.value) };
          }
          return { serviceId: created.id, fieldId: v.fieldId, valueText: v.value };
        }),
      });
    }

    // Create addons
    if (addons.length > 0) {
      await tx.serviceAddon.createMany({
        data: addons.map((a: { templateId: number; price: number }) => ({
          serviceId: created.id,
          templateId: Number(a.templateId),
          price: Number(a.price),
        })),
      });
    }

    return tx.service.findUnique({
      where: { id: created.id },
      include: {
        subcategory: { select: { name: true, category: { select: { name: true } } } },
        addons: { include: { template: true } },
        customValues: { include: { field: true } },
        address: true,
      },
    });
  });

  return Response.json(service, { status: 201 });
}
