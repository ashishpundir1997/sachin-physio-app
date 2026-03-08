import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { followUpSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: { nextDate: "asc" },
    include: {
      patient: { select: { name: true, phone: true } },
    },
  });

  return NextResponse.json(followUps);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = followUpSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const followUp = await prisma.followUp.create({ data: result.data });
  return NextResponse.json(followUp, { status: 201 });
}
