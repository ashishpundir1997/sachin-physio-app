import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Pinged by an external/cron scheduler to stop Neon's free-tier compute from
// suspending after ~5 min idle (which adds a ~1-2s cold start to the next request).
export async function GET(request: NextRequest) {
  // Optional shared-secret guard. If CRON_SECRET is set, require it so the
  // endpoint can't be hammered by random traffic. Vercel Cron sends it as
  // `Authorization: Bearer <CRON_SECRET>` automatically.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const fromQuery = request.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && fromQuery !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
