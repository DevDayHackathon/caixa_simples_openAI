import { financeRoute } from "@/features/finance/http";
export const runtime = "nodejs";
export const GET = (request: Request) => financeRoute("workspace", request);
