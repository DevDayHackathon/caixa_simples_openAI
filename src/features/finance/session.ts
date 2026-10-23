import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { FinanceError } from "./store";

export const FINANCE_COOKIE = "caixa_demo_session";
function sign(payload: string, secret: string) { return createHmac("sha256", secret).update(payload).digest("base64url"); }
export function sessionSecret(secret: string) {
  if (secret.length < 32) throw new FinanceError(503, "SESSION_UNAVAILABLE", "Configure SESSION_SECRET com pelo menos 32 caracteres no servidor.");
  return secret;
}
export function issueFinanceSession(secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ business_id: "demo", session_id: randomUUID(), expires_at: now + 8 * 60 * 60 * 1000 })).toString("base64url");
  return payload + "." + sign(payload, sessionSecret(secret));
}
export function requireFinanceSession(request: Request, secret: string, now = Date.now()) {
  sessionSecret(secret);
  const cookies = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim()).filter(value => value.startsWith(FINANCE_COOKIE + "="));
  if (cookies.length !== 1) throw new FinanceError(401, "UNAUTHORIZED", "Sessão de demonstração necessária.");
  const token = cookies[0].slice(FINANCE_COOKIE.length + 1);
  try {
    if (token.length > 1024) throw new Error();
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined) throw new Error();
    const expected = Buffer.from(sign(payload, secret)), received = Buffer.from(signature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(data.expires_at) || data.expires_at <= now) throw new Error();
    if (data.business_id !== "demo") throw new FinanceError(403, "FORBIDDEN", "Empresa fora do escopo.");
    return { businessId: "demo" as const, sessionId: sign(payload, secret) };
  } catch (error) {
    if (error instanceof FinanceError) throw error;
    throw new FinanceError(401, "UNAUTHORIZED", "Sessão inválida ou expirada.");
  }
}
