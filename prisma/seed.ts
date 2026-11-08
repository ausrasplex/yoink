import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Optional: creates (or refreshes the password of) the server admin from SERVER_ADMIN_EMAIL / SERVER_ADMIN_PASSWORD.
// Without them, open the app in a browser and /setup creates the server admin instead.
// Admins are never seeded: the server admin invites them.
async function main() {
  await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const email = process.env.SERVER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SERVER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("SERVER_ADMIN_EMAIL / SERVER_ADMIN_PASSWORD not set: open the app and create the server admin at /setup.");
    return;
  }
  const current = await db.user.findFirst({ where: { role: "SERVER_ADMIN" } });
  if (current && current.email !== email) {
    console.log(`Server admin already exists (${current.email}); not creating ${email}.`);
    return;
  }
  const other = await db.user.findUnique({ where: { email } });
  if (other && other.role !== "SERVER_ADMIN") {
    console.log(`${email} is already a ${other.role.toLowerCase()} account; the server admin needs its own email.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: process.env.SERVER_ADMIN_NAME || "Server admin", passwordHash, role: "SERVER_ADMIN" },
  });
  console.log(`Server admin ready: ${email}`);
}

main().finally(() => db.$disconnect());
