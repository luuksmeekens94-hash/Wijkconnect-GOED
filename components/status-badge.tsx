import { ReferralStatus } from "@prisma/client";
import { getStatusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ReferralStatus }) {
  const meta = getStatusMeta(status);
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", meta.tone)}>{meta.label}</span>;
}
