import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  age: z.number().int().positive().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  dateTime: z.coerce.date(),
  duration: z.coerce.number().int().positive().default(30),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).default("scheduled"),
  notes: z.string().optional().nullable(),
});

export const sessionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().min(1, "Appointment is required"),
  treatmentType: z.string().min(1, "Treatment type is required"),
  bodyPart: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  duration: z.coerce.number().int().positive(),
  date: z.coerce.date(),
});

export const paymentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  sessionId: z.string().min(1, "Session is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  status: z.enum(["pending", "paid"]).default("pending"),
  paymentDate: z.coerce.date().optional().nullable(),
  method: z.string().default("cash"),
  notes: z.string().optional().nullable(),
});

export const followUpSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  nextDate: z.coerce.date(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
});

export type PatientFormData = z.infer<typeof patientSchema>;
export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type SessionFormData = z.infer<typeof sessionSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type FollowUpFormData = z.infer<typeof followUpSchema>;
