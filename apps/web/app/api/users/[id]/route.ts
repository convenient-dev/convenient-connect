import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

// Get user details by ID, including their addresses
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { addresses: { include: { address: true } } },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    ...user,
    address: user.addresses.map((ua) => ({
      id: ua.address.id,
      userId: ua.userId,
      address: ua.address.address,
      latitude: ua.address.latitude,
      longitude: ua.address.longitude,
      isDefault: ua.isDefault,
    })),
  });
}

// Update user information
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    aboutMe?: string | null;
    isBackgroundCheck?: boolean;
  } = {};

  // update first and last name(require re-verification)
  const isUpdatingName = "firstName" in body || "lastName" in body;

  if (isUpdatingName) {
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";

    if (!firstName || !lastName) {
      return Response.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    data.firstName = firstName;
    data.lastName = lastName;

    // check user verification status
    const current = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { isBackgroundCheck: true },
    });
    if (!current) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    if (current.isBackgroundCheck) {
      data.isBackgroundCheck = false;
    }
  }

  // update phone number
  if ("phoneNumber" in body) {
    const phoneNumber =
      typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const digitCount = phoneNumber.replace(/\D/g, "").length;
    if (digitCount < 7 || digitCount > 15) {
      return Response.json(
        { error: "Please enter a valid phone number" },
        { status: 400 },
      );
    }
    data.phoneNumber = phoneNumber;
  }

  // update email
  if ("email" in body) {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }
    data.email = email;
  }

  // update about me
  if ("aboutMe" in body) {
    data.aboutMe = typeof body.aboutMe === "string" ? body.aboutMe : null;
  }

  if (Object.keys(data).length === 0) {
    return Response.json(
      { error: "No supported fields to update" },
      { status: 400 },
    );
  }

  // Update the user record in db
  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        aboutMe: true,
        isBackgroundCheck: true,
      },
    });
    return Response.json(user);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return Response.json(
        { error: "This email is already in use" },
        { status: 409 },
      );
    }
    throw err;
  }
}
