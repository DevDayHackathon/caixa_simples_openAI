import { z } from "zod";
import { createTaskScheduler } from "@/features/tasks/schedule";
import { getTaskRepository } from "@/features/tasks/server";
import { isSameOrigin, readDemoSession } from "@/features/agent/session";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const request_id = crypto.randomUUID();
  const session = readDemoSession(request);
  if (!session) return Response.json({ error: { code: "UNAUTHORIZED", message: "Sessão inválida." }, request_id }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: { code: "FORBIDDEN", message: "Origem não permitida." }, request_id }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = z.discriminatedUnion("action", [
      z.strictObject({ action: z.literal("cancel"), expected_version: z.number().int().positive() }),
      z.strictObject({ action: z.literal("snooze"), expected_version: z.number().int().positive(), due_at: z.iso.datetime() }),
    ]).parse(await request.json());
    const repository = getTaskRepository(); const task = await repository.getTask(id);
    if (!task || task.business_id !== session.businessId) return Response.json({ error: { code: "NOT_FOUND", message: "Tarefa não encontrada." }, request_id }, { status: 404 });
    const scheduler = createTaskScheduler(repository);
    const data = body.action === "cancel" ? await scheduler.cancel(id, body.expected_version)
      : await scheduler.snooze(id, body.expected_version, body.due_at, new Date().toISOString());
    return Response.json({ data, request_id });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Entrada inválida.", fields: error.issues }, request_id }, { status: 422 });
    return Response.json({ error: { code: "CONFLICT", message: "A tarefa mudou; recarregue o contexto." }, request_id }, { status: 409 });
  }
}
