"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CLINIC } from "@/lib/clinic";

// Brand colors taken from the PrimeMotion logo (navy "P" + green spine/"M").
const BRAND = {
  blue: "#1f3b5e",
  green: "#7cb342",
} as const;

interface LineItem {
  description: string;
  amount: string; // kept as string for editable inputs
}

function todayISO() {
  // Local YYYY-MM-DD for the date input default
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDateLong(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function InvoiceBuilder() {
  const params = useSearchParams();

  const initialDate = useMemo(() => {
    const d = params.get("date");
    if (d) {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const tz = parsed.getTimezoneOffset() * 60000;
        return new Date(parsed.getTime() - tz).toISOString().slice(0, 10);
      }
    }
    return todayISO();
  }, [params]);

  const [patientName, setPatientName] = useState(params.get("patient") ?? "");
  const [invoiceNo, setInvoiceNo] = useState(params.get("invoiceNo") ?? "");
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<LineItem[]>([
    {
      description: params.get("treatment") ?? "Physiotherapy session",
      amount: params.get("amount") ?? "",
    },
  ]);
  const [notes, setNotes] = useState(params.get("notes") ?? "");
  const [signatory, setSignatory] = useState(""); // optional label
  const [signature, setSignature] = useState<string>(""); // base64 data URL

  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it))
    );
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", amount: "" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignature(reader.result as string);
    reader.readAsDataURL(file);
  }

  // If a signatory label is entered, a signature image is required.
  const signatureMissing = signatory.trim() !== "" && !signature;

  function handlePrint() {
    if (signatureMissing) {
      alert(
        "You entered a signatory label, so please upload a signature image before saving the PDF."
      );
      return;
    }
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      {/* ===== Editing controls (hidden on print) ===== */}
      <div className="no-print mx-auto mb-6 max-w-[800px] rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Invoice details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Patient name</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient name"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Date</span>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">
              Invoice no. (optional)
            </span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-001"
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-sm text-muted-foreground">
            Service details
          </span>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  value={it.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="What was done (e.g. Lower back electrotherapy + exercises)"
                />
                <input
                  type="number"
                  className="w-32 rounded-md border px-3 py-2 text-sm"
                  value={it.amount}
                  onChange={(e) => updateItem(i, "amount", e.target.value)}
                  placeholder="Amount"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded-md border px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + Add line
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Notes (optional)</span>
          <textarea
            className="w-full rounded-md border px-3 py-2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid in cash. Thank you."
          />
        </label>

        {/* Signature (bottom-right of the invoice) */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">
              Signatory label (optional)
            </span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={signatory}
              onChange={(e) => setSignatory(e.target.value)}
              placeholder="e.g. Dr. Sachin / Authorised Signatory"
            />
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-muted-foreground">
              Signature image{" "}
              {signatory.trim()
                ? <span className="text-red-600">(required)</span>
                : "(optional)"}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="w-full rounded-md border px-3 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1"
              />
              {signature && (
                <button
                  type="button"
                  onClick={() => setSignature("")}
                  className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
            {signature && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature}
                alt="Signature preview"
                className="mt-2 h-12 object-contain"
              />
            )}
          </div>
        </div>

        {signatureMissing && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            You added a signatory label — please upload a signature image before
            saving the PDF.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={signatureMissing}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: in the print dialog choose “Save as PDF” as the destination.
        </p>
      </div>

      {/* ===== The printable invoice (full A4 page) ===== */}
      <div
        id="invoice-sheet"
        className="mx-auto flex min-h-[1120px] w-full max-w-[820px] flex-col overflow-hidden bg-white text-gray-800 shadow-lg print:m-0 print:min-h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
      >
        {/* Top accent band */}
        <div className="h-2 w-full" style={{ backgroundColor: BRAND.blue }} />

        {/* Header */}
        <div className="flex items-start justify-between px-12 pt-10">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CLINIC.logoPath}
              alt={CLINIC.name}
              className="h-24 w-24 rounded-full border-2 object-cover"
              style={{ borderColor: BRAND.green }}
            />
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: BRAND.blue }}>
                {CLINIC.name}
              </h1>
              <p className="mt-1 max-w-xs text-sm leading-snug text-gray-600">
                {CLINIC.address}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                Reg. No: {CLINIC.registrationNo}
              </p>
              {(CLINIC.phone || CLINIC.email) && (
                <p className="text-sm text-gray-600">
                  {[CLINIC.phone, CLINIC.email].filter(Boolean).join("  •  ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <h2
              className="text-4xl font-black tracking-widest"
              style={{ color: BRAND.green }}
            >
              INVOICE
            </h2>
          </div>
        </div>

        {/* Meta strip: invoice no / date / bill to */}
        <div className="mx-12 mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-gray-200 text-sm">
          <div className="bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Bill To</p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {patientName || "—"}
            </p>
          </div>
          <div className="bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Invoice No.
            </p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {invoiceNo || "—"}
            </p>
          </div>
          <div className="bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {formatDateLong(date)}
            </p>
          </div>
        </div>

        {/* Items table */}
        <div className="mx-12 mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: BRAND.blue }} className="text-left text-white">
                <th className="w-12 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Service Details</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="align-top even:bg-gray-50">
                  <td className="border-b border-gray-200 px-4 py-3 text-gray-500">
                    {i + 1}
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3">
                    {it.description || "—"}
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3 text-right tabular-nums">
                    {formatINR(parseFloat(it.amount) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Spacer pushes the totals & footer to the bottom of the page */}
        <div className="flex-1" />

        {/* Total Payment (bottom, right aligned) */}
        <div className="mx-12 flex justify-end">
          <div
            className="flex w-72 justify-between rounded-md px-4 py-3 text-base font-bold text-white"
            style={{ backgroundColor: BRAND.green }}
          >
            <span>Total Payment</span>
            <span className="tabular-nums">{formatINR(total)}</span>
          </div>
        </div>

        {/* Notes (under the total) */}
        {notes && (
          <div className="mx-12 mt-4 rounded-md bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Notes</p>
            <p className="mt-0.5 text-sm text-gray-700">{notes}</p>
          </div>
        )}

        {/* Signature (bottom right) */}
        <div className="mx-12 mb-8 mt-10 flex justify-end">
          <div className="text-center">
            <div className="flex h-12 w-52 items-end justify-center">
              {signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature}
                  alt="Signature"
                  className="max-h-12 object-contain"
                />
              )}
            </div>
            {signatory.trim() && (
              <p className="mt-1 text-sm text-gray-600">{signatory}</p>
            )}
          </div>
        </div>

        {/* Tagline (centered, just above the footer) */}
        <p
          className="mb-3 text-center text-base font-semibold italic"
          style={{ color: BRAND.blue }}
        >
          Every movement matters
        </p>

        {/* Footer band */}
        <div
          className="flex items-center justify-between px-12 py-4 text-sm text-white"
          style={{ backgroundColor: BRAND.blue }}
        >
          <span className="font-semibold">Thank you for choosing {CLINIC.shortName}!</span>
          <span className="text-white/80">{CLINIC.address}</span>
        </div>
      </div>

      {/* Print isolation */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          #invoice-sheet { box-shadow: none !important; }
          /* keep background colors when printing */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading invoice…</div>}>
      <InvoiceBuilder />
    </Suspense>
  );
}
