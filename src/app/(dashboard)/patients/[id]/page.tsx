"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Edit,
  Trash2,
  User,
  Phone,
  MapPin,
  Plus,
  CalendarDays,
  IndianRupee,
  Bell,
} from "lucide-react";

interface PatientDetail {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  address: string | null;
  photoUrl: string | null;
  condition: string | null;
  notes: string | null;
  createdAt: string;
  appointments: Array<{
    id: string;
    dateTime: string;
    duration: number;
    status: string;
    notes: string | null;
  }>;
  sessions: Array<{
    id: string;
    treatmentType: string;
    bodyPart: string | null;
    duration: number;
    date: string;
    notes: string | null;
    payment: { id: string; amount: number; status: string } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    paymentDate: string | null;
    method: string;
    notes: string | null;
  }>;
  followUps: Array<{
    id: string;
    nextDate: string;
    reason: string | null;
    notes: string | null;
    status: string;
  }>;
}

function statusColor(status: string) {
  switch (status) {
    case "scheduled":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "no-show":
      return "outline";
    case "paid":
      return "secondary";
    case "pending":
      return "default";
    default:
      return "default";
  }
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<{ id: string; treatmentType: string } | null>(null);

  function fetchPatient() {
    fetch(`/api/patients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPatient(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this patient and all their records?")) return;
    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Patient deleted");
      router.push("/patients");
    }
  }

  async function handleFollowUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: id,
        nextDate: form.get("nextDate"),
        reason: form.get("reason") || null,
        notes: form.get("notes") || null,
      }),
    });
    if (res.ok) {
      toast.success("Follow-up scheduled");
      setFollowUpOpen(false);
      fetchPatient();
    }
  }

  async function markFollowUp(fuId: string, status: string) {
    const res = await fetch(`/api/follow-ups/${fuId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Follow-up marked as ${status}`);
      fetchPatient();
    }
  }

  async function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentSession) return;
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const status = (form.get("paymentStatus") as string) || "paid";
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: id,
        sessionId: paymentSession.id,
        amount,
        status,
        paymentDate: status === "paid" ? new Date().toISOString() : null,
        method: "cash",
        notes: form.get("paymentNotes") || null,
      }),
    });
    if (res.ok) {
      toast.success("Payment added");
      setPaymentSession(null);
      fetchPatient();
    } else {
      toast.error("Failed to add payment");
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!patient) {
    return <div className="text-center py-12 text-muted-foreground">Patient not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {patient.photoUrl ? (
              <img
                src={patient.photoUrl}
                alt={patient.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {patient.phone}
              </span>
              {patient.age && <span>{patient.age} years</span>}
              {patient.gender && <span className="capitalize">{patient.gender}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/patients/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" className="gap-1" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {patient.address && (
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {patient.address}
            </CardContent>
          </Card>
        )}
        {patient.condition && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Condition</p>
              <p className="text-sm font-medium">{patient.condition}</p>
            </CardContent>
          </Card>
        )}
        {patient.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{patient.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments" className="gap-1">
            <CalendarDays className="h-3 w-3" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1">
            <IndianRupee className="h-3 w-3" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1">
            <Bell className="h-3 w-3" />
            Follow-ups
          </TabsTrigger>
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Appointments</h3>
            <Link href={`/appointments/new?patientId=${id}`}>
              <Button size="sm" className="gap-1">
                <Plus className="h-3 w-3" />
                Book
              </Button>
            </Link>
          </div>
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No appointments yet</p>
          ) : (
            <div className="space-y-2">
              {patient.appointments.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(apt.dateTime), "PPP 'at' p")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apt.duration} min{apt.notes ? ` — ${apt.notes}` : ""}
                      </p>
                    </div>
                    <Badge variant={statusColor(apt.status)}>{apt.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <h3 className="font-semibold">Treatment Sessions</h3>
          {patient.sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Sessions</p>
                  <p className="text-lg font-bold">{patient.sessions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{patient.sessions.reduce((sum, s) => sum + (s.payment?.status === "paid" ? s.payment.amount : 0), 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">
                    ₹{patient.sessions.reduce((sum, s) => sum + (s.payment?.status === "pending" ? s.payment.amount : 0), 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {patient.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No sessions yet</p>
          ) : (
            <div className="space-y-2">
              {patient.sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{session.treatmentType}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.date), "PPP")} — {session.duration} min
                          {session.bodyPart ? ` — ${session.bodyPart}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.payment ? (
                          <>
                            <Badge variant={statusColor(session.payment.status)}>
                              ₹{session.payment.amount} ({session.payment.status})
                            </Badge>
                            {session.payment.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const res = await fetch(`/api/payments/${session.payment!.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "paid", paymentDate: new Date().toISOString() }),
                                  });
                                  if (res.ok) {
                                    toast.success("Payment marked as paid");
                                    fetchPatient();
                                  }
                                }}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setPaymentSession({ id: session.id, treatmentType: session.treatmentType })}
                          >
                            <IndianRupee className="h-3 w-3" />
                            Add Payment
                          </Button>
                        )}
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{session.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Payment Dialog */}
          <Dialog open={!!paymentSession} onOpenChange={(open) => !open && setPaymentSession(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment — {paymentSession?.treatmentType}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Amount (₹) *</Label>
                  <Input id="pay-amount" name="amount" type="number" required placeholder="e.g., 500" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes</Label>
                  <Input id="paymentNotes" name="paymentNotes" placeholder="e.g., Partial payment" />
                </div>
                <Button type="submit">Save Payment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <h3 className="font-semibold">Payments</h3>
          {patient.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {patient.payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">₹{payment.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentDate
                          ? format(new Date(payment.paymentDate), "PPP")
                          : "Not paid yet"}
                        {payment.notes ? ` — ${payment.notes}` : ""}
                      </p>
                    </div>
                    <Badge variant={statusColor(payment.status)}>{payment.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Follow-ups</h3>
            <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
              <DialogTrigger
                render={<Button size="sm" className="gap-1" />}
              >
                <Plus className="h-3 w-3" />
                Schedule
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFollowUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nextDate">Date *</Label>
                    <Input id="nextDate" name="nextDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input id="reason" name="reason" placeholder="Reason for follow-up" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fu-notes">Notes</Label>
                    <Textarea id="fu-notes" name="notes" placeholder="Notes..." rows={2} />
                  </div>
                  <Button type="submit">Schedule</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {patient.followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No follow-ups scheduled</p>
          ) : (
            <div className="space-y-2">
              {patient.followUps.map((fu) => (
                <Card key={fu.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(fu.nextDate), "PPP")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fu.reason || "General follow-up"}
                          {fu.notes ? ` — ${fu.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColor(fu.status)}>{fu.status}</Badge>
                        {fu.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markFollowUp(fu.id, "completed")}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
