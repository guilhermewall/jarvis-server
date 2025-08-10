import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import formbody from "@fastify/formbody";
import { PrismaClient } from "@prisma/client";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerRoomsRoutes } from "./routes/rooms.js";
import { registerVisitorsRoutes } from "./routes/visitors.js";
import { registerHistoryRoutes } from "./routes/history.js";
import { registerLogsRoutes } from "./routes/logs.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // Plugins globais (ordem segura)
  await app.register(cors, { origin: true });
  await app.register(formbody); // aceita x-www-form-urlencoded
  await app.register(jwt, { secret: process.env.JWT_SECRET || "dev-secret" });

  // Prisma Client único (injeção no Fastify)
  const prisma = new PrismaClient();
  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async (server) => {
    await server.prisma.$disconnect();
  });

  // Guard de auth
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // Healthcheck
  app.get("/healthz", async () => ({ ok: true }));

  // Rotas
  await registerAuthRoutes(app);
  await registerRoomsRoutes(app);
  await registerVisitorsRoutes(app);
  await registerHistoryRoutes(app);
  await registerLogsRoutes(app);

  return app;
}

// Declarações de tipos para o Fastify
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}
