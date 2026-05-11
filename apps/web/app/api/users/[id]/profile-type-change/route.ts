import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

interface ProfileTypeChangeBody {
  businessName?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  registrationDoc?: string;
  governmentId?: string;
  ein?: string;
}

// Submit a profile type change request from individual to business.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  const body = (await req.json().catch(() => ({}))) as ProfileTypeChangeBody;
  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  const ein = typeof body.ein === "string" ? body.ein.trim() : "";
  const registerDoc =
    typeof body.registrationDoc === "string" && body.registrationDoc
      ? body.registrationDoc
      : null;
  const ownerIdDoc =
    typeof body.governmentId === "string" && body.governmentId
      ? body.governmentId
      : null;

  if (!businessName) {
    return Response.json(
      { error: "Business name is required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileTypeStatus: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.profileTypeStatus === "pending") {
    return Response.json(
      { error: "A profile type change is already under review" },
      { status: 409 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { profileTypeStatus: "pending" },
      select: { id: true, accountType: true, profileTypeStatus: true },
    }),
    prisma.business.upsert({
      where: { ownerId: userId },
      update: {
        name: businessName,
        registerDoc,
        ownerIdDoc,
        ein: ein || null,
      },
      create: {
        name: businessName,
        ownerId: userId,
        registerDoc,
        ownerIdDoc,
        ein: ein || null,
      },
    }),
  ]);

  return Response.json(updated, { status: 201 });
}
