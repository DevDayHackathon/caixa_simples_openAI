import { FinanceError } from "@/features/finance/store";
import { z } from "zod";
import { createAgentTurnService } from "@/features/agent/turn";
import { getAgentRuntime, checkAgentRateLimit } from "@/features/tasks/server";
import { isSameOrigin, readDemoSession } from "@/features/agent/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const request_id = crypto.randomUUID();
  const session = readDemoSession(request);
  if (!session) return Response.json({ error: { code: "UNAUTHORIZED", message: "Sessão inválida." }, request_id }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: { code: "FORBIDDEN", message: "Origem não permitida." }, request_id }, { status: 403 });
  try {
    if (!await checkAgentRateLimit(session.sessionId)) return Response.json({ error: { code: "RATE_LIMITED", message: "Limite de mensagens excedido.", retry_after_seconds: 60 }, request_id }, { status: 429 });
    const body = z.strictObject({ message: z.string().trim().min(1).max(4000), origin: z.literal("user"), request_id: z.string().min(1).max(128) }).parse(await request.json());
    const runtime = getAgentRuntime(session.sessionId);
    const { client, ...dependencies } = runtime;
    const result = await createAgentTurnService({ ...dependencies, client: client ?? undefined }).turn(body);
    return Response.json({ data: result, request_id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FinanceError) return Response.json({ error: {code:error.code,message:error.message},request_id },{status:error.status});
    if (error instanceof z.ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Entrada inválida.", fields: Object.fromEntries(error.issues.map(issue => [issue.path.join("."), issue.message])) }, request_id }, { status: 422 });
    return Response.json({ error: { code: "DEPENDENCY_ERROR", message: "O agente não conseguiu concluir o turno." }, request_id }, { status: 503 });
  }
}
