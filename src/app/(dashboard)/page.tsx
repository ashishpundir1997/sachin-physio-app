"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  CalendarDays,
  IndianRupee,
  Bell,
  Clock,
  CheckCircle,
} from "lucide-react";

type Period = "today" | "week" | "month";

interface DashboardData {
  stats: {
    totalPatients: number;
    periodAppointments: number;
    periodCompleted: number;
    pendingPaymentsCount: number;
    upcomingFollowUpsCount: number;
    periodCollected: number;
    totalPending: number;
  };
  appointments: Array<{
    id: string;
    dateTime: string;
    duration: number;
    status: string;
    patient: { id: string; name: string; phone: string };
  }>;
  pendingPayments: Array<{
    id: string;
    amount: number;
    patient: { id: string; name: string };
    session: { treatmentType: string };
  }>;
  upcomingFollowUps: Array<{
    id: string;
    nextDate: string;
    reason: string | null;
    patient: { id: string; name: string };
  }>;
}

const periodLabels: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [period]);

  if (loading && !data) {
    return <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>;
  }

  if (!data) return null;

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              onClick={() => setPeriod(p)}
              className="text-xs px-3"
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-bold">{stats.totalPatients}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{periodLabels[period]} Appts</p>
              <p className="text-2xl font-bold">
                {stats.periodAppointments}
                {stats.periodCompleted > 0 && (
                  <span className="text-sm font-normal text-green-600 ml-1">
                    ({stats.periodCompleted} done)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{periodLabels[period]} Collected</p>
              <p className="text-2xl font-bold">₹{stats.periodCollected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
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
            {data.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No appointments</p>
            ) : (
              data.appointments.map((apt) => (
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
            {data.pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">All payments collected!</p>
            ) : (
              data.pendingPayments.map((payment) => (
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
                  <span className="text-sm font-semibold text-yellow-600">
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
            {data.upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No upcoming follow-ups</p>
            ) : (
              data.upcomingFollowUps.map((fu) => (
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
