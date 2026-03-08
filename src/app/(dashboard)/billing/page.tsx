"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  format,
  isToday,
  isThisWeek,
  isThisMonth,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndianRupee, CheckCircle, Clock, Calendar } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentDate: string | null;
  method: string;
  notes: string | null;
  createdAt: string;
  patient: { name: string; phone: string };
  session: { treatmentType: string; date: string };
}

type DateRange = "today" | "week" | "month" | "custom" | "all";

export default function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);

  function fetchPayments() {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    setLoading(true);
    fetch(`/api/payments?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Client-side date filtering
  const filtered = useMemo(() => {
    if (dateRange === "all") return payments;

    return payments.filter((p) => {
      const sessionDate = new Date(p.session.date);

      if (dateRange === "today") return isToday(sessionDate);
      if (dateRange === "week") return isThisWeek(sessionDate, { weekStartsOn: 1 });
      if (dateRange === "month") return isThisMonth(sessionDate);
      if (dateRange === "custom" && customFrom && customTo) {
        const from = startOfDay(new Date(customFrom));
        const to = endOfDay(new Date(customTo));
        return sessionDate >= from && sessionDate <= to;
      }
      return true;
    });
  }, [payments, dateRange, customFrom, customTo]);

  async function markPaid(paymentId: string) {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paymentDate: new Date().toISOString() }),
    });
    if (res.ok) {
      toast.success("Payment marked as paid");
      fetchPayments();
    }
  }

  const totalCollected = filtered
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filtered
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold">₹{totalCollected.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">₹{totalPending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">
                ₹{(totalCollected + totalPending).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Period</p>
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
            {([
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
              { value: "all", label: "All Time" },
              { value: "custom", label: "Custom" },
            ] as { value: DateRange; label: string }[]).map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={dateRange === opt.value ? "default" : "ghost"}
                onClick={() => setDateRange(opt.value)}
                className="text-xs px-3"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} payment{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No payments found</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.patient.name}</TableCell>
                    <TableCell>{payment.session.treatmentType}</TableCell>
                    <TableCell>{format(new Date(payment.session.date), "PP")}</TableCell>
                    <TableCell className="text-right">₹{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "paid" ? "secondary" : "default"}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(payment.id)}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
