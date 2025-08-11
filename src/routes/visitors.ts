// src/routes/visitors.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@fastify/jwt"; // puxa a augmentação de tipos (req.user)

export async function registerVisitorsRoutes(app: FastifyInstance) {
  // Listar visitantes ATIVOS (opcionais: roomId, search)
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

      if (search?.trim()) {
        const s = search.trim();
        const digits = s.replace(/\D/g, "");
        const OR: any[] = [];

        // nome: exige pelo menos 2 chars pra evitar varredura excessiva
        if (s.length >= 2) {
          OR.push({ name: { contains: s, mode: "insensitive" } });
        }
        // cpf: só entra se tiver ao menos 3 dígitos (ajuste conforme desejar)
        if (digits.length >= 3) {
          OR.push({ cpf: { contains: digits } });
        }

        if (OR.length) {
          where.OR = OR;
        } else {
          // se o usuário digitou algo, mas não formou critério válido,
          // não adicionamos OR (vai retornar todos daquela sala) — se preferir retornar vazio:
          // return [];
        }
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

      // Log do check-in
      await app.logger.info("Check-in realizado", {
        visitId: visit.id,
        visitorName: data.name,
        visitorCpf: data.cpf,
        roomId: data.roomId,
        action: "visit.checkin",
      });

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

      // Log do checkout
      await app.logger.info("Check-out realizado", {
        visitId: params.id,
        action: "visit.checkout",
      });

      return { ok: true };
    }
  );
}
