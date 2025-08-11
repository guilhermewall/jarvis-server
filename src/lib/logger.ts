import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface LoggerOptions {
  excludePaths?: string[];
  includeBody?: boolean;
  maxBodySize?: number;
}

export function createLogger(
  app: FastifyInstance,
  options: LoggerOptions = {}
) {
  const {
    excludePaths = ["/healthz", "/health"],
    includeBody = false,
    maxBodySize = 1000,
  } = options;

  // Função auxiliar para salvar log no banco
  async function saveLog(
    level: "info" | "warn" | "error",
    message: string,
    meta: any = {}
  ) {
    try {
      await app.prisma.log.create({
        data: { level, message, meta },
      });
    } catch (err) {
      app.log.error(`Erro ao salvar log no banco: ${String(err)}`);
    }
  }

  // Hook para capturar todas as requisições
  app.addHook("onRequest", async (request: FastifyRequest) => {
    // Pular paths excluídos
    if (excludePaths.includes(request.url)) return;

    // Adicionar timestamp na request para calcular duração
    (request as any).startTime = Date.now();
  });

  // Hook para capturar respostas
  app.addHook(
    "onSend",
    async (request: FastifyRequest, reply: FastifyReply, payload) => {
      if (excludePaths.includes(request.url)) return payload;

      const requestData = buildRequestData(
        request,
        reply,
        includeBody,
        maxBodySize
      );

      if (reply.statusCode >= 400) {
        requestData.error = extractErrorFromPayload(payload);
      }

      const level = getLogLevel(reply.statusCode);
      const message = `${request.method} ${request.url} - ${reply.statusCode}`;

      await saveLog(level, message, requestData);
      return payload;
    }
  );

  // Funções auxiliares
  function buildRequestData(
    request: FastifyRequest,
    reply: FastifyReply,
    includeBody: boolean,
    maxBodySize: number
  ) {
    const startTime = (request as any).startTime || Date.now();
    const duration = Date.now() - startTime;

    const data: any = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers["user-agent"],
      ip: request.ip,
      query: request.query,
    };

    if (includeBody && ["POST", "PUT", "PATCH"].includes(request.method)) {
      data.body = getRequestBody(request.body, maxBodySize);
    }

    if ((request as any).user) {
      data.userId = (request as any).user.sub;
      data.userEmail = (request as any).user.email;
    }

    return data;
  }

  function getRequestBody(body: any, maxBodySize: number): string | undefined {
    if (!body || typeof body !== "object") return undefined;

    const bodyStr = JSON.stringify(body);
    return bodyStr.length > maxBodySize
      ? bodyStr.substring(0, maxBodySize) + "..."
      : bodyStr;
  }

  function extractErrorFromPayload(payload: any): string | undefined {
    try {
      const responseBody =
        typeof payload === "string" ? JSON.parse(payload) : payload;
      return responseBody?.error;
    } catch {
      return undefined;
    }
  }

  function getLogLevel(statusCode: number): "info" | "warn" | "error" {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  // Hook para capturar erros não tratados
  app.setErrorHandler(async (error, request, reply) => {
    const startTime = (request as any).startTime || Date.now();
    const duration = Date.now() - startTime;

    // Dados do erro
    const errorData: any = {
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
      userAgent: request.headers["user-agent"],
      ip: request.ip,
      query: request.query,
    };

    // Incluir informações do usuário se autenticado
    if ((request as any).user) {
      errorData.userId = (request as any).user.sub;
      errorData.userEmail = (request as any).user.email;
    }

    // Salvar erro no banco
    await saveLog(
      "error",
      `ERROR: ${request.method} ${request.url} - ${error.message}`,
      errorData
    );

    // Log no console também
    app.log.error(error);

    // Resposta de erro
    const statusCode = (error as any).statusCode || 500;
    reply.status(statusCode).send({
      error: error.message || "Internal Server Error",
      statusCode,
    });
  });

  // Retornar função para log manual
  return {
    info: (message: string, meta?: any) => saveLog("info", message, meta),
    warn: (message: string, meta?: any) => saveLog("warn", message, meta),
    error: (message: string, meta?: any) => saveLog("error", message, meta),
  };
}
