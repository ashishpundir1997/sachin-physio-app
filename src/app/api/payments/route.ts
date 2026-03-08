import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { name: true, phone: true } },
      session: { select: { treatmentType: true, date: true } },
    },
  });

  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = paymentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const payment = await prisma.payment.create({ data: result.data });
  return NextResponse.json(payment, { status: 201 });
}
