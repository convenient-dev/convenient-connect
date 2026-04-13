// prisma/seed.ts
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed Address
  const ADDRESS = [
    { id: 1, userId: 1, address: "2833 Happy Hollow Road, Asheboro, NC 27203", latitude: "35.60771465128029", longitude: "-79.80952166023332", isDefault: true},
    { id: 2, userId: 1, address: "2333 Thrash Trail, Longview, TX 75604", latitude: "32.51530005659963", longitude: "-94.7594809584593", isDefault: false},
    { id: 3, userId: 2, address: "165 Emerald Ln, Reynoldsville, PA 15851", latitude: "40.99582362954543", longitude: "-78.86993881775736", isDefault: true},];


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
      accountType: "BUSINESS",
      isVerified: false,
      avatarUrl: "https://api.dicebear.com/9.x/initials/png?seed=Bob+Jones",
    },
  });

  const hiddenGemPetLodge = await prisma.business.upsert({
    where: { ownerId: bob.id },
    update: { name: "Hidden Gem Pet Lodge", address: "789 Commerce Blvd, Shelbyville" },
    create: { name: "Hidden Gem Pet Lodge", address: "789 Commerce Blvd, Shelbyville", ownerId: bob.id },
  });

  // Alice (INDIVIDUAL) affiliated with Bob's business
  await prisma.businessAffiliation.upsert({
    where: { userId_businessId: { userId: alice.id, businessId: hiddenGemPetLodge.id } },
    update: {},
    create: { userId: alice.id, businessId: hiddenGemPetLodge.id },
  });

