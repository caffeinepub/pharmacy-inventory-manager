import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  IndianRupee,
  Plus,
  Printer,
  TrendingDown,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import type {
  CreditNote,
  FirmSettings,
  Invoice,
  LedgerSummary,
  PaymentRecord,
} from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  useGetAllDoctors,
  useGetAllInvoices,
  useGetDoctorCreditNotes,
} from "../hooks/useQueries";
import { downloadElementAsJpeg } from "../utils/invoiceDownload";

// ─── Hooks ───────────────────────────────────────────────────────

function useGetDoctorLedgerSummary(doctorName: string) {
  const { actor, isFetching } = useActor();
  return useQuery<LedgerSummary>({
    queryKey: ["ledgerSummary", doctorName],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDoctorLedgerSummary(doctorName);
    },
    enabled: !!actor && !isFetching && !!doctorName,
  });
}

function useGetInvoicePayments(invoiceNumber: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentRecord[]>({
    queryKey: ["invoicePayments", invoiceNumber?.toString()],
    queryFn: async () => {
      if (!actor || invoiceNumber === null) return [];
      return actor.getInvoicePayments(invoiceNumber);
    },
    enabled: !!actor && !isFetching && invoiceNumber !== null,
  });
}

/** Fetches all payments for a list of invoice numbers using Promise.all */
function useGetAllPaymentsForDoctor(invoiceNumbers: bigint[]) {
  const { actor, isFetching } = useActor();
  return useQuery<Record<string, PaymentRecord[]>>({
    queryKey: ["allPaymentsForDoctor", invoiceNumbers.map(String).join(",")],
    queryFn: async () => {
      if (!actor) return {};
      const results = await Promise.all(
        invoiceNumbers.map((num) => actor.getInvoicePayments(num)),
      );
      const map: Record<string, PaymentRecord[]> = {};
      invoiceNumbers.forEach((num, idx) => {
        map[num.toString()] = results[idx];
      });
      return map;
    },
    enabled: !!actor && !isFetching && invoiceNumbers.length > 0,
  });
}

function useGetFirmSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<FirmSettings>({
    queryKey: ["firmSettings"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getFirmSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

function useRecordPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      invoiceNumber: bigint;
      amount: bigint;
      paymentDate: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.recordPayment(
        params.invoiceNumber,
        params.amount,
        params.paymentDate,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["invoicePayments", variables.invoiceNumber.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
      queryClient.invalidateQueries({ queryKey: ["allPaymentsForDoctor"] });
    },
  });
}

// ─── Types ──────────────────────────────────────────────────────────

interface DoctorSummary {
  doctorName: string;
  invoices: Invoice[];
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
}

// cn helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── LedgerPrintView ──────────────────────────────────────────────────
// Uses ONLY inline styles with hex colors — no Tailwind, no oklch — for html2canvas

interface LedgerPrintViewProps {
  doctorName: string;
  invoices: Invoice[];
  allPayments: Record<string, PaymentRecord[]>;
  firmName: string;
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
}

const thStyle: React.CSSProperties = {
  border: "1px solid black",
  padding: "5px 8px",
  textAlign: "left",
  backgroundColor: "#e5e7eb",
  color: "black",
  fontWeight: 700,
  fontSize: "11px",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #cccccc",
  padding: "5px 8px",
  color: "black",
  fontSize: "11px",
  verticalAlign: "middle",
};

function LedgerPrintView({
  doctorName,
  invoices,
  allPayments,
  firmName,
  totalCredit,
  totalPaid,
  outstanding,
}: LedgerPrintViewProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sortedInvoices = [...invoices].sort(
    (a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber),
  );

  return (
    <div
      className="ledger-print-container"
      style={{
        width: "794px",
        background: "white",
        color: "black",
        padding: "32px",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid black",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "black",
            margin: 0,
          }}
        >
          {firmName}
        </h1>
        <h2
          style={{
            fontSize: "14px",
            color: "black",
            margin: "4px 0 0",
            fontWeight: 600,
          }}
        >
          Ledger Statement
        </h2>
        <p
          style={{
            fontSize: "11px",
            color: "#333333",
            margin: "4px 0 0",
          }}
        >
          Doctor: <strong>{doctorName}</strong> &nbsp;|&nbsp; Date: {today}
        </p>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            flex: 1,
            border: "1px solid #333333",
            borderRadius: "6px",
            padding: "10px",
            textAlign: "center",
            background: "white",
          }}
        >
          <div style={{ fontSize: "10px", color: "#555555" }}>Total Credit</div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "black",
            }}
          >
            ₹{totalCredit.toLocaleString("en-IN")}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            border: "1px solid #16a34a",
            borderRadius: "6px",
            padding: "10px",
            textAlign: "center",
            background: "white",
          }}
        >
          <div style={{ fontSize: "10px", color: "#555555" }}>Total Paid</div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#16a34a",
            }}
          >
            ₹{totalPaid.toLocaleString("en-IN")}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            border: outstanding > 0 ? "1px solid #dc2626" : "1px solid #16a34a",
            borderRadius: "6px",
            padding: "10px",
            textAlign: "center",
            background: "white",
          }}
        >
          <div style={{ fontSize: "10px", color: "#555555" }}>Outstanding</div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: outstanding > 0 ? "#dc2626" : "#16a34a",
            }}
          >
            ₹{outstanding.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#e5e7eb" }}>
            <th style={thStyle}>Invoice #</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Payment Type</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Grand Total</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Due</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedInvoices.map((inv) => {
            const invNum = Number(inv.invoiceNumber);
            const payments = allPayments[invNum.toString()] || [];
            const isCredit = inv.paymentType === "credit";
            const amountDue = Number(inv.amountDue);
            const status =
              amountDue <= 0 ? "Paid" : isCredit ? "Credit" : "Cash";
            const statusColor =
              amountDue <= 0 ? "#16a34a" : isCredit ? "#d97706" : "#2563eb";

            return (
              <React.Fragment key={invNum}>
                <tr style={{ borderBottom: "1px solid #cccccc" }}>
                  <td style={tdStyle}>
                    #{inv.invoiceNumber.toString().padStart(6, "0")}
                  </td>
                  <td style={tdStyle}>
                    {new Date(
                      Number(inv.timestamp) / 1_000_000,
                    ).toLocaleDateString("en-IN")}
                  </td>
                  <td style={tdStyle}>{isCredit ? "Credit" : "Cash"}</td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    ₹{Number(inv.grandTotal).toLocaleString("en-IN")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    ₹{Number(inv.amountPaid).toLocaleString("en-IN")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: amountDue > 0 ? "#dc2626" : "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    ₹{amountDue.toLocaleString("en-IN")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: statusColor,
                      fontWeight: 700,
                    }}
                  >
                    {status}
                  </td>
                </tr>
                {/* Payment history sub-rows */}
                {payments.map((p) => (
                  <tr
                    key={`pay-${invNum}-${Number(p.timestamp)}`}
                    style={{ backgroundColor: "#f9fafb" }}
                  >
                    <td
                      colSpan={3}
                      style={{
                        ...tdStyle,
                        paddingLeft: "24px",
                        color: "#555555",
                        fontSize: "10px",
                        fontStyle: "italic",
                      }}
                    >
                      ↳ Payment on {p.paymentDate}
                    </td>
                    <td
                      colSpan={4}
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        color: "#16a34a",
                        fontSize: "10px",
                        fontWeight: 600,
                      }}
                    >
                      +₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr
            style={{
              backgroundColor: "#e5e7eb",
              borderTop: "2px solid black",
            }}
          >
            <td
              colSpan={3}
              style={{
                ...tdStyle,
                fontWeight: 700,
                fontSize: "12px",
                textAlign: "right",
                backgroundColor: "#e5e7eb",
              }}
            >
              Totals:
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                backgroundColor: "#e5e7eb",
              }}
            >
              ₹{totalCredit.toLocaleString("en-IN")}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                color: "#16a34a",
                backgroundColor: "#e5e7eb",
              }}
            >
              ₹{totalPaid.toLocaleString("en-IN")}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                color: outstanding > 0 ? "#dc2626" : "#16a34a",
                backgroundColor: "#e5e7eb",
              }}
            >
              ₹{outstanding.toLocaleString("en-IN")}
            </td>
            <td style={{ ...tdStyle, backgroundColor: "#e5e7eb" }}>&nbsp;</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: "1px solid #cccccc",
          textAlign: "center",
          fontSize: "10px",
          color: "#555555",
        }}
      >
        Generated on {today} — This is a computer-generated ledger statement.
      </div>
    </div>
  );
}

