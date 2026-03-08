import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie, clearAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { pin } = await request.json();

  if (pin === process.env.AUTH_PIN) {
    await setAuthCookie();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
