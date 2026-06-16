import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { followUpSchema } from "@/lib/validators";
import { revalidateCrm } from "@/lib/revalidate";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = followUpSchema.partial().safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const followUp = await prisma.followUp.update({
    where: { id },
    data: result.data,
  });

  revalidateCrm();
  return NextResponse.json(followUp);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.followUp.delete({ where: { id } });
  revalidateCrm();
  return NextResponse.json({ success: true });
}
