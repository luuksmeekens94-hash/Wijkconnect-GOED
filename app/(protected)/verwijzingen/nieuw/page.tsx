import { Theme } from "@prisma/client";
import { ReferralForm } from "@/components/referral-form";
import { createReferral, getFavoriteRecipients } from "@/lib/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewReferralPage({
  searchParams,
}: {
  searchParams: { recipient?: string };
}) {
  await requireRole(["VERWIJZER"]);

  const [recipients, favorites, resources] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SOCIAAL" },
      orderBy: [{ organization: "asc" }, { name: "asc" }],
    }),
    getFavoriteRecipients(),
    prisma.socialResource.findMany({
      include: { themes: true },
      orderBy: { organization: "asc" },
      take: 12,
    }),
  ]);

  return (
    <ReferralForm
      recipients={recipients.map((item) => ({ id: item.id, name: item.name, organization: item.organization, email: item.email }))}
      favorites={favorites.map((item) => ({ id: item.id, name: item.name, organization: item.organization, email: item.email }))}
      resources={resources.map((item) => ({
        id: item.id,
        name: item.name,
        organization: item.organization,
        themes: item.themes.map((theme) => theme.theme as Theme),
      }))}
      action={createReferral}
      preselectedRecipientId={searchParams.recipient}
    />
  );
}
