import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appointmentSchema } from "@/lib/validators";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const view = searchParams.get("view") || "day";
  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};

  if (date) {
    const d = new Date(date);
    if (view === "month") {
      where.dateTime = {
        gte: startOfMonth(d),
        lte: endOfMonth(d),
      };
    } else if (view === "week") {
      where.dateTime = {
        gte: startOfWeek(d, { weekStartsOn: 1 }),
        lte: endOfWeek(d, { weekStartsOn: 1 }),
      };
    } else {
      where.dateTime = { gte: startOfDay(d), lte: endOfDay(d) };
    }
  }

  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { id: true, name: true, phone: true, photoUrl: true } },
      session: true,
    },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = appointmentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: result.data,
    include: { patient: { select: { name: true } } },
  });

  return NextResponse.json(appointment, { status: 201 });
}
