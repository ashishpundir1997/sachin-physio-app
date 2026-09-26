"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, ChevronLeft, ChevronRight, Clock, User, Play, Square } from "lucide-react";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  status: string;
  notes: string | null;
  patient: { id: string; name: string; phone: string; photoUrl: string | null };
  session: { id: string } | null;
}

type ViewMode = "day" | "week" | "month";

function statusColor(status: string) {
  switch (status) {
    case "scheduled": return "default";
    case "completed": return "secondary";
    case "cancelled": return "destructive";
    case "no-show": return "outline";
    default: return "default";
  }
}

export function AppointmentsClient({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("day");
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [sessionDialog, setSessionDialog] = useState<Appointment | null>(null);
  // Sessions currently running: appointment id -> start time
  const [runningSessions, setRunningSessions] = useState<Record<string, Date>>({});
  // Sessions ended (timer stopped) but not yet saved: appointment id -> times
  const [pendingSessions, setPendingSessions] = useState<
    Record<string, { start: Date; end: Date; minutes: number }>
  >({});
  const [durationInput, setDurationInput] = useState("30");
  const [tick, setTick] = useState(() => new Date());
  const didMount = useRef(false);

  function openSessionDialog(apt: Appointment) {
    const pending = pendingSessions[apt.id];
    setDurationInput(String(pending ? pending.minutes : apt.duration || 30));
    setSessionDialog(apt);
  }

  function closeSessionDialog() {
    setSessionDialog(null);
  }

  function handleStartSession(apt: Appointment) {
    setRunningSessions((prev) => ({ ...prev, [apt.id]: new Date() }));
  }

  function handleEndSession(apt: Appointment) {
    const start = runningSessions[apt.id];
    if (!start) return;
    const end = new Date();
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    setRunningSessions((prev) => {
      const next = { ...prev };
      delete next[apt.id];
      return next;
    });
    setPendingSessions((prev) => ({ ...prev, [apt.id]: { start, end, minutes } }));
    setDurationInput(String(minutes));
    setSessionDialog(apt);
  }

  // Live-tick elapsed timers while any session is running.
  useEffect(() => {
    if (Object.keys(runningSessions).length === 0) return;
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, [runningSessions]);

  function fetchAppointments(d: Date, v: ViewMode) {
    setLoading(true);
    const dateStr = format(d, "yyyy-MM-dd");
    fetch(`/api/appointments?date=${dateStr}&view=${v}`)
      .then((res) => res.json())
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    // Skip the initial fetch — today's day view was provided by the server.
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    fetchAppointments(date, view);
  }, [date, view]);

  function navigate(direction: "prev" | "next") {
    if (view === "day") setDate(direction === "prev" ? subDays(date, 1) : addDays(date, 1));
    else if (view === "week") setDate(direction === "prev" ? subWeeks(date, 1) : addWeeks(date, 1));
    else setDate(direction === "prev" ? subMonths(date, 1) : addMonths(date, 1));
  }

  function getDateLabel() {
    if (view === "day") return format(date, "EEEE, PPP");
    if (view === "week") {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} — ${format(end, "MMM d, yyyy")}`;
    }
    return format(date, "MMMM yyyy");
  }

  async function updateStatus(aptId: string, status: string) {
    const res = await fetch(`/api/appointments/${aptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Appointment marked as ${status}`);
      fetchAppointments(date, view);
    }
  }

  async function handleSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionDialog) return;
    const form = new FormData(e.currentTarget);
    const pending = pendingSessions[sessionDialog.id];

    const sessionRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: sessionDialog.patient.id,
        appointmentId: sessionDialog.id,
        treatmentType: form.get("treatmentType"),
        bodyPart: form.get("bodyPart") || null,
        notes: form.get("notes") || null,
        duration: Number(form.get("duration")) || sessionDialog.duration,
        date: sessionDialog.dateTime,
        startedAt: pending ? pending.start.toISOString() : null,
        endedAt: pending ? pending.end.toISOString() : null,
      }),
    });

    if (!sessionRes.ok) {
      toast.error("Failed to create session");
      return;
    }

    const session = await sessionRes.json();

    const amount = form.get("amount");
    if (amount && Number(amount) > 0) {
      const paymentStatus = form.get("paymentStatus") || "pending";
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: sessionDialog.patient.id,
          sessionId: session.id,
          amount: Number(amount),
          status: paymentStatus,
          paymentDate: paymentStatus === "paid" ? new Date().toISOString() : null,
          method: "cash",
        }),
      });
    }

    toast.success("Session recorded & appointment completed");
    setPendingSessions((prev) => {
      const next = { ...prev };
      delete next[sessionDialog.id];
      return next;
    });
    closeSessionDialog();
    fetchAppointments(date, view);
  }

  // Group appointments by day for week/month view
  function groupByDay(apts: Appointment[]) {
    const groups: Record<string, Appointment[]> = {};
    apts.forEach((apt) => {
      const key = format(new Date(apt.dateTime), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(apt);
    });
    return groups;
  }

  function renderAppointmentCard(apt: Appointment) {
    return (
      <Card key={apt.id}>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {apt.patient.photoUrl ? (
                  <img src={apt.patient.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <Link href={`/patients/${apt.patient.id}`} className="text-sm font-semibold hover:underline">
                  {apt.patient.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(apt.dateTime), "p")}
                  </span>
                  <span>{apt.duration} min</span>
                  {apt.notes && <span>— {apt.notes}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusColor(apt.status)}>{apt.status}</Badge>
              {apt.status === "scheduled" && (
                <>
                  {pendingSessions[apt.id] ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openSessionDialog(apt)}>
                      Complete Session ({pendingSessions[apt.id].minutes} min)
                    </Button>
                  ) : runningSessions[apt.id] ? (
                    <>
                      <span className="text-sm font-medium tabular-nums text-primary">
                        {formatElapsed(tick.getTime() - runningSessions[apt.id].getTime())}
                      </span>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleEndSession(apt)}>
                        <Square className="h-3 w-3" />
                        End Session
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleStartSession(apt)}>
                      <Play className="h-3 w-3" />
                      Start Session
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "no-show")}>
                    No Show
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold brand-text-gradient">Appointments</h1>
        <Link href="/appointments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </Link>
      </div>

      {/* View Toggle + Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "ghost"}
              onClick={() => setView(v)}
              className="capitalize text-xs px-3"
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">{getDateLabel()}</span>
          <Button variant="outline" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Appointment Count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Appointments */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No appointments for this {view}
        </div>
      ) : view === "day" ? (
        <div className="space-y-3">
          {appointments.map(renderAppointmentCard)}
        </div>
      ) : (
        // Week/Month grouped view
        <div className="space-y-6">
          {Object.entries(groupByDay(appointments))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dayKey, dayApts]) => (
              <div key={dayKey}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {format(new Date(dayKey), "EEEE, MMM d")}
                  <span className="ml-2 text-xs font-normal">({dayApts.length})</span>
                </h3>
                <div className="space-y-2 ml-2 border-l-2 border-gray-200 pl-4">
                  {dayApts.map(renderAppointmentCard)}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Session Dialog */}
      <Dialog open={!!sessionDialog} onOpenChange={(open) => !open && closeSessionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Session — {sessionDialog?.patient.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSession} className="space-y-4">
            {sessionDialog && pendingSessions[sessionDialog.id] && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Session timed</p>
                <p className="text-xs text-muted-foreground">
                  {format(pendingSessions[sessionDialog.id].start, "p")} –{" "}
                  {format(pendingSessions[sessionDialog.id].end, "p")} (
                  {pendingSessions[sessionDialog.id].minutes} min)
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="treatmentType">Treatment Type *</Label>
                <Input id="treatmentType" name="treatmentType" required placeholder="e.g., Manual therapy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyPart">Body Part</Label>
                <Input id="bodyPart" name="bodyPart" placeholder="e.g., Lower back" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-duration">Duration (min)</Label>
              <Input
                id="session-duration"
                name="duration"
                type="number"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
              />
              {sessionDialog && pendingSessions[sessionDialog.id] && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled from the session timer — adjust if needed.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-notes">Session Notes</Label>
              <Textarea id="session-notes" name="notes" rows={2} placeholder="Treatment notes..." />
            </div>
            <Separator />
            <h4 className="font-medium text-sm">Payment</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input id="amount" name="amount" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select name="paymentStatus" defaultValue="paid">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit">Save Session</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