const addresses = await Promise.all(
  ADDRESS.map(({ id, userId, address, latitude, longitude, isDefault }) =>
    prisma.address.upsert({
      where: { id },
      update: { userId, address, latitude, longitude, isDefault },
      create: { id, userId, address, latitude, longitude, isDefault },
    }),
  ),
);
  console.log({ alice, bob });

  const CATEGORIES = [
    { id: 1, name: "Automotive" },
    { id: 2, name: "Beauty" },
    { id: 3, name: "Caregiving" },
    { id: 4, name: "Culinary" },
    { id: 5, name: "Delivery" },
    { id: 6, name: "Education" },
    { id: 7, name: "Events" },
    { id: 8, name: "Fitness" },
    { id: 9, name: "Maintenance" },
    { id: 10, name: "IT" },
    { id: 11, name: "Media" },
    { id: 12, name: "Music" },
    { id: 13, name: "Misc." },
    { id: 14, name: "Personal" },
    { id: 15, name: "Pet Care" },
    { id: 16, name: "Sanitation" },
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

  // Subcategory id: [categoryId, name]
  const SUBCATEGORIES: { id: number; categoryId: number; name: string }[] = [
    // Automotive (1)
    { id: 1, categoryId: 1, name: "Customs" },
    { id: 2, categoryId: 1, name: "Detailing" },
    { id: 3, categoryId: 1, name: "Mechanic" },
    { id: 4, categoryId: 1, name: "Roadside" },
    { id: 5, categoryId: 1, name: "Servicing" },
    { id: 6, categoryId: 1, name: "Tires" },
    // Beauty (2)
    { id: 7, categoryId: 2, name: "Barbering" },
    { id: 8, categoryId: 2, name: "Cosmetic" },
    { id: 9, categoryId: 2, name: "Lash Tech" },
    { id: 10, categoryId: 2, name: "Makeup" },
    { id: 11, categoryId: 2, name: "Nail" },
    { id: 12, categoryId: 2, name: "Skin Art" },
    { id: 13, categoryId: 2, name: "Skincare" },
    { id: 14, categoryId: 2, name: "Stylist" },
    // Caregiving (3)
    { id: 15, categoryId: 3, name: "Babysitting" },
    { id: 16, categoryId: 3, name: "Daycare" },
    { id: 17, categoryId: 3, name: "Disability" },
    { id: 18, categoryId: 3, name: "Medical" },
    { id: 19, categoryId: 3, name: "Seniors" },
    { id: 20, categoryId: 3, name: "Tutoring" },
    // Culinary (4)
    { id: 21, categoryId: 4, name: "Baking" },
    { id: 22, categoryId: 4, name: "Bartenders" },
    { id: 23, categoryId: 4, name: "Catering" },
    { id: 24, categoryId: 4, name: "Chef" },
    { id: 25, categoryId: 4, name: "Classes" },
    { id: 26, categoryId: 4, name: "Meal Prep" },
    // Delivery (5)
    { id: 27, categoryId: 5, name: "Courier" },
    { id: 28, categoryId: 5, name: "Errands" },
    { id: 29, categoryId: 5, name: "Grocery" },
    { id: 30, categoryId: 5, name: "Movers" },
    // Education (6)
    { id: 31, categoryId: 6, name: "Careers" },
    { id: 32, categoryId: 6, name: "Consulting" },
    { id: 33, categoryId: 6, name: "Language" },
    { id: 34, categoryId: 6, name: "Skill-Based" },
    { id: 35, categoryId: 6, name: "Test Prep" },
    { id: 36, categoryId: 6, name: "Tutoring" },
    // Events (7)
    { id: 37, categoryId: 7, name: "Catering" },
    { id: 38, categoryId: 7, name: "Decorating" },
    { id: 39, categoryId: 7, name: "Hosting" },
    { id: 40, categoryId: 7, name: "Live Music" },
    { id: 41, categoryId: 7, name: "Media" },
    { id: 42, categoryId: 7, name: "Mobility" },
    { id: 43, categoryId: 7, name: "Planning" },
    { id: 44, categoryId: 7, name: "Production" },
    { id: 45, categoryId: 7, name: "Rentals" },
    // Fitness (8)
    { id: 46, categoryId: 8, name: "Boxing" },
    { id: 47, categoryId: 8, name: "Coaching" },
    { id: 48, categoryId: 8, name: "CrossFit" },
    { id: 49, categoryId: 8, name: "Dance" },
    { id: 50, categoryId: 8, name: "Trainers" },
    { id: 51, categoryId: 8, name: "Yoga & Pilates" },
    // Maintenance (9)
    { id: 52, categoryId: 9, name: "Appliances" },
    { id: 53, categoryId: 9, name: "Carpenter" },
    { id: 54, categoryId: 9, name: "Electrician" },
    { id: 55, categoryId: 9, name: "Gardening" },
    { id: 56, categoryId: 9, name: "HVAC" },
    { id: 57, categoryId: 9, name: "Painter" },
    { id: 58, categoryId: 9, name: "Paving" },
    { id: 59, categoryId: 9, name: "Pest Control" },
    { id: 60, categoryId: 9, name: "Plumber" },
    { id: 61, categoryId: 9, name: "Roofing" },
    // IT (10)
    { id: 62, categoryId: 10, name: "Data Entry" },
    { id: 63, categoryId: 10, name: "IT Support" },
    { id: 64, categoryId: 10, name: "Mobile Dev" },
    { id: 65, categoryId: 10, name: "Security" },
    { id: 66, categoryId: 10, name: "SEO" },
    { id: 67, categoryId: 10, name: "UI/UX" },
    { id: 68, categoryId: 10, name: "Website Dev" },
    // Media (11)
    { id: 69, categoryId: 11, name: "Editing" },
    { id: 70, categoryId: 11, name: "Graphics" },
    { id: 71, categoryId: 11, name: "Influencer" },
    { id: 72, categoryId: 11, name: "Socials" },
    { id: 73, categoryId: 11, name: "Visuals" },
    { id: 74, categoryId: 11, name: "Writing" },
    // Music (12)
    { id: 75, categoryId: 12, name: "Coaching" },
    { id: 76, categoryId: 12, name: "Education" },
    { id: 77, categoryId: 12, name: "Live Music" },
    { id: 78, categoryId: 12, name: "Production" },
    // Misc. (13)
    { id: 79, categoryId: 13, name: "Decor" },
    { id: 80, categoryId: 13, name: "Gardening" },
    { id: 81, categoryId: 13, name: "Interpreters" },
    { id: 82, categoryId: 13, name: "Legal & CPA" },
    { id: 83, categoryId: 13, name: "Movers" },
    { id: 84, categoryId: 13, name: "Organizing" },
    { id: 85, categoryId: 13, name: "Security" },
    { id: 86, categoryId: 13, name: "Travel" },
    // Personal (14)
    { id: 87, categoryId: 14, name: "Counseling" },
    { id: 88, categoryId: 14, name: "Dietitian" },
    { id: 89, categoryId: 14, name: "Holistic" },
    { id: 90, categoryId: 14, name: "Massage" },
    { id: 91, categoryId: 14, name: "Meditation" },
    { id: 92, categoryId: 14, name: "Rehab" },
    // Pet Care (15)
    { id: 93, categoryId: 15, name: "Dog Walking" },
    { id: 94, categoryId: 15, name: "Grooming" },
    { id: 95, categoryId: 15, name: "Pet Sitting" },
    { id: 96, categoryId: 15, name: "Pet Training" },
    { id: 97, categoryId: 15, name: "Pet Transport" },
    { id: 98, categoryId: 15, name: "Veterinary" },
    // Sanitation (16)
    { id: 99, categoryId: 16, name: "Flooring" },
    { id: 100, categoryId: 16, name: "Laundry" },
    { id: 101, categoryId: 16, name: "Office" },
    { id: 102, categoryId: 16, name: "Residential" },
    { id: 103, categoryId: 16, name: "Trash" },
    { id: 104, categoryId: 16, name: "Window" },
  ];

  const subcategories = await Promise.all(
    SUBCATEGORIES.map(({ id, categoryId, name }) =>
      prisma.subcategory.upsert({
        where: { id },
        update: { name, categoryId },
        create: { id, name, categoryId },
      }),
    ),
  );

  console.log(`Seeded ${subcategories.length} subcategories`);
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
