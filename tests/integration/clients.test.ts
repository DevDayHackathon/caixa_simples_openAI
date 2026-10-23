import { describe, expect, it } from "vitest";
import { createFinanceClient, createAgentClient, ContractHttpError } from "@/adapters/http";
import { createMockFinancePort, createMockAgentPort, MockOperationUnavailable } from "@/adapters/mock";
import { f1Snapshot, notificationFixture, agentReplyFixture } from "@/fixtures/demo";
import { cashSnapshotSchema } from "@/contracts";
import { GET } from "@/app/api/demo/snapshot/route";

describe("cliente e adaptador T1", () => {
  it("cliente financeiro lê envelope HTTP do handler de demonstração", async () => {
    const client = createFinanceClient(async () => GET());
    const result = await client.getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" });
    expect(result).toEqual(cashSnapshotSchema.parse(f1Snapshot));
    expect((await GET()).headers.get("x-data-source")).toBe("mock");
  });

  it("cliente do agente preserva os dados de resposta e notificações", async () => {
    const agent = createMockAgentPort();
    const client = createAgentClient(async (request) => {
      const req = new Request(request);
      const data = req.url.endsWith("/notifications") ? await agent.listNotifications() : await agent.turn(await req.json());
      return Response.json({ data, request_id: "integration-1" });
    }, "https://example.test");
    expect(await client.turn({ message: "Como está meu caixa?", origin: "user", request_id: "req-1" })).toEqual(agentReplyFixture);
    expect(await client.listNotifications()).toEqual([notificationFixture]);
  });

  it("rejeita payload financeiro quebrado em vez de tratar como saldo válido", async () => {
    const client = createFinanceClient(async () => Response.json({ data: { current_balance_cents: 1 }, request_id: "bad" }));
    await expect(client.getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" })).rejects.toThrow();
  });

  it("mantém erro de conflito tipado e campos de correção", async () => {
    const client = createFinanceClient(async () => Response.json({ error: { code: "CONFLICT", message: "Recarregue a versão.", fields: { version: "2" } }, request_id: "conflict-1" }, { status: 409 }));
    await expect(client.getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" })).rejects.toMatchObject({ name: "ContractHttpError", status: 409, code: "CONFLICT", request_id: "conflict-1", fields: { version: "2" } });
    expect(ContractHttpError.prototype).toBeInstanceOf(Error);
  });

  it("snapshots mock não compartilham estado mutável entre consumidores", async () => {
    const finance = createMockFinancePort();
    const input = { business_id: "demo", as_of: "2026-10-23" };
    const first = await finance.getCashSnapshot(input);
    first.daily_balances[0].balance_cents = -999;
    expect((await finance.getCashSnapshot(input)).daily_balances[0].balance_cents).toBe(100000);
  });

  it("mock não finge confirmar importações nem executa proatividade real", async () => {
    const finance = createMockFinancePort();
    await expect(finance.confirmImport({ preview_id: "preview-1", idempotency_key: "test-1" })).rejects.toBeInstanceOf(MockOperationUnavailable);
    expect(await createMockAgentPort().listNotifications()).toEqual([notificationFixture]);
  });
});
