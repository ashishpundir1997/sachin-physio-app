import Link from "next/link";
import { format } from "date-fns";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarDays, IndianRupee, Bell, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PeriodToggle } from "@/components/dashboard/period-toggle";
import { unstable_cache } from "next/cache";

type Period = "today" | "week" | "month";

const periodLabels: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

// Cached per period under the "dashboard" tag — repeat visits skip the DB.
// revalidateCrm() busts this tag on any write, so it never goes stale.
const getDashboardData = unstable_cache(
  async (period: Period) => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (period === "week") {
      periodStart = startOfWeek(now, { weekStartsOn: 1 });
      periodEnd = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === "month") {
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
    } else {
      periodStart = startOfDay(now);
      periodEnd = endOfDay(now);
    }

    const [
    totalPatients,
    periodAppointments,
    periodCompleted,
    pendingPaymentsCount,
    upcomingFollowUpsCount,
    periodCollected,
    periodPending,
    appointments,
    pendingPayments,
    upcomingFollowUps,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({
      where: { dateTime: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.appointment.count({
      where: { dateTime: { gte: periodStart, lte: periodEnd }, status: "completed" },
    }),
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.followUp.count({
      where: { status: "pending", nextDate: { gte: startOfDay(now) } },
    }),
    prisma.payment.aggregate({
      where: { status: "paid", paymentDate: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "pending" },
      _sum: { amount: true },
    }),
    prisma.appointment.findMany({
      where: { dateTime: { gte: periodStart, lte: periodEnd } },
      orderBy: { dateTime: "asc" },
      include: { patient: { select: { id: true, name: true, phone: true } } },
      take: 15,
    }),
    prisma.payment.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true } },
        session: { select: { treatmentType: true } },
      },
      take: 10,
    }),
    prisma.followUp.findMany({
      where: { status: "pending", nextDate: { gte: startOfDay(now) } },
      orderBy: { nextDate: "asc" },
      include: { patient: { select: { id: true, name: true } } },
      take: 10,
    }),
    ]);

    return {
      stats: {
        totalPatients,
        periodAppointments,
        periodCompleted,
        pendingPaymentsCount,
        upcomingFollowUpsCount,
        periodCollected: periodCollected._sum.amount || 0,
        totalPending: periodPending._sum.amount || 0,
      },
      appointments,
      pendingPayments,
      upcomingFollowUps,
    };
  },
  ["dashboard-data"],
  { revalidate: 120, tags: ["dashboard"] }
);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: Period =
    periodParam === "week" || periodParam === "month" ? periodParam : "today";

  const { stats, appointments, pendingPayments, upcomingFollowUps } =
    await getDashboardData(period);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold brand-text-gradient">Dashboard</h1>
        <PeriodToggle period={period} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
              <Users className="h-5 w-5 text-teal-700 dark:text-teal-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-bold">{stats.totalPatients}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{periodLabels[period]} Appts</p>
              <p className="text-2xl font-bold">
                {stats.periodAppointments}
                {stats.periodCompleted > 0 && (
                  <span className="text-sm font-normal text-emerald-600 ml-1">
                    ({stats.periodCompleted} done)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{periodLabels[period]} Collected</p>
              <p className="text-2xl font-bold">₹{stats.periodCollected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">₹{stats.totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stats.pendingPaymentsCount} payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {periodLabels[period]}&apos;s Appointments
              </CardTitle>
              <Link href="/appointments">
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No appointments</p>
            ) : (
              appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Link
                      href={`/patients/${apt.patient.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {apt.patient.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.dateTime), period === "today" ? "p" : "EEE, MMM d 'at' p")} — {apt.duration} min
                    </p>
                  </div>
                  <Badge
                    variant={
                      apt.status === "completed"
                        ? "secondary"
                        : apt.status === "cancelled"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {apt.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Pending Payments
              </CardTitle>
              <Link href="/billing">
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">All payments collected!</p>
            ) : (
              pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Link
                      href={`/patients/${payment.patient.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {payment.patient.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {payment.session.treatmentType}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">
                    ₹{payment.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Upcoming Follow-ups ({stats.upcomingFollowUpsCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No upcoming follow-ups</p>
            ) : (
              upcomingFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Link
                      href={`/patients/${fu.patient.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fu.patient.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {fu.reason || "General follow-up"}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(fu.nextDate), "PP")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
