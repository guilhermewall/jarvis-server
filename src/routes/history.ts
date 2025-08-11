import type { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";

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

      const take = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

      const where: Prisma.VisitWhereInput = {};

      // room
      if (roomId) where.roomId = String(roomId);

      // search por nome/CPF
      if (search) {
        const s = String(search).trim();
        const digits = s.replace(/\D/g, "");
        const OR: Prisma.VisitWhereInput[] = [];

        if (s.length >= 2) {
          OR.push({ name: { contains: s, mode: "insensitive" } });
        }
        if (digits.length >= 3) {
          OR.push({ cpf: { contains: digits } });
        }
        if (OR.length) where.OR = OR; // só adiciona se houver algo
      }

      // período (sugestão: filtrar por checkInAt)
      if (from || to) {
        where.checkInAt = {
          ...(from ? { gte: new Date(String(from)) } : {}),
          ...(to ? { lte: new Date(String(to) + "T23:59:59.999Z") } : {}),
        };
      }

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
        page: Number(page) || 1,
        pageSize: take,
        items: items.map((v) => ({
          id: v.id,
          name: v.name,
          cpf: v.cpf,
          roomId: v.roomId,
          roomName: v.room.name,
          checkInAt: v.checkInAt,
          checkOutAt: v.checkOutAt,
        })),
      };
    }
  );
}
