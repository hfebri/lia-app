import { db } from "../../../db/db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import type { NewUser } from "../../../db/types";

export async function seedUsers() {
  console.log("🌱 Seeding users...");

  // Default admin user data
  const adminUsers: NewUser[] = [
    {
      id: "12345678-1234-1234-1234-123456789abc", // Add the temp user UUID we're using for testing
      email: "temp@lia-app.com",
      name: "Temp Test User",
      role: "user",
      isActive: true,
    },
    {
      email: "admin@lia-app.com",
      name: "Admin User",
      role: "admin",
      isActive: true,
    },
    {
      email: "hfebri@leverategroup.asia", // Your actual email with admin access
      name: "H Febri",
      role: "admin",
      isActive: true,
    },
    {
      email: "demo@lia-app.com",
      name: "Demo User",
      role: "user",
      isActive: true,
    },
  ];

  try {
    for (const userData of adminUsers) {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log("✅ Users seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}
