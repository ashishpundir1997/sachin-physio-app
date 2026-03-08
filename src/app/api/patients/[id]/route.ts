import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { dateTime: "desc" }, take: 20 },
      sessions: { orderBy: { date: "desc" }, take: 20, include: { payment: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
      followUps: { orderBy: { nextDate: "asc" } },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = patientSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: result.data,
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.patient.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
