import { applyBrevoWebhookPayload } from "@/lib/survey-delivery";
import { bearerTokenFromRequest, verifyLongSecret } from "@/lib/request-security";

const MAX_BATCH_SIZE = 100;

export async function POST(request: Request) {
  const receivedSecret = bearerTokenFromRequest(request);
  if (!verifyLongSecret(receivedSecret, process.env.BREVO_WEBHOOK_SECRET)) {
    return new Response(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (Array.isArray(body) && body.length > MAX_BATCH_SIZE) {
    return new Response(null, { status: 413 });
  }
  const payloads = Array.isArray(body) ? body : [body];
  const results = await Promise.all(payloads.map((payload) => applyBrevoWebhookPayload(payload)));
  if (results.includes("invalid")) return new Response(null, { status: 400 });
  return new Response(null, { status: 204 });
}
