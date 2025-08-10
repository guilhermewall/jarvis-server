import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@stark.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: {},
  });

  const rooms = ["Sala 01", "Sala 13", "Sala 42", "Laboratório"];
  for (const name of rooms) {
    await prisma.room.upsert({
      where: { name },
      update: {},
      create: { name, capacity: 3 },
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
