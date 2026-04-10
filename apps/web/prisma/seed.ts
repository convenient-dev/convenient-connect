// prisma/seed.ts
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Alice+Smith" },
    create: {
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      password: "hashed_password_1",
      phoneNumber: "555-0101",
      address: "123 Main St, Springfield",
      accountType: "INDIVIDUAL",
      isVerified: true,
      avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Alice+Smith",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: { avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Bob+Jones" },
    create: {
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Jones",
      password: "hashed_password_2",
      phoneNumber: "555-0202",
      address: "456 Oak Ave, Shelbyville",
      accountType: "BUSINESS",
      businessName: "Bob's Widgets LLC",
      businessAddress: "789 Commerce Blvd, Shelbyville",
      isVerified: false,
      avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Bob+Jones",
    },
  });

  console.log({ alice, bob });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
