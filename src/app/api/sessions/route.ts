import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  const sessions = await prisma.session.findMany({
    where: patientId ? { patientId } : undefined,
    orderBy: { date: "desc" },
    include: {
      patient: { select: { name: true } },
      appointment: { select: { status: true } },
      payment: true,
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = sessionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  // Create session and mark appointment as completed in a transaction
  const session = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({ data: result.data });
    await tx.appointment.update({
      where: { id: result.data.appointmentId },
      data: { status: "completed" },
    });
    return session;
  });

  return NextResponse.json(session, { status: 201 });
}
