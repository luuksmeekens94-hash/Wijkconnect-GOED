import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getExportContent, getExportFilename, parseDateRange, type ExportDataset, type ExportFormat } from "@/lib/export";
import { prisma } from "@/lib/prisma";

const allowedDatasets: ExportDataset[] = ["referrals", "referral-updates"];
const allowedFormats: ExportFormat[] = ["csv", "pdf"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Niet ingelogd", { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return new Response("Geen toegang", { status: 403 });
  }

  const { dataset: datasetParam } = await params;
  const dataset = datasetParam as ExportDataset;
  if (!allowedDatasets.includes(dataset)) {
    return new Response("Onbekende export", { status: 404 });
  }

  const format = (request.nextUrl.searchParams.get("format") ?? "csv") as ExportFormat;
  if (!allowedFormats.includes(format)) {
    return new Response("Onbekend formaat", { status: 400 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const range = parseDateRange(from, to);
  const exportFile = await getExportContent(dataset, format, range);
  const filename = getExportFilename(dataset, format);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EXPORT_DOWNLOADED",
      entityType: "EXPORT",
      entityId: dataset,
      details: { format, filename, from, to },
    },
  });

  return new Response(exportFile.body, {
    status: 200,
    headers: {
      "Content-Type": exportFile.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
