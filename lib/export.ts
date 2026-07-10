import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { getStatusMeta, getThemeLabel, urgencyLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type CsvValue = string | number | boolean | null | undefined | Date;

export type ExportDataset = "referrals" | "referral-updates";
export type ExportFormat = "csv" | "pdf";
export type ExportRange = {
  from?: Date;
  to?: Date;
};

export function getExportFilename(dataset: ExportDataset, format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  return `wijkconnect-${dataset}-${date}.${format}`;
}

export function parseDateRange(from?: string | null, to?: string | null): ExportRange {
  const range: ExportRange = {};

  if (from) {
    const parsedFrom = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(parsedFrom.getTime())) {
      range.from = parsedFrom;
    }
  }

  if (to) {
    const parsedTo = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(parsedTo.getTime())) {
      range.to = parsedTo;
    }
  }

  return range;
}

function getCreatedAtFilter(range: ExportRange): Prisma.DateTimeFilter | undefined {
  if (!range.from && !range.to) {
    return undefined;
  }

  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

function normalizeCsvValue(value: CsvValue) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value);
  return /^[=+\-@]/.test(normalized.trimStart()) ? `'${normalized}` : normalized;
}

function escapeCsvValue(value: CsvValue) {
  const normalized = normalizeCsvValue(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function toCsv<Row extends Record<string, CsvValue>>(rows: Row[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function formatExportDate(value: Date) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function wrapText(text: string, maxChars = 95) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

async function buildPdf(title: string, sections: Array<{ heading: string; fields: Array<[string, string]> }>) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  let y = 805;
  const margin = 40;
  const contentWidth = 515;

  const addPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 805;
  };

  const drawLine = (text: string, x: number, fontSize = 10, isBold = false) => {
    if (y < 60) {
      addPage();
    }
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: isBold ? bold : font,
    });
    y -= fontSize + 4;
  };

  drawLine(title, margin, 18, true);
  drawLine(`Gegenereerd op ${formatExportDate(new Date())}`, margin, 10);
  y -= 8;

  for (const section of sections) {
    if (y < 120) {
      addPage();
    }

    page.drawRectangle({
      x: margin,
      y: y - 6,
      width: contentWidth,
      height: 22,
      opacity: 0.08,
    });
    drawLine(section.heading, margin + 8, 11, true);

    for (const [label, value] of section.fields) {
      const content = value || "Niet ingevuld";
      const wrapped = wrapText(`${label}: ${content}`);
      for (const line of wrapped) {
        drawLine(line, margin + 12, 10);
      }
    }

    y -= 8;
  }

  return Buffer.from(await pdf.save());
}

