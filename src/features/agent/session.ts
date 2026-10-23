import { timingSafeEqual, createHmac } from "node:crypto";

export type DemoSession = { sessionId: string; businessId: "demo" };
export function signDemoSession(sessionId: string, expiresAt: number, secret = process.env.SESSION_SECRET): string {
  if (!secret) throw new Error("SESSION_SECRET não configurado.");
  const payload = `demo|${sessionId}|${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function readDemoSession(request: Request, secret = process.env.SESSION_SECRET): DemoSession | null {
  if (!secret) return null;
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("demo_session="))?.slice("demo_session=".length);
  if (!token) return null;
  const [encoded, signature] = token.split("."); if (!encoded || !signature) return null;
  let payload: string;
  try { payload = Buffer.from(encoded, "base64url").toString("utf8"); } catch { return null; }
  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64url"); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  const [businessId, sessionId, expires] = payload.split("|");
  if (businessId !== "demo" || !sessionId || !/^[-\w]{8,128}$/.test(sessionId) || Number(expires) <= Date.now()) return null;
  return { businessId: "demo", sessionId };
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET";
  const expected = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}
