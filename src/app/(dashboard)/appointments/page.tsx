import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  AppointmentsClient,
  type Appointment,
} from "@/components/appointments/appointments-client";

// Cached (ISR): repeat visits are served instantly without re-querying.
// Invalidated immediately on any write via revalidateCrm().
export const revalidate = 120;

export default async function AppointmentsPage() {
  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: { dateTime: { gte: startOfDay(now), lte: endOfDay(now) } },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { id: true, name: true, phone: true, photoUrl: true } },
      session: true,
    },
  });

  return (
    <AppointmentsClient initialAppointments={appointments as unknown as Appointment[]} />
  );
}
