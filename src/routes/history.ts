import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function registerHistoryRoutes(app: FastifyInstance) {
  app.get(
    "/visits/history",
    { preValidation: [(app as any).authenticate] },
    async (req) => {
      const {
        from,
        to,
        roomId,
        search,
        page = "1",
        pageSize = "10",
      } = (req.query ?? {}) as any;
      const where: any = {};
      if (from) where.checkInAt = { gte: new Date(String(from)) };
      if (to)
        where.checkOutAt = {
          ...(where.checkOutAt ?? {}),
          lte: new Date(String(to)),
        };
      if (roomId) where.roomId = String(roomId);
      if (search) {
        const s = String(search);
        const only = s.replace(/\D/g, "");
        where.OR = [
          { name: { contains: s, mode: "insensitive" } },
          { cpf: { contains: only } },
        ];
      }
      const take = Number(pageSize);
      const skip = (Number(page) - 1) * take;
      const [items, total] = await Promise.all([
        prisma.visit.findMany({
          where,
          orderBy: { checkInAt: "desc" },
          include: { room: true },
          skip,
          take,
        }),
        prisma.visit.count({ where }),
      ]);
      return {
        total,
        page: Number(page),
        pageSize: take,
        items: items.map((v) => ({
          id: v.id,
          name: v.name,
          cpf: v.cpf,
          roomName: v.room.name,
          checkInAt: v.checkInAt,
          checkOutAt: v.checkOutAt,
        })),
      };
    }
  );
}
