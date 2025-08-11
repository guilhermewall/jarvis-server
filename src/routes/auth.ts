// src/routes/auth.ts
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import "@fastify/jwt"; // tipos de app.jwt / request.user

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(3),
      })
      .parse(req.body);

    const email = body.email.trim().toLowerCase();

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

    const token = app.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: "1d" }
    );

    // Log manual adicional para login bem-sucedido
    await app.logger.info("Login bem-sucedido", {
      userId: user.id,
      email: user.email,
      action: "auth.login",
    });

    return { token };
  });
}
