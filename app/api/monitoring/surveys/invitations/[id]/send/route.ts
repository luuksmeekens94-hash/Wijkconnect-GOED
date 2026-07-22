import { auth } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { sendSurveyInvitationEmail } from "@/lib/survey-delivery";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }
  if (!verifySameOrigin(request)) {
    return Response.json({ error: "Ongeldige aanvraagbron" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await sendSurveyInvitationEmail(id, session.user.id);
    return Response.json(result, { status: result.outcome === "not-eligible" ? 409 : 200 });
  } catch {
    return Response.json(
      { error: "Verzenden is niet gelukt. Controleer de verzendstatus en probeer het later opnieuw." },
      { status: 502 },
    );
  }
}
