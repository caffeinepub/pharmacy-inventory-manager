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
  IndianRupee,
  Plus,
  TrendingDown,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Invoice, LedgerSummary, PaymentRecord } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useGetAllDoctors, useGetAllInvoices } from "../hooks/useQueries";

// ─── Hooks ───────────────────────────────────────────────────────────────────

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
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorSummary {
  doctorName: string;
  invoices: Invoice[];
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
}

// ─── Components ──────────────────────────────────────────────────────────────

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
      className={
        variant === "outstanding" && amount > 0
          ? "border-destructive/30 bg-destructive/5"
          : variant === "paid"
            ? "border-green-500/30 bg-green-500/5"
            : ""
      }
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

// cn helper (import may not be available directly)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Doctor List View ─────────────────────────────────────────────────────────

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

// ─── Payment Dialog ──────────────────────────────────────────────────────────

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
      <DialogContent className="max-w-sm">
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
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              ref={dateRef}
              type="date"
              defaultValue={today}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const doctorInvoices = invoices
    .filter((inv) => inv.doctorName === doctorName)
    .sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));

  const totalCredit = doctorInvoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal),
    0,
  );
  const totalPaid = summary
    ? Number(summary.totalPaid)
    : doctorInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const outstanding = totalCredit - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
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
          <CardTitle className="text-base">Invoice History</CardTitle>
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

// ─── Main LedgerPage ──────────────────────────────────────────────────────────

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
