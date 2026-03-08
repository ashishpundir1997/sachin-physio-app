import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today";

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
    appointmentsList,
    pendingPaymentsList,
    upcomingFollowUpsList,
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

  return NextResponse.json({
    stats: {
      totalPatients,
      periodAppointments,
      periodCompleted,
      pendingPaymentsCount,
      upcomingFollowUpsCount,
      periodCollected: periodCollected._sum.amount || 0,
      totalPending: periodPending._sum.amount || 0,
    },
    appointments: appointmentsList,
    pendingPayments: pendingPaymentsList,
    upcomingFollowUps: upcomingFollowUpsList,
  });
}
