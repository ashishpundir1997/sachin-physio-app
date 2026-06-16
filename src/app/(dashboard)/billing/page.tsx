import { prisma } from "@/lib/prisma";
import { BillingClient, type Payment } from "@/components/billing/billing-client";

// Cached (ISR): repeat visits are served instantly without re-querying.
// Invalidated immediately on any write via revalidateCrm().
export const revalidate = 120;

export default async function BillingPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { name: true, phone: true } },
      session: { select: { treatmentType: true, date: true } },
    },
  });

  return <BillingClient initialPayments={payments as unknown as Payment[]} />;
}
