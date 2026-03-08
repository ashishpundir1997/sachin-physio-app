import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const patients = await prisma.patient.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { appointments: true, sessions: true, payments: true },
      },
    },
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = patientSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const patient = await prisma.patient.create({ data: result.data });
  return NextResponse.json(patient, { status: 201 });
}
