"use server";

import {
  MonitoringAppointmentStatus,
  MonitoringProgram,
  PatientJourneyDiscipline,
  PatientJourneyOutcome,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  journeyOutcomeNeedsDestination,
  journeyOutcomeToMonitoringOutcome,
  patientJourneyOutcomeAllowed,
} from "@/lib/patient-journey";
import { prisma } from "@/lib/prisma";

const journeyUpdateSchema = z.object({
  caseId: z.string().min(1),
  discipline: z.nativeEnum(PatientJourneyDiscipline),
  outcome: z.nativeEnum(PatientJourneyOutcome),
  destination: z.string().trim().max(160).optional(),
  note: z.string().trim().max(500).optional(),
  occurredAt: z.string().date(),
});

function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Ongeldige datum");
  return parsed;
}

export async function savePatientJourneyUpdate(formData: FormData) {
  const user = await requireRole(["ADMIN", "PHYSIOTHERAPIST", "SOCIAAL"]);
  const parsed = journeyUpdateSchema.safeParse({
    caseId: formData.get("caseId"),
    discipline: formData.get("discipline"),
    outcome: formData.get("outcome"),
    destination: formData.get("destination") || undefined,
    note: formData.get("note") || undefined,
    occurredAt: formData.get("occurredAt"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ongeldige patiëntreisupdate");

  const expectedDiscipline = user.role === "PHYSIOTHERAPIST"
    ? PatientJourneyDiscipline.PHYSIOTHERAPY
    : user.role === "SOCIAAL"
      ? PatientJourneyDiscipline.SOCIAL
      : parsed.data.discipline;
  if (parsed.data.discipline !== expectedDiscipline) throw new Error("Deze update past niet bij je accountrol");
  if (!patientJourneyOutcomeAllowed(expectedDiscipline, parsed.data.outcome)) {
    throw new Error("Deze vervolgstap past niet bij het gekozen spreekuur");
  }
  if (journeyOutcomeNeedsDestination(parsed.data.outcome) && !parsed.data.destination) {
    throw new Error("Vul in naar welke praktijk, instantie of professional de patiënt gaat");
  }

  const monitoringCase = await prisma.monitoringCase.findUnique({
    where: { id: parsed.data.caseId },
    include: {
      appointments: {
        where: { status: MonitoringAppointmentStatus.ATTENDED },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });
  if (!monitoringCase || monitoringCase.appointments.length === 0) {
    throw new Error("Deze patiënt heeft geen bezocht spreekuur om op terug te koppelen");
  }
  const expectedProgram = expectedDiscipline === PatientJourneyDiscipline.PHYSIOTHERAPY
    ? MonitoringProgram.MOVEMENT
    : MonitoringProgram.SOCIAL;
  if (monitoringCase.program !== expectedProgram) {
    throw new Error("Deze patiënt hoort bij een andere professionele omgeving");
  }

  const occurredAt = parseDateOnly(parsed.data.occurredAt);
  if (occurredAt < monitoringCase.appointments[0].scheduledAt) {
    throw new Error("De vervolgstap kan niet vóór het spreekuur plaatsvinden");
  }
  if (parsed.data.occurredAt > new Date().toISOString().slice(0, 10)) {
    throw new Error("De datum van de vervolgstap kan niet in de toekomst liggen");
  }

  const update = await prisma.$transaction(async (transaction) => {
    const created = await transaction.patientJourneyUpdate.create({
      data: {
        caseId: monitoringCase.id,
        discipline: expectedDiscipline,
        outcome: parsed.data.outcome,
        destination: parsed.data.destination,
        note: parsed.data.note,
        occurredAt,
        recordedById: user.id,
      },
    });
    await transaction.monitoringAppointment.update({
      where: { id: monitoringCase.appointments.at(-1)!.id },
      data: { outcome: journeyOutcomeToMonitoringOutcome(expectedDiscipline, parsed.data.outcome) },
    });
    return created;
  });

  await writeAuditLog({
    userId: user.id,
    action: "PATIENT_JOURNEY_UPDATED",
    entityType: "MONITORING_CASE",
    entityId: monitoringCase.id,
    details: {
      updateId: update.id,
      discipline: expectedDiscipline,
      outcome: parsed.data.outcome,
      hasDestination: Boolean(parsed.data.destination),
      hasNote: Boolean(parsed.data.note),
    },
  });

  revalidatePath("/patientreizen");
  revalidatePath("/monitoring/weekinvoer");
  revalidatePath("/monitoring/rapportages");
  redirect("/patientreizen?saved=1&status=pending");
}
