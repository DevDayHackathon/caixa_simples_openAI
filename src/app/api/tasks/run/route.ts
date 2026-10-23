import { timingSafeEqual } from "node:crypto";
import { createMockFinancePort } from "@/adapters/mock";
import { runDueTasks } from "@/features/tasks/runner";
import { getTaskRepository, readCommitmentStatus } from "@/features/tasks/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.TASK_RUNNER_SECRET; const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const a = Buffer.from(expected); const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const request_id = crypto.randomUUID();
  if (!authorized(request)) return Response.json({ error: { code: "UNAUTHORIZED", message: "Segredo do executor inválido." }, request_id }, { status: 401 });
  try {
    const finance = createMockFinancePort();
    const data = await runDueTasks({ repository: getTaskRepository(), readCommitment: async (businessId, targetId) => {
      const [status, snapshot] = await Promise.all([
        readCommitmentStatus(businessId, targetId), finance.getCashSnapshot({ business_id: businessId, as_of: new Date().toISOString().slice(0, 10) }),
      ]);
      return { status, snapshot };
    } });
    return Response.json({ data, request_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "DEPENDENCY_ERROR", message: "Executor indisponível." }, request_id }, { status: 503 });
  }
}
