import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Criar usuário administrador
  const email = "admin@stark.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash }, // Atualiza a senha se o usuário já existir
  });

  console.log(`👤 Usuário criado/atualizado: ${user.email}`);

  // Criar salas padrão
  const roomsData = [
    { name: "Sala 01", capacity: 4 },
    { name: "Sala 13", capacity: 6 },
    { name: "Sala 42", capacity: 8 },
    { name: "Laboratório", capacity: 12 },
    { name: "Auditório", capacity: 50 },
  ];

  for (const { name, capacity } of roomsData) {
    const room = await prisma.room.upsert({
      where: { name },
      update: { capacity }, // Atualiza capacidade se a sala já existir
      create: { name, capacity },
    });
    console.log(
      `🏢 Sala criada/atualizada: ${room.name} (capacidade: ${room.capacity})`
    );
  }

  // Criar log inicial do sistema
  await prisma.log.create({
    data: {
      level: "info",
      message: "Sistema inicializado com dados de seed",
      meta: {
        user: user.email,
        rooms: roomsData.length,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log(`📊 Resumo: ${roomsData.length} salas, 1 usuário admin`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
