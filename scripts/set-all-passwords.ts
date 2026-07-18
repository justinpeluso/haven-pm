/**
 * Set every user's passwordHash to the given password (default: Chomps123).
 * Usage: npx tsx scripts/set-all-passwords.ts
 *        PASSWORD=Chomps123 DATABASE_URL=... npx tsx scripts/set-all-passwords.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const PASSWORD = process.env.PASSWORD || "Chomps123";

async function main() {
  const prisma = new PrismaClient();
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL || "").hostname;
    } catch {
      return "?";
    }
  })();
  const hash = await bcrypt.hash(PASSWORD, 12);
  const result = await prisma.user.updateMany({
    data: { passwordHash: hash },
  });
  console.log(`Updated ${result.count} users on ${host} → password set`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
