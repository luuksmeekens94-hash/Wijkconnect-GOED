import { timingSafeEqual } from "node:crypto";

export function bearerTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  return token && !token.includes(" ") ? token : null;
}

export function verifyLongSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected || Buffer.byteLength(expected, "utf8") < 32) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifySameOrigin(request: Request) {
  const configured = (process.env.APP_URL || process.env.NEXTAUTH_URL)?.trim();
  const origin = request.headers.get("origin");
  if (!configured || !origin) return false;
  try {
    return new URL(configured).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