// ─── SummaryCard ───────────────────────────────────────────────────────────

function SummaryCard({
  title,
  amount,
  variant = "default",
  icon: Icon,
}: {
  title: string;
  amount: number;
  variant?: "default" | "paid" | "outstanding";
  icon: React.ElementType;
}) {
  return (
    <Card
      className={cn(
        variant === "outstanding" && amount > 0
          ? "border-destructive/30 bg-destructive/5"
          : variant === "paid"
            ? "border-green-500/30 bg-green-500/5"
            : "",
      )}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              variant === "outstanding" && amount > 0
                ? "bg-destructive/10"
                : variant === "paid"
                  ? "bg-green-500/10"
                  : "bg-primary/10",
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                variant === "outstanding" && amount > 0
                  ? "text-destructive"
                  : variant === "paid"
                    ? "text-green-600"
                    : "text-primary",
              )}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p
              className={cn(
                "text-lg font-bold",
                variant === "outstanding" && amount > 0
                  ? "text-destructive"
                  : variant === "paid"
                    ? "text-green-600"
                    : "text-foreground",
              )}
            >
              ₹{amount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Doctor List View ───────────────────────────────────────────────────

function DoctorListView({
  summaries,
  onSelectDoctor,
}: {
  summaries: DoctorSummary[];
  onSelectDoctor: (name: string) => void;
}) {
  return (
    <div className="space-y-3">
      {summaries.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Ledger Entries</h3>
            <p className="text-muted-foreground">
              Create invoices in the Billing section to see ledger entries here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Doctor</TableHead>
                <TableHead className="text-right font-semibold">
                  Total Credit
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Total Paid
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Outstanding
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow
                  key={s.doctorName}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onSelectDoctor(s.doctorName)}
                  data-ocid="ledger.item.1"
                >
                  <TableCell className="font-medium">{s.doctorName}</TableCell>
                  <TableCell className="text-right">
                    ₹{s.totalCredit.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    ₹{s.totalPaid.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-bold",
                        s.outstanding > 0
                          ? "text-destructive"
                          : "text-green-600",
                      )}
                    >
                      ₹{s.outstanding.toLocaleString("en-IN")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid="ledger.secondary_button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDoctor(s.doctorName);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Payment Dialog ───────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  invoiceNumber,
  maxAmount,
  onClose,
}: {
  open: boolean;
  invoiceNumber: bigint | null;
  maxAmount: number;
  onClose: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const recordPayment = useRecordPayment();

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber) return;

    const amountVal = amountRef.current?.value;
    const dateVal = dateRef.current?.value;

    if (!amountVal || Number(amountVal) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(amountVal) > maxAmount) {
      toast.error(`Amount cannot exceed outstanding balance of ₹${maxAmount}`);
      return;
    }

    if (!dateVal) {
      toast.error("Please enter a payment date");
      return;
    }

    try {
      await recordPayment.mutateAsync({
        invoiceNumber,
        amount: BigInt(Math.round(Number(amountVal))),
        paymentDate: dateVal,
      });
      toast.success("Payment recorded successfully");
      onClose();
    } catch (error) {
      toast.error(`Failed to record payment: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-ocid="payment.dialog">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Invoice #{invoiceNumber?.toString().padStart(6, "0")} — Outstanding:
            ₹{maxAmount.toLocaleString("en-IN")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
            <Input
              id="paymentAmount"
              ref={amountRef}
              type="number"
              min="1"
              max={maxAmount}
              defaultValue=""
              placeholder={`Max ₹${maxAmount}`}
              data-ocid="payment.input"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              ref={dateRef}
              type="date"
              defaultValue={today}
              data-ocid="payment.input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="payment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPayment.isPending}
              data-ocid="payment.submit_button"
            >
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice Row ─────────────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onRecordPayment,
}: {
  invoice: Invoice;
  onRecordPayment: () => void;
}) {
  const [showPayments, setShowPayments] = useState(false);
  const { data: payments = [] } = useGetInvoicePayments(
    showPayments ? invoice.invoiceNumber : null,
  );

  const isCredit = invoice.paymentType === "credit";
  const amountDue = Number(invoice.amountDue);
  const amountPaid = Number(invoice.amountPaid);

  return (
    <>
      <TableRow>
        <TableCell className="font-mono font-medium">
          #{invoice.invoiceNumber.toString().padStart(6, "0")}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              isCredit
                ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                : "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
            )}
          >
            {isCredit ? "Credit" : "Cash"}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-semibold">
          ₹{Number(invoice.grandTotal).toLocaleString("en-IN")}
        </TableCell>
        <TableCell className="text-right text-green-600 font-medium">
          ₹{amountPaid.toLocaleString("en-IN")}
        </TableCell>
        <TableCell className="text-right">
          <span
            className={cn(
              "font-bold",
              amountDue > 0 ? "text-destructive" : "text-green-600",
            )}
          >
            ₹{amountDue.toLocaleString("en-IN")}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            {payments.length > 0 || showPayments ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPayments(!showPayments)}
                className="text-xs gap-1"
                data-ocid="ledger.toggle"
              >
                <Calendar className="w-3 h-3" />
                {showPayments ? "Hide" : `History (${payments.length})`}
              </Button>
            ) : null}
            {isCredit && amountDue > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRecordPayment}
                className="gap-1 text-xs"
                data-ocid="ledger.primary_button"
              >
                <Plus className="w-3 h-3" />
                Pay
              </Button>
            )}
            {!showPayments &&
              payments.length === 0 &&
              isCredit &&
              amountDue === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayments(!showPayments)}
                  className="text-xs gap-1"
                  data-ocid="ledger.toggle"
                >
                  <Calendar className="w-3 h-3" />
                  History
                </Button>
              )}
          </div>
        </TableCell>
      </TableRow>

      {/* Payment History Inline */}
      {showPayments && payments.length > 0 && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={6} className="py-2 px-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Payment History
              </p>
              {payments.map((payment, idx) => (
                <div
                  key={`payment-${Number(payment.invoiceNumber)}-${idx}`}
                  className="flex justify-between text-sm bg-background rounded-lg px-3 py-1.5 border border-border"
                >
                  <span className="text-muted-foreground">
                    {payment.paymentDate}
                  </span>
                  <span className="font-medium text-green-600">
                    +₹{Number(payment.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}

      {showPayments && payments.length === 0 && (
        <TableRow className="bg-muted/20">
          <TableCell
            colSpan={6}
            className="py-2 px-4 text-center text-sm text-muted-foreground"
          >
            No payments recorded yet
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Credit Notes Section (ंin Doctor Detail) ──────────────────────────────────

function statusLabel(status: string): string {
  if (status === "apply_to_balance") return "Applied to Balance";
  if (status === "refund") return "Refund";
  if (status === "carry_forward") return "Carried Forward";
  return status;
}

function statusColor(status: string): string {
  if (status === "apply_to_balance") return "text-blue-600";
  if (status === "refund") return "text-green-600";
  if (status === "carry_forward") return "text-orange-600";
  return "text-foreground";
}

function DoctorCreditNotesCard({ doctorName }: { doctorName: string }) {
  const { data: creditNotes = [], isLoading } =
    useGetDoctorCreditNotes(doctorName);

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (creditNotes.length === 0) return null;

  const totalCredited = creditNotes.reduce(
    (sum, cn) => sum + Number(cn.grandTotal),
    0,
  );
  const carryForwardBalance = creditNotes
    .filter((cn) => cn.status === "carry_forward")
    .reduce((sum, cn) => sum + Number(cn.grandTotal), 0);

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="text-red-600">Credit Notes</span>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              Total Credited:{" "}
              <strong className="text-red-600">
                ₹{totalCredited.toLocaleString("en-IN")}
              </strong>
            </span>
            {carryForwardBalance > 0 && (
              <span className="text-orange-600 font-semibold">
                Carry Forward: ₹{carryForwardBalance.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-red-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-red-50">
                <TableHead className="font-semibold text-xs">CN #</TableHead>
                <TableHead className="font-semibold text-xs">
                  Invoice Ref
                </TableHead>
                <TableHead className="text-right font-semibold text-xs">
                  Amount
                </TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs">Reason</TableHead>
                <TableHead className="font-semibold text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes
                .slice()
                .sort(
                  (a, b) =>
                    Number(b.creditNoteNumber) - Number(a.creditNoteNumber),
                )
                .map((creditNote) => (
                  <TableRow key={Number(creditNote.creditNoteNumber)}>
                    <TableCell className="font-mono text-xs text-red-600">
                      CN-
                      {creditNote.creditNoteNumber.toString().padStart(6, "0")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      INV-
                      {creditNote.linkedInvoiceNumber
                        .toString()
                        .padStart(6, "0")}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-red-600">
                      ₹{Number(creditNote.grandTotal).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell
                      className={`text-xs font-medium ${statusColor(creditNote.status)}`}
                    >
                      {statusLabel(creditNote.status)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[120px] truncate"
                      title={creditNote.reason}
                    >
                      {creditNote.reason}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(
                        Number(creditNote.timestamp) / 1_000_000,
                      ).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Doctor Detail View ───────────────────────────────────────────────────────

function DoctorDetailView({
  doctorName,
  invoices,
  onBack,
}: {
  doctorName: string;
  invoices: Invoice[];
  onBack: () => void;
}) {
  const [paymentDialogInvoice, setPaymentDialogInvoice] =
    useState<Invoice | null>(null);
  const { data: summary, isLoading: summaryLoading } =
    useGetDoctorLedgerSummary(doctorName);
  const { data: firmSettings } = useGetFirmSettings();
  const ledgerPrintRef = useRef<HTMLDivElement>(null);

  const doctorInvoices = invoices
    .filter((inv) => inv.doctorName === doctorName)
    .sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));

  const invoiceNumbers = doctorInvoices.map((inv) => inv.invoiceNumber);
  const { data: allPayments = {} } = useGetAllPaymentsForDoctor(invoiceNumbers);

  const totalCredit = doctorInvoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal),
    0,
  );
  const totalPaid = summary
    ? Number(summary.totalPaid)
    : doctorInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const outstanding = totalCredit - totalPaid;

  const firmName = firmSettings?.name || "PharmaCare";

  const handlePrintLedger = () => {
    const content = ledgerPrintRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Please allow popups to print the ledger");
      return;
    }
    printWindow.document.write(
      `<html><head><title>Ledger - ${doctorName}</title><style>body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;}@media print{@page{size:A4 portrait;margin:10mm;}}</style></head><body style="margin:0;padding:0">${content.innerHTML}</body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleSaveLedgerJpg = async () => {
    const printDiv = ledgerPrintRef.current;
    if (!printDiv) return;
    const ledgerContainer = printDiv.querySelector(
      ".ledger-print-container",
    ) as HTMLElement | null;
    if (!ledgerContainer) {
      toast.error("Ledger container not found");
      return;
    }
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadElementAsJpeg(
        ledgerContainer,
        `Ledger-${doctorName.replace(/\s+/g, "-")}-${dateStr}.jpeg`,
      );
      toast.success("Ledger saved as JPG");
    } catch (e) {
      toast.error(`Failed to save ledger: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
            data-ocid="ledger.secondary_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {doctorName}
            </h3>
            <p className="text-sm text-muted-foreground">Doctor Ledger</p>
          </div>
        </div>
        {/* Print + Download buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handlePrintLedger}
            data-ocid="ledger.primary_button"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSaveLedgerJpg}
            data-ocid="ledger.secondary_button"
          >
            <Download className="w-4 h-4" />
            Save as JPG
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Credit Given"
            amount={totalCredit}
            icon={CreditCard}
          />
          <SummaryCard
            title="Total Paid"
            amount={totalPaid}
            variant="paid"
            icon={CheckCircle}
          />
          <SummaryCard
            title="Outstanding Balance"
            amount={outstanding}
            variant="outstanding"
            icon={TrendingDown}
          />
        </div>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Invoice &amp; Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doctorInvoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No invoices for this doctor
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Invoice #</TableHead>
                    <TableHead className="font-semibold">
                      Payment Type
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Grand Total
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Paid
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Due
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorInvoices.map((inv) => (
                    <InvoiceRow
                      key={Number(inv.invoiceNumber)}
                      invoice={inv}
                      onRecordPayment={() => setPaymentDialogInvoice(inv)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Notes for this doctor */}
      <DoctorCreditNotesCard doctorName={doctorName} />

      {/* Hidden off-screen container for ledger print/JPG capture */}
      <div
        ref={ledgerPrintRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <LedgerPrintView
          doctorName={doctorName}
          invoices={doctorInvoices}
          allPayments={allPayments}
          firmName={firmName}
          totalCredit={totalCredit}
          totalPaid={totalPaid}
          outstanding={outstanding}
        />
      </div>

      {/* Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogInvoice !== null}
        invoiceNumber={paymentDialogInvoice?.invoiceNumber ?? null}
        maxAmount={
          paymentDialogInvoice ? Number(paymentDialogInvoice.amountDue) : 0
        }
        onClose={() => setPaymentDialogInvoice(null)}
      />
    </div>
  );
}

// ─── Main LedgerPage ────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const { data: doctors = [], isLoading: doctorsLoading } = useGetAllDoctors();
  const { data: invoices = [], isLoading: invoicesLoading } =
    useGetAllInvoices();

  const isLoading = doctorsLoading || invoicesLoading;

  // Build doctor summaries from invoice data
  const doctorSummaries: DoctorSummary[] = doctors
    .map((doctor) => {
      const doctorInvoices = invoices.filter(
        (inv) => inv.doctorName === doctor.name,
      );
      const totalCredit = doctorInvoices.reduce(
        (sum, inv) => sum + Number(inv.grandTotal),
        0,
      );
      const totalPaid = doctorInvoices.reduce(
        (sum, inv) => sum + Number(inv.amountPaid),
        0,
      );
      const outstanding = totalCredit - totalPaid;
      return {
        doctorName: doctor.name,
        invoices: doctorInvoices,
        totalCredit,
        totalPaid,
        outstanding,
      };
    })
    .filter((s) => s.invoices.length > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Ledger
        </h2>
        <p className="text-sm text-muted-foreground">
          Track credit, cash collections, and outstanding balances per doctor
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : selectedDoctor ? (
        <DoctorDetailView
          doctorName={selectedDoctor}
          invoices={invoices}
          onBack={() => setSelectedDoctor(null)}
        />
      ) : (
        <DoctorListView
          summaries={doctorSummaries}
          onSelectDoctor={setSelectedDoctor}
        />
      )}
    </div>
  );
}
