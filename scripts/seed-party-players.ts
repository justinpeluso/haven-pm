/**
 * Upsert Neverworld party logins without wiping the database.
 * Run: npm run db:seed:party
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PARTY_PASSWORD = "Chomps123";

const PLAYERS = [
  {
    email: "player1@havenpm.com",
    name: "Justin",
    role: UserRole.ADMINISTRATOR,
    phone: "(412) 555-0161",
  },
  {
    email: "player2@havenpm.com",
    name: "Rusty",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0162",
  },
  {
    email: "player3@havenpm.com",
    name: "Elisha",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0163",
  },
  {
    email: "player4@havenpm.com",
    name: "Eric Prendergast",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0164",
  },
  {
    email: "eric@havenpm.com",
    name: "Eric Prendergast",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0164",
  },
  {
    email: "player5@havenpm.com",
    name: "Dad",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0165",
  },
  {
    email: "dad@havenpm.com",
    name: "Dad",
    role: UserRole.OFFICE_STAFF,
    phone: "(412) 555-0165",
  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(PARTY_PASSWORD, 12);

  for (const p of PLAYERS) {
    await prisma.user.upsert({
      where: { email: p.email },
      create: {
        email: p.email,
        name: p.name,
        passwordHash,
        role: p.role,
        phone: p.phone,
      },
      update: {
        name: p.name,
        passwordHash,
        role: p.role,
        phone: p.phone,
      },
    });
    console.log(`✓ ${p.email} → ${p.name}`);
  }

  console.log(`\nNeverworld logins ready (password: ${PARTY_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
