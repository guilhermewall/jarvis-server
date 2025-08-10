import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function registerLogsRoutes(app: FastifyInstance) {
  app.get(
    "/logs",
    { preValidation: [(app as any).authenticate] },
    async (req) => {
      const schema = z.object({
        level: z.enum(["info", "warn", "error"]).optional(),
        search: z.string().optional(),
        from: z.string().optional(), // ISO ou YYYY-MM-DD
        to: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(20),
      });

      const { level, search, from, to, page, pageSize } = schema.parse(
        req.query
      );

      const where: any = {};
      if (level) where.level = level;
      if (search) where.message = { contains: search, mode: "insensitive" };
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const skip = (page - 1) * pageSize;
      const [items, total] = await Promise.all([
        app.prisma.log.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        app.prisma.log.count({ where }),
      ]);

      // “achatamos” alguns campos comuns do meta pra facilitar no front
      const rows = items.map((l) => {
        const meta = (l.meta ?? {}) as any;
        return {
          id: l.id,
          createdAt: l.createdAt,
          level: l.level,
          message: l.message,
          userId: meta.userId ?? meta.by ?? null,
          visitId: meta.visitId ?? null,
          roomId: meta.roomId ?? null,
          meta, // mantém o meta bruto pra detalhes
        };
      });

      return { total, page, pageSize, items: rows };
    }
  );
}
