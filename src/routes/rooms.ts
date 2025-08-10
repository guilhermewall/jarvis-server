import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function registerRoomsRoutes(app: FastifyInstance) {
  app.get(
    "/rooms",
    { preValidation: [(app as any).authenticate] },
    async () => {
      const rooms = await prisma.room.findMany({ orderBy: { name: "asc" } });
      const counts = await prisma.visit.groupBy({
        by: ["roomId"],
        _count: { roomId: true },
        where: { checkOutAt: null },
      });
      const map = Object.fromEntries(
        counts.map((c) => [c.roomId, c._count.roomId])
      );
      return rooms.map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        activeCount: map[r.id] ?? 0,
      }));
    }
  );
}
