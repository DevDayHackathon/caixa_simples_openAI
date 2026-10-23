import { getTaskRepository } from "@/features/tasks/server";
import { isSameOrigin, readDemoSession } from "@/features/agent/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const request_id = crypto.randomUUID();
  const session = readDemoSession(request);
  if (!session) return Response.json({ error: { code: "UNAUTHORIZED", message: "Sessão inválida." }, request_id }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: { code: "FORBIDDEN", message: "Origem não permitida." }, request_id }, { status: 403 });
  try {
    const rows = await getTaskRepository().listNotifications(session.businessId);
    const data = rows.map(row=>({id:row.id,occurrence_key:row.occurrence_key,target_id:row.target_id,kind:row.kind,title:row.title,explanation:row.explanation,proposal_ids:row.proposal_ids,created_at:row.created_at,read_at:row.read_at}));
    return Response.json({ data, request_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "DEPENDENCY_ERROR", message: "Notificações indisponíveis." }, request_id }, { status: 503 });
  }
}
