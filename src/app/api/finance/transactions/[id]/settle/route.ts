import { financeRoute } from "@/features/finance/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return financeRoute("settleTransaction", request, (await context.params).id); }
