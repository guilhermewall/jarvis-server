// src/routes/visitors.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@fastify/jwt"; // puxa a augmentação de tipos (req.user)

export async function registerVisitorsRoutes(app: FastifyInstance) {
  // Listar visitantes ATIVOS (opcionais: roomId, search)
  app.get(
    "/visitors/active",
    { preValidation: [(app as any).authenticate] },
    async (req) => {
      const qSchema = z.object({
        roomId: z.string().optional(),
        search: z.string().optional(),
      });
      const { roomId, search } = qSchema.parse(req.query);

      const where: any = { checkOutAt: null };
      if (roomId) where.roomId = roomId;
      if (search) {
        const only = search.replace(/\D/g, "");
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { cpf: { contains: only } },
        ];
      }

      const items = await app.prisma.visit.findMany({
        where,
        orderBy: { checkInAt: "desc" },
        include: { room: true },
      });

      return items.map((v) => ({
        id: v.id,
        name: v.name,
        cpf: v.cpf,
        roomId: v.roomId,
        roomName: v.room.name,
        checkInAt: v.checkInAt,
      }));
    }
  );

  // Check-in (criar visita) — Nome/CPF/Sala obrigatórios + capacidade <= 3
  app.post(
    "/visitors",
    { preValidation: [(app as any).authenticate] },
    async (req, reply) => {
      const bodySchema = z.object({
        name: z.string().min(2),
        cpf: z.string(), // aceitamos com/sem máscara e validamos na mão
        roomId: z.string(),
        email: z.string().email().optional(),
        birthDate: z.string().optional(), // "YYYY-MM-DD"
      });

      const data = bodySchema.parse(req.body);

      const cpfOnly = data.cpf.replace(/\D/g, "");
      if (cpfOnly.length !== 11) {
        return reply.code(400).send({ error: "CPF inválido (11 dígitos)." });
      }

      const capacity = await app.prisma.room.findUnique({
        where: { id: data.roomId },
        select: { capacity: true },
      });
      if (!capacity) return reply.code(400).send({ error: "Room not found" });

      const inUse = await app.prisma.visit.count({
        where: { roomId: data.roomId, checkOutAt: null },
      });
      if (inUse >= capacity.capacity) {
        return reply
          .code(409)
          .send({ error: `Room at capacity (${inUse}/${capacity.capacity})` });
      }

      const birthDate =
        data.birthDate && !Number.isNaN(Date.parse(data.birthDate))
          ? new Date(data.birthDate)
          : undefined;

      const visit = await app.prisma.visit.create({
        data: {
          name: data.name.trim(),
          cpf: cpfOnly, // salva só dígitos (se preferir manter máscara, troque por data.cpf)
          email: data.email,
          birthDate,
          roomId: data.roomId,
          createdBy: (req as any).user?.sub ?? null,
        },
      });

      // log do check-in (mostrado na aba de Logs)
      app.prisma.log
        .create({
          data: {
            level: "info",
            message: "visit.checkin",
            meta: {
              visitId: visit.id,
              roomId: data.roomId,
              userId: (req as any).user?.sub ?? null,
            },
          },
        })
        .catch(app.log.error);

      reply.code(201);
      return { id: visit.id };
    }
  );

  // Checkout
  app.post(
    "/visitors/:id/checkout",
    { preValidation: [(app as any).authenticate] },
    async (req, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params);
      const updated = await app.prisma.visit
        .update({
          where: { id: params.id },
          data: { checkOutAt: new Date() },
        })
        .catch(() => null);

      if (!updated) return reply.code(404).send({ error: "Visit not found" });

      // log do checkout
      app.prisma.log
        .create({
          data: {
            level: "info",
            message: "visit.checkout",
            meta: {
              visitId: params.id,
              userId: (req as any).user?.sub ?? null,
            },
          },
        })
        .catch(app.log.error);

      return { ok: true };
    }
  );
}
