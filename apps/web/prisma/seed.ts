// prisma/seed.ts
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed Users
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {
      avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Alice+Smith",
    },
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
    update: {
      avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Bob+Jones",
    },
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

  const CATEGORIES = [
    { id: 1,  name: "Automotive"  },
    { id: 2,  name: "Beauty"      },
    { id: 3,  name: "Caregiving"  },
    { id: 4,  name: "Culinary"    },
    { id: 5,  name: "Delivery"    },
    { id: 6,  name: "Education"   },
    { id: 7,  name: "Events"      },
    { id: 8,  name: "Fitness"     },
    { id: 9,  name: "Maintenance" },
    { id: 10, name: "IT"          },
    { id: 11, name: "Media"       },
    { id: 12, name: "Music"       },
    { id: 13, name: "Misc."       },
    { id: 14, name: "Personal"    },
    { id: 15, name: "Pet Care"    },
    { id: 16, name: "Sanitation"  },
  ];

  const categories = await Promise.all(
    CATEGORIES.map(({ id, name }) =>
      prisma.category.upsert({
        where: { id },
        update: { name },
        create: { id, name },
      }),
    ),
  );

  console.log(categories);
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
