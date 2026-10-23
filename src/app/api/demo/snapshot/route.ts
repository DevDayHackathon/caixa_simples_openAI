import { createMockFinancePort } from "@/adapters/mock";
import { cashSnapshotSchema, successEnvelopeSchema } from "@/contracts";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await createMockFinancePort().getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" });
  const body = successEnvelopeSchema(cashSnapshotSchema).parse({ data, request_id: crypto.randomUUID() });
  return Response.json(body, { headers: { "Cache-Control": "no-store", "X-Data-Source": "mock" } });
}
