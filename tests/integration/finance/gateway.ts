import { createServer } from "node:http";
import { FinanceError } from "@/features/finance/store";
import type { testDatabase } from "./database";

// Test transport only: exposes the real local SQL RPCs to the unmodified Supabase SDK.
// No mocks, financial calculations or persistent state in this HTTP bridge.
export async function localRpcGateway(db: Awaited<ReturnType<typeof testDatabase>>, key: string) {
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.method !== "POST" || request.headers.authorization !== "Bearer " + key || !request.url?.startsWith("/rest/v1/rpc/finance_")) { response.writeHead(403); response.end("{}"); return; }
    try {
      const parts: Buffer[] = []; for await (const part of request) parts.push(Buffer.from(part));
      const result = await db.store.rpc(request.url.slice("/rest/v1/rpc/".length), JSON.parse(Buffer.concat(parts).toString("utf8")));
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400); response.end(JSON.stringify({ code: "P0001", message: error instanceof FinanceError ? error.code : "DATABASE_UNAVAILABLE", details: null, hint: null }));
    }
  });
  await new Promise<void>(yes => server.listen(0, "127.0.0.1", yes));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Gateway sem porta.");
  return { url: `http://127.0.0.1:${address.port}`, async close() { server.closeAllConnections(); await new Promise<void>((yes, no) => server.close(error => error ? no(error) : yes())); } };
}
