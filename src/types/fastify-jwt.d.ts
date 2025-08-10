// garante que o Fastify conheça app.jwt e o tipo do payload/user
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // o que você coloca no token:
    payload: { sub: string; email: string };
    // o que vem em request.user depois do verify():
    user: { sub: string; email: string };
  }
}

// (opcional, mas útil) tipar o decorator authenticate
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}
