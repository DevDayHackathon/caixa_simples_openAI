import { afterEach, describe, expect, it } from "vitest";
import { signDemoSession } from "@/features/agent/session";
import { POST as turn } from "@/app/api/agent/turn/route";
import { GET as notifications } from "@/app/api/agent/notifications/route";
import { POST as run } from "@/app/api/tasks/run/route";
import { PATCH as updateTask } from "@/app/api/tasks/[id]/route";

const session = signDemoSession("session-123", Date.now() + 60_000, "test-secret");
function request(path: string, method: string, body?: unknown, headers: Record<string,string> = {}) {
  return new Request(`http://localhost${path}`, { method, headers: { ...(method !== "GET" ? { origin: "http://localhost" } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined });
}
const cookie = { cookie: `demo_session=${session}` };
afterEach(() => { delete process.env.SESSION_SECRET; delete process.env.TASK_RUNNER_SECRET; delete process.env.OPENAI_API_KEY; });

describe("agent and task HTTP boundaries", () => {
  it("rejects turns and notification reads without a signed session", async () => {
    process.env.SESSION_SECRET = "test-secret";
    expect((await turn(request("/api/agent/turn", "POST", { message: "oi", origin: "user", request_id: "a" }))).status).toBe(401);
    expect((await notifications(request("/api/agent/notifications", "GET"))).status).toBe(401);
  });

  it("rejects an altered session signature", async () => {
    process.env.SESSION_SECRET = "test-secret";
    const response = await notifications(request("/api/agent/notifications", "GET", undefined, { cookie: `demo_session=${session}x` }));
    expect(response.status).toBe(401);
  });

  it("rejects cross-origin mutation even with a valid session", async () => {
    process.env.SESSION_SECRET = "test-secret";
    expect((await turn(request("/api/agent/turn", "POST", { message: "oi", origin: "user", request_id: "a" }, { ...cookie, origin: "https://evil.test" }))).status).toBe(403);
  });

  it("validates turn inputs and does not invoke unavailable AI as success", async () => {
    process.env.SESSION_SECRET = "test-secret";
    const invalid = await turn(request("/api/agent/turn", "POST", { message: "", origin: "user", request_id: "a" }, cookie));
    expect(invalid.status).toBe(422);
    const unavailable = await turn(request("/api/agent/turn", "POST", { message: "oi", origin: "user", request_id: "b" }, cookie));
    expect(unavailable.status).toBe(503);
  });

  it("requires a protected executor secret and rejects malformed task actions", async () => {
    process.env.TASK_RUNNER_SECRET = "runner-secret";
    expect((await run(request("/api/tasks/run", "POST"))).status).toBe(401);
    process.env.SESSION_SECRET = "test-secret";
    const invalid = await updateTask(request("/api/tasks/x", "PATCH", { action: "cancel" }, cookie), { params: Promise.resolve({ id: "x" }) });
    expect(invalid.status).toBe(422);
  });

  it("returns notification history for an authenticated demo session", async () => {
    process.env.SESSION_SECRET = "test-secret";
    const response = await notifications(request("/api/agent/notifications", "GET", undefined, cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [] });
  });

  it("keeps task actions scoped to the signed demo business", async () => {
    process.env.SESSION_SECRET = "test-secret";
    const response = await updateTask(request("/api/tasks/not-owned", "PATCH", { action: "cancel", expected_version: 1 }, cookie),
      { params: Promise.resolve({ id: "not-owned" }) });
    expect(response.status).toBe(404);
  });

  it("returns an empty result for a protected tick with no due tasks", async () => {
    process.env.TASK_RUNNER_SECRET = "runner-secret";
    const response = await run(request("/api/tasks/run", "POST", {}, { authorization: "Bearer runner-secret" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { claimed: 0, notified: 0 } });
  });
});
