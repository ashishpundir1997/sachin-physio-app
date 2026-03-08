"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatientOption {
  id: string;
  name: string;
  phone: string;
}

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatient = searchParams.get("patientId") || "";
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState(preselectedPatient);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => res.json())
      .then(setPatients);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    const dateStr = form.get("date") as string;
    const timeStr = form.get("time") as string;
    const dateTime = new Date(`${dateStr}T${timeStr}`);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        dateTime: dateTime.toISOString(),
        duration: Number(form.get("duration")) || 30,
        notes: form.get("notes") || null,
      }),
    });

    if (res.ok) {
      toast.success("Appointment booked");
      router.push("/appointments");
      router.refresh();
    } else {
      toast.error("Failed to book appointment");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label>Patient *</Label>
        <Select value={patientId} onValueChange={(v) => setPatientId(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Select patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time *</Label>
          <Input id="time" name="time" type="time" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input id="duration" name="duration" type="number" defaultValue={30} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Any notes..." />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || !patientId}>
          {submitting ? "Booking..." : "Book Appointment"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function NewAppointmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Book Appointment</h1>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <NewAppointmentForm />
      </Suspense>
    </div>
  );
}
