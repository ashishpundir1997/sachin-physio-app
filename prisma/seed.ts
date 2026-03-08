import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create sample patients
  const patient1 = await prisma.patient.create({
    data: {
      name: "Rajesh Kumar",
      phone: "9876543210",
      age: 45,
      gender: "male",
      address: "123, Main Road, Sector 5",
      condition: "Lower back pain",
      notes: "Chronic pain for 2 years. Desk job.",
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: "Priya Sharma",
      phone: "9876543211",
      age: 32,
      gender: "female",
      address: "456, Park Avenue",
      condition: "Frozen shoulder",
      notes: "Left shoulder. Post-injury rehab.",
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: "Amit Patel",
      phone: "9876543212",
      age: 58,
      gender: "male",
      condition: "Knee osteoarthritis",
      notes: "Both knees affected. Uses walking stick.",
    },
  });

  // Create appointments for today
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  const apt1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      dateTime: today,
      duration: 30,
      status: "scheduled",
      notes: "Regular session",
    },
  });

  const apt2Time = new Date(today);
  apt2Time.setHours(11, 0, 0, 0);
  const apt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      dateTime: apt2Time,
      duration: 45,
      status: "scheduled",
      notes: "Follow-up session",
    },
  });

  // Create a completed appointment with session and payment
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  const apt3 = await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      dateTime: yesterday,
      duration: 30,
      status: "completed",
    },
  });

  const session1 = await prisma.session.create({
    data: {
      patientId: patient3.id,
      appointmentId: apt3.id,
      treatmentType: "Manual therapy",
      bodyPart: "Knee",
      duration: 30,
      date: yesterday,
      notes: "Applied heat therapy and gentle exercises.",
    },
  });

  await prisma.payment.create({
    data: {
      patientId: patient3.id,
      sessionId: session1.id,
      amount: 500,
      status: "paid",
      paymentDate: yesterday,
      method: "cash",
    },
  });

  // Create a pending payment
  const apt4 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      dateTime: new Date(yesterday.getTime() + 3600000),
      duration: 30,
      status: "completed",
    },
  });

  const session2 = await prisma.session.create({
    data: {
      patientId: patient1.id,
      appointmentId: apt4.id,
      treatmentType: "Electrotherapy",
      bodyPart: "Lower back",
      duration: 30,
      date: yesterday,
    },
  });

  await prisma.payment.create({
    data: {
      patientId: patient1.id,
      sessionId: session2.id,
      amount: 600,
      status: "pending",
      method: "cash",
    },
  });

  // Create follow-ups
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.followUp.create({
    data: {
      patientId: patient2.id,
      nextDate: nextWeek,
      reason: "Check shoulder mobility progress",
      status: "pending",
    },
  });

  await prisma.followUp.create({
    data: {
      patientId: patient3.id,
      nextDate: new Date(today.getTime() + 3 * 86400000),
      reason: "Review knee exercises compliance",
      status: "pending",
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
