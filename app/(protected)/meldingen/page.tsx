import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Meldingen</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">In-app notificaties</h1>
          </div>
          <form action={markAllNotificationsRead}>
            <button type="submit" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
              Alles als gelezen markeren
            </button>
          </form>
        </div>
        <div className="mt-6 space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className={`rounded-3xl border p-5 ${notification.readAt ? "border-slate-100 bg-slate-50" : "border-sky-200 bg-sky-50"}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  {notification.referralId ? (
                    <Link href={`/verwijzingen/${notification.referralId}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                      Open casus
                    </Link>
                  ) : null}
                  {!notification.readAt ? (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                        Markeer gelezen
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-slate-500">Er zijn nog geen meldingen beschikbaar.</p> : null}
        </div>
      </section>
    </div>
  );
}
