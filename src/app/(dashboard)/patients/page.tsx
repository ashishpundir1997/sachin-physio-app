import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PatientsList } from "@/components/patients/patients-list";

// Cached (ISR): repeat visits are served instantly without re-querying.
// Invalidated immediately on any write via revalidateCrm().
export const revalidate = 120;

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { appointments: true, sessions: true, payments: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold brand-text-gradient">Patients</h1>
        <Link href="/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      <PatientsList patients={patients} />
    </div>
  );
}
