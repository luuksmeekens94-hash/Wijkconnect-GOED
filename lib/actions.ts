"use server";

import bcrypt from "bcryptjs";
import { ReferralStatus, ResourceSource, ResourceType, Role, Theme, Urgency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generateCaseId } from "@/lib/case-id";
import { favoriteRecipientEmails } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createReferralSchema = z.object({
  assignedToId: z.string().min(1),
  patientInitials: z.string().trim().min(2).max(4),
  patientBirthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
  patientGender: z.enum(["M", "V", "X"]).optional(),
  patientPhone: z.string().trim().max(30).optional(),
  urgency: z.nativeEnum(Urgency),
  note: z.string().trim().max(500).optional(),
  themes: z.array(z.nativeEnum(Theme)).min(1),
});

export async function createReferral(formData: FormData) {
  const user = await requireRole(["VERWIJZER"]);
  const parsed = createReferralSchema.safeParse({
    assignedToId: formData.get("assignedToId"),
    patientInitials: formData.get("patientInitials"),
    patientBirthYear: formData.get("patientBirthYear"),
    patientGender: formData.get("patientGender") || undefined,
    patientPhone: formData.get("patientPhone") || undefined,
    urgency: formData.get("urgency") || Urgency.NORMAL,
    note: formData.get("note") || undefined,
    themes: formData.getAll("themes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
  }

  const assignedTo = await prisma.user.findFirst({
    where: { id: parsed.data.assignedToId, role: Role.SOCIAAL },
  });

  if (!assignedTo) {
    throw new Error("Ontvanger niet gevonden");
  }

  const caseId = await generateCaseId();

  const referral = await prisma.referral.create({
    data: {
      caseId,
      createdById: user.id,
      assignedToId: assignedTo.id,
      patientInitials: parsed.data.patientInitials.toUpperCase(),
      patientBirthYear: parsed.data.patientBirthYear,
      patientGender: parsed.data.patientGender,
      patientPhone: parsed.data.patientPhone,
      urgency: parsed.data.urgency,
      note: parsed.data.note,
      themes: { create: parsed.data.themes.map((theme) => ({ theme })) },
      updates: {
        create: {
          updatedById: user.id,
          newStatus: ReferralStatus.SENT,
          note: "Verwijzing aangemaakt",
        },
      },
    },
  });

  await Promise.all([
    createNotification({
      userId: assignedTo.id,
      referralId: referral.id,
      title: "Nieuwe verwijzing",
      message: `${caseId} is toegewezen aan jou.`,
    }),
    writeAuditLog({
      userId: user.id,
      action: "REFERRAL_CREATED",
      entityType: "REFERRAL",
      entityId: referral.id,
      details: { caseId, assignedToId: assignedTo.id, themes: parsed.data.themes },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/verwijzingen/nieuw");
  revalidatePath("/meldingen");
  redirect(`/verwijzingen/${referral.id}`);
}

const updateReferralSchema = z.object({
  referralId: z.string().min(1),
  status: z.nativeEnum(ReferralStatus),
  feedback: z.string().trim().max(500).optional(),
  handlerName: z.string().trim().max(100).optional(),
});

export async function updateReferral(formData: FormData) {
  const user = await requireRole(["SOCIAAL", "ADMIN"]);
  const parsed = updateReferralSchema.safeParse({
    referralId: formData.get("referralId"),
    status: formData.get("status"),
    feedback: formData.get("feedback") || undefined,
    handlerName: formData.get("handlerName") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige statusupdate");
  }

  const referral = await prisma.referral.findUnique({
    where: { id: parsed.data.referralId },
    include: { createdBy: true },
  });

  if (!referral) {
    throw new Error("Verwijzing niet gevonden");
  }

  if (user.role === "SOCIAAL" && referral.assignedToId !== user.id) {
    throw new Error("Geen toegang tot deze verwijzing");
  }

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: parsed.data.status },
  });

  await Promise.all([
    prisma.referralUpdate.create({
      data: {
        referralId: referral.id,
        updatedById: user.id,
        previousStatus: referral.status,
        newStatus: parsed.data.status,
        note: parsed.data.feedback,
        handlerName: parsed.data.handlerName,
      },
    }),
    createNotification({
      userId: referral.createdById,
      referralId: referral.id,
      title: "Status bijgewerkt",
      message: `${referral.caseId} staat nu op ${parsed.data.status}.`,
    }),
    writeAuditLog({
      userId: user.id,
      action: "REFERRAL_STATUS_UPDATED",
      entityType: "REFERRAL",
      entityId: referral.id,
      details: {
        previousStatus: referral.status,
        newStatus: parsed.data.status,
        handlerName: parsed.data.handlerName,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/verwijzingen/${referral.id}`);
  revalidatePath("/meldingen");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireUser();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/meldingen");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/meldingen");
  revalidatePath("/dashboard");
}

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  organization: z.string().min(2),
  role: z.nativeEnum(Role),
  password: z.string().min(10).optional(),
});

export async function saveUser(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const parsed = userSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    organization: formData.get("organization"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige gebruiker");
  }

  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;

  if (parsed.data.id) {
    await prisma.user.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        organization: parsed.data.organization,
        role: parsed.data.role,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        organization: parsed.data.organization,
        role: parsed.data.role,
        passwordHash: passwordHash ?? (await bcrypt.hash("WijkConnect2026!", 10)),
      },
    });
  }

  await writeAuditLog({
    userId: admin.id,
    action: "USER_SAVED",
    entityType: "USER",
    entityId: parsed.data.id ?? parsed.data.email.toLowerCase(),
    details: { email: parsed.data.email.toLowerCase(), role: parsed.data.role },
  });

  revalidatePath("/admin/gebruikers");
}

const resourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(10).max(500),
  category: z.string().min(2),
  organization: z.string().min(2),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional(),
  address: z.string().max(120).optional(),
  stadsdeel: z.string().max(50).optional(),
  wijk: z.string().max(50).optional(),
  targetGroup: z.string().max(120).optional(),
  costs: z.string().max(80).optional(),
  referralNeeded: z.boolean(),
  type: z.nativeEnum(ResourceType),
  source: z.nativeEnum(ResourceSource),
  url: z.string().url().optional().or(z.literal("")),
  themes: z.array(z.nativeEnum(Theme)).min(1),
});

export async function saveResource(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const parsed = resourceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    organization: formData.get("organization"),
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    address: formData.get("address") || undefined,
    stadsdeel: formData.get("stadsdeel") || undefined,
    wijk: formData.get("wijk") || undefined,
    targetGroup: formData.get("targetGroup") || undefined,
    costs: formData.get("costs") || undefined,
    referralNeeded: formData.get("referralNeeded") === "on",
    type: formData.get("type"),
    source: formData.get("source"),
    url: formData.get("url") || undefined,
    themes: formData.getAll("themes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige resource");
  }

  const sharedData = {
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    organization: parsed.data.organization,
    contactEmail: parsed.data.contactEmail || null,
    contactPhone: parsed.data.contactPhone || null,
    address: parsed.data.address || null,
    stadsdeel: parsed.data.stadsdeel || null,
    wijk: parsed.data.wijk || null,
    targetGroup: parsed.data.targetGroup || null,
    costs: parsed.data.costs || null,
    referralNeeded: parsed.data.referralNeeded,
    type: parsed.data.type,
    source: parsed.data.source,
    url: parsed.data.url || null,
  };

  if (parsed.data.id) {
    await prisma.socialResource.update({
      where: { id: parsed.data.id },
      data: {
        ...sharedData,
        themes: { deleteMany: {}, create: parsed.data.themes.map((theme) => ({ theme })) },
      },
    });
  } else {
    await prisma.socialResource.create({
      data: {
        ...sharedData,
        themes: { create: parsed.data.themes.map((theme) => ({ theme })) },
      },
    });
  }

  await writeAuditLog({
    userId: admin.id,
    action: "RESOURCE_SAVED",
    entityType: "SOCIAL_RESOURCE",
    entityId: parsed.data.id ?? parsed.data.name,
    details: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/sociale-kaart");
  revalidatePath("/admin/sociale-kaart");
}

export async function getFavoriteRecipients() {
  return prisma.user.findMany({
    where: { email: { in: favoriteRecipientEmails } },
    orderBy: { name: "asc" },
  });
}
