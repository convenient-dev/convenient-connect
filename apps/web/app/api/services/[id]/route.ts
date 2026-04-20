import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const SERVICE_INCLUDE = {
  images: true,
  certifications: true,
  addons: { include: { template: true } },
  customValues: { include: { field: true } },
  subcategory: {
    include: {
      category: {
        include: { customFields: { orderBy: { displayOrder: "asc" } } },
      },
      customFields: { orderBy: { displayOrder: "asc" } },
      addonTemplates: { orderBy: { displayOrder: "asc" } },
    },
  },
  address: true,
  business: { include: { business: true } },
} as const;

const SERVICE_TYPE_MAP: Record<string, "inPerson" | "remote"> = {
  "in-person": "inPerson",
  remote: "remote",
};

const VALID_STATUSES = ["active", "inactive", "pendingReview"] as const;
type ServiceStatus = (typeof VALID_STATUSES)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id: Number(id) },
    include: SERVICE_INCLUDE,
  });

  if (!service) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  return Response.json({ ...service, searchActive: service.status === "active" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const serviceId = Number(id);

  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, userId: true, subcategoryId: true, status: true },
  });
  if (!existing) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    status: rawStatus,
    searchActive,
    title,
    serviceType: rawServiceType,
    addressId,
    areaRadius,
    description,
    aboutYou,
    slogan,
    baseRate,
    baseRateUnit,
    customValues,
    addons,
  } = body;

  // ── Resolve status: explicit status takes precedence over searchActive ──
  let status = rawStatus;
  if (status === undefined && searchActive !== undefined) {
    // searchActive toggle only applies when not pendingReview
    if (existing.status !== "pendingReview") {
      status = searchActive ? "active" : "inactive";
    }
  }

  // ── Enum validation ────────────────────────────────────────────
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return Response.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  let serviceType: "inPerson" | "remote" | undefined;
  if (rawServiceType !== undefined) {
    serviceType = SERVICE_TYPE_MAP[rawServiceType];
    if (!serviceType) {
      return Response.json(
        { error: `Invalid serviceType: ${rawServiceType}` },
        { status: 400 },
      );
    }
  }

  if (baseRateUnit !== undefined && !["booking", "hour"].includes(baseRateUnit)) {
    return Response.json(
      { error: `Invalid baseRateUnit: ${baseRateUnit}` },
      { status: 400 },
    );
  }

  // ── Validate address belongs to service owner ──────────────────
  if (addressId !== undefined) {
    const address = await prisma.address.findFirst({
      where: { id: Number(addressId), userId: existing.userId },
    });
    if (!address) {
      return Response.json(
        { error: "Address not found for this user" },
        { status: 400 },
      );
    }
  }

  const subcategoryId = existing.subcategoryId;

  // ── Validate addon templates belong to subcategory ────────────
  if (addons !== undefined && addons.length > 0 && subcategoryId) {
    const templateIds: number[] = addons.map(
      (a: { templateId: number }) => a.templateId,
    );
    const valid = await prisma.subcategoryAddonTemplate.findMany({
      where: { id: { in: templateIds }, subcategoryId },
      select: { id: true },
    });
    if (valid.length !== templateIds.length) {
      return Response.json(
        { error: "One or more addon templates do not belong to this subcategory" },
        { status: 400 },
      );
    }
  }

  // ── Validate custom field IDs ──────────────────────────────────
  if (customValues !== undefined && customValues.length > 0 && subcategoryId) {
    const fieldIds: number[] = customValues.map(
      (v: { fieldId: number }) => v.fieldId,
    );
    const valid = await prisma.serviceCustomField.findMany({
      where: {
        id: { in: fieldIds },
        OR: [
          { subcategoryId },
          { category: { subcategories: { some: { id: subcategoryId } } } },
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

  // ── Build scalar update payload ────────────────────────────────
  const scalarData: Record<string, unknown> = {};
  if (status !== undefined)      scalarData.status      = status as ServiceStatus;
  if (title !== undefined)       scalarData.title       = title;
  if (serviceType !== undefined) scalarData.serviceType = serviceType;
  if (addressId !== undefined)   scalarData.addressId   = Number(addressId);
  if (description !== undefined) scalarData.description = description;
  if (aboutYou !== undefined)    scalarData.aboutYou    = aboutYou;
  if (slogan !== undefined)      scalarData.slogan      = slogan || null;
  if (baseRate !== undefined)    scalarData.baseRate    = Number(baseRate);
  if (baseRateUnit !== undefined) scalarData.baseRateUnit = baseRateUnit;
  if (areaRadius !== undefined)
    scalarData.areaRadius = areaRadius != null ? Number(areaRadius) : null;

  // ── Transaction: update scalars + replace relations ────────────
  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(scalarData).length > 0) {
      await tx.service.update({ where: { id: serviceId }, data: scalarData });
    }

    if (customValues !== undefined) {
      await tx.serviceCustomValue.deleteMany({ where: { serviceId } });
      if (customValues.length > 0) {
        const fields = await tx.serviceCustomField.findMany({
          where: { id: { in: customValues.map((v: { fieldId: number }) => v.fieldId) } },
          select: { id: true, fieldType: true },
        });
        const fieldTypeMap = Object.fromEntries(
          fields.map((f) => [f.id, f.fieldType]),
        );
        await tx.serviceCustomValue.createMany({
          data: customValues.map((v: { fieldId: number; value: string }) => {
            const fieldType = fieldTypeMap[v.fieldId];
            if (fieldType === "number")
              return { serviceId, fieldId: v.fieldId, valueNumber: parseFloat(v.value) };
            if (fieldType === "boolean")
              return { serviceId, fieldId: v.fieldId, valueBoolean: v.value === "true" };
            if (fieldType === "multiSelect")
              return { serviceId, fieldId: v.fieldId, valueJson: JSON.parse(v.value) };
            return { serviceId, fieldId: v.fieldId, valueText: v.value };
          }),
        });
      }
    }

    if (addons !== undefined) {
      await tx.serviceAddon.deleteMany({ where: { serviceId } });
      if (addons.length > 0) {
        await tx.serviceAddon.createMany({
          data: addons.map((a: { templateId: number; price: number }) => ({
            serviceId,
            templateId: Number(a.templateId),
            price: Number(a.price),
          })),
        });
      }
    }

    return tx.service.findUnique({
      where: { id: serviceId },
      include: SERVICE_INCLUDE,
    });
  });

  return Response.json({ ...updated, searchActive: updated?.status === "active" });
}
