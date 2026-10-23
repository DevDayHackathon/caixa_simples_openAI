import { timingSafeEqual } from "node:crypto";
import { saoPauloDate } from "@/features/finance/port";
import { runDueTasks } from "@/features/tasks/runner";
import { getTaskRepository, readCommitmentStatus, getServerFinance } from "@/features/tasks/server";

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
    const repository = getTaskRepository();
    const data = await runDueTasks({ repository, readCommitment: async (businessId, targetId) => {
      const [status, snapshot] = await Promise.all([
        readCommitmentStatus(businessId, targetId), getServerFinance().getCashSnapshot({ business_id: businessId, as_of: saoPauloDate(new Date()) }),
      ]);
      return { status, snapshot };
    } });
    return Response.json({ data, request_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "DEPENDENCY_ERROR", message: "Executor indisponível." }, request_id }, { status: 503 });
  }
}