export async function getReferralExportRows(range: ExportRange = {}) {
  const createdAt = getCreatedAtFilter(range);
  const referrals = await prisma.referral.findMany({
    where: createdAt ? { createdAt } : undefined,
    include: {
      createdBy: true,
      assignedTo: true,
      themes: true,
      updates: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return referrals.map((referral) => ({
    case_id: referral.caseId,
    referral_id: referral.id,
    created_at: referral.createdAt,
    updated_at: referral.updatedAt,
    status: getStatusMeta(referral.status).label,
    urgency: urgencyLabels[referral.urgency],
    patient_initials: referral.patientInitials,
    patient_birth_year: referral.patientBirthYear,
    patient_gender: referral.patientGender ?? "",
    patient_phone: referral.patientPhone ?? "",
    themes: referral.themes.map((item) => getThemeLabel(item.theme)).join(" | "),
    note: referral.note ?? "",
    created_by_name: referral.createdBy.name,
    created_by_email: referral.createdBy.email,
    created_by_organization: referral.createdBy.organization,
    assigned_to_name: referral.assignedTo.name,
    assigned_to_email: referral.assignedTo.email,
    assigned_to_organization: referral.assignedTo.organization,
    total_updates: referral.updates.length,
  }));
}

export async function getReferralUpdateExportRows(range: ExportRange = {}) {
  const createdAt = getCreatedAtFilter(range);
  const updates = await prisma.referralUpdate.findMany({
    where: createdAt ? { createdAt } : undefined,
    include: {
      referral: {
        include: {
          createdBy: true,
          assignedTo: true,
          themes: true,
        },
      },
      updatedBy: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return updates.map((update) => ({
    update_id: update.id,
    created_at: update.createdAt,
    case_id: update.referral.caseId,
    referral_id: update.referral.id,
    previous_status: update.previousStatus ? getStatusMeta(update.previousStatus).label : "",
    new_status: getStatusMeta(update.newStatus).label,
    feedback: update.note ?? "",
    handler_name: update.handlerName ?? "",
    updated_by_name: update.updatedBy.name,
    updated_by_email: update.updatedBy.email,
    referral_created_by_name: update.referral.createdBy.name,
    referral_created_by_organization: update.referral.createdBy.organization,
    referral_assigned_to_name: update.referral.assignedTo.name,
    referral_assigned_to_organization: update.referral.assignedTo.organization,
    patient_initials: update.referral.patientInitials,
    patient_birth_year: update.referral.patientBirthYear,
    urgency: urgencyLabels[update.referral.urgency],
    themes: update.referral.themes.map((item) => getThemeLabel(item.theme)).join(" | "),
  }));
}

export async function getExportContent(dataset: ExportDataset, format: ExportFormat, range: ExportRange = {}) {
  if (dataset === "referrals") {
    const rows = await getReferralExportRows(range);
    if (format === "csv") {
      return {
        body: Buffer.from(toCsv(rows), "utf-8"),
        contentType: "text/csv; charset=utf-8",
      };
    }

    const pdf = await buildPdf(
      "WijkConnect export: verwijzingen",
      rows.map((row) => ({
        heading: `${row.case_id} • ${row.status}`,
        fields: [
          ["Aangemaakt", formatExportDate(row.created_at as Date)],
          ["Laatst bijgewerkt", formatExportDate(row.updated_at as Date)],
          ["Urgentie", String(row.urgency)],
          ["Patient", `${row.patient_initials} (${row.patient_birth_year})`],
          ["Geslacht", String(row.patient_gender)],
          ["Telefoon", String(row.patient_phone)],
          ["Thema's", String(row.themes)],
          ["Toelichting", String(row.note)],
          ["Verwijzer", `${row.created_by_name} • ${row.created_by_organization}`],
          ["Ontvanger", `${row.assigned_to_name} • ${row.assigned_to_organization}`],
          ["Aantal terugkoppelingen", String(row.total_updates)],
        ],
      })),
    );

    return {
      body: pdf,
      contentType: "application/pdf",
    };
  }

  const rows = await getReferralUpdateExportRows(range);
  if (format === "csv") {
    return {
      body: Buffer.from(toCsv(rows), "utf-8"),
      contentType: "text/csv; charset=utf-8",
    };
  }

  const pdf = await buildPdf(
    "WijkConnect export: terugkoppelingen",
    rows.map((row) => ({
      heading: `${row.case_id} • ${row.new_status}`,
      fields: [
        ["Bijgewerkt op", formatExportDate(row.created_at as Date)],
        ["Vorige status", String(row.previous_status)],
        ["Nieuwe status", String(row.new_status)],
        ["Terugkoppeling", String(row.feedback)],
        ["Behandelaar", String(row.handler_name)],
        ["Bijgewerkt door", `${row.updated_by_name} • ${row.updated_by_email}`],
        ["Verwijzer", `${row.referral_created_by_name} • ${row.referral_created_by_organization}`],
        ["Ontvanger", `${row.referral_assigned_to_name} • ${row.referral_assigned_to_organization}`],
        ["Patient", `${row.patient_initials} (${row.patient_birth_year})`],
        ["Urgentie", String(row.urgency)],
        ["Thema's", String(row.themes)],
      ],
    })),
  );

  return {
    body: pdf,
    contentType: "application/pdf",
  };
}
