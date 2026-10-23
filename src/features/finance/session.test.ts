import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { FINANCE_COOKIE, issueFinanceSession, requireFinanceSession } from "./session";
const secret = "test-session-with-at-least-32-characters", now = 100000000;
const req = (token: string) => new Request("https://demo.test", { headers: { cookie: FINANCE_COOKIE + "=" + token } });
describe("T8 sessão demo", () => {
  it("aceita assinatura válida e rejeita assinatura adulterada", () => {
    const token = issueFinanceSession(secret, now); expect(() => requireFinanceSession(req(token), secret, now)).not.toThrow();
    expect(() => requireFinanceSession(req(token + "x"), secret, now)).toThrow(/inválida/);
  });
  it("sessão expirada não dá acesso", () => {
    expect(() => requireFinanceSession(req(issueFinanceSession(secret, now)), secret, now + 8 * 60 * 60 * 1000)).toThrow(/expirada/);
  });
  it("assinatura válida não autoriza outra empresa", () => {
    const payload = Buffer.from(JSON.stringify({ business_id: "other", expires_at: now + 1000 })).toString("base64url");
    const token = payload + "." + createHmac("sha256", secret).update(payload).digest("base64url");
    expect(() => requireFinanceSession(req(token), secret, now)).toThrow(/escopo/);
  });
  it("ausência ou duplicação de cookie e segredo ausente são rejeitados", () => {
    expect(() => requireFinanceSession(new Request("https://demo.test"), secret, now)).toThrow(/necessária/);
    const request = req("a"); request.headers.set("cookie", `${FINANCE_COOKIE}=a; ${FINANCE_COOKIE}=b`);
    expect(() => requireFinanceSession(request, secret, now)).toThrow(/necessária/);
    expect(() => issueFinanceSession("", now)).toThrow(/SESSION_SECRET/);
  });
});
