import { financeRoute } from "@/features/finance/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) { return financeRoute("getCashSnapshot", request); }
