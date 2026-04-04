import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, Minus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { CreditNote } from "../backend.d";
import CreditNotePreview from "../components/CreditNotePreview";
import {
  useDeleteCreditNote,
  useGetAllCreditNotes,
  useGetAllDoctors,
  useGetAllMedicines,
  useGetFirmSettings,
} from "../hooks/useQueries";
import {
  downloadElementAsJpeg,
  downloadElementAsPdf,
} from "../utils/invoiceDownload";

function statusBadge(status: string) {
  if (status === "apply_to_balance")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100">
        Apply to Balance
      </Badge>
    );
  if (status === "refund")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
        Refund
      </Badge>
    );
  if (status === "carry_forward")
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100">
        Carry Forward
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) / 1_000_000).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CreditNotesPage() {
  const [viewCreditNote, setViewCreditNote] = useState<CreditNote | null>(null);
  const [deleteCNNumber, setDeleteCNNumber] = useState<bigint | null>(null);

  const { data: creditNotes = [], isLoading } = useGetAllCreditNotes();
  const { data: firmSettings } = useGetFirmSettings();
  const { data: doctors = [] } = useGetAllDoctors();
  const { data: medicines = [] } = useGetAllMedicines();
  const deleteCreditNote = useDeleteCreditNote();

  const sortedNotes = [...creditNotes].sort(
    (a, b) => Number(b.creditNoteNumber) - Number(a.creditNoteNumber),
  );

  const getCNElement = (): HTMLElement | null =>
    document.querySelector(".credit-note-container") as HTMLElement | null;

  const sanitize = (name: string) =>
    name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");

  const handleDownloadJpeg = async () => {
    if (!viewCreditNote) return;
    const el = getCNElement();
    if (!el) {
      toast.error("Credit note preview not found.");
      return;
    }
    try {
      const cnNum = viewCreditNote.creditNoteNumber.toString().padStart(6, "0");
      const doc = sanitize(viewCreditNote.doctorName);
      await downloadElementAsJpeg(el, `CreditNote-CN-${cnNum}-${doc}.jpeg`);
      toast.success("Credit note downloaded as JPEG!");
    } catch (error) {
      toast.error(`Download failed: ${(error as Error).message}`);
    }
  };

  const handleDownloadPdf = async () => {
    if (!viewCreditNote) return;
    const el = getCNElement();
    if (!el) {
      toast.error("Credit note preview not found.");
      return;
    }
    try {
      const cnNum = viewCreditNote.creditNoteNumber.toString().padStart(6, "0");
      const doc = sanitize(viewCreditNote.doctorName);
      await downloadElementAsPdf(el, `CreditNote-CN-${cnNum}-${doc}.pdf`);
      toast.success("Credit note downloaded as PDF!");
    } catch (error) {
      toast.error(`Download failed: ${(error as Error).message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCNNumber) return;
    try {
      await deleteCreditNote.mutateAsync(deleteCNNumber);
      toast.success("Credit note deleted");
      setDeleteCNNumber(null);
      if (viewCreditNote?.creditNoteNumber === deleteCNNumber)
        setViewCreditNote(null);
    } catch (error) {
      toast.error(`Failed to delete: ${(error as Error).message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Credit Notes
        </h2>
        <p className="text-sm text-muted-foreground">
          Credit notes issued against invoices
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <Card data-ocid="creditnotes.empty_state">
          <CardContent className="pt-12 pb-12 text-center">
            <Minus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Credit Notes Yet</h3>
            <p className="text-muted-foreground">
              Open an invoice and click &quot;Create Credit Note&quot; to get
              started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table data-ocid="creditnotes.table">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">CN #</TableHead>
                <TableHead className="font-semibold">Invoice Ref</TableHead>
                <TableHead className="font-semibold">Doctor</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="text-center font-semibold">
                  Items
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Amount
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNotes.map((cn, index) => (
                <TableRow
                  key={Number(cn.creditNoteNumber)}
                  data-ocid={`creditnotes.item.${index + 1}`}
                >
                  <TableCell className="font-mono font-medium text-red-600">
                    CN-{cn.creditNoteNumber.toString().padStart(6, "0")}
                  </TableCell>
                  <TableCell className="font-mono">
                    INV-{cn.linkedInvoiceNumber.toString().padStart(6, "0")}
                  </TableCell>
                  <TableCell>{cn.doctorName}</TableCell>
                  <TableCell className="max-w-[160px]">
                    <span className="text-sm truncate block" title={cn.reason}>
                      {cn.reason.length > 40
                        ? `${cn.reason.slice(0, 40)}...`
                        : cn.reason}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{cn.items.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    ₹{Number(cn.grandTotal).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{statusBadge(cn.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(cn.timestamp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewCreditNote(cn)}
                        className="gap-1"
                        data-ocid="creditnotes.view_button"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteCNNumber(cn.creditNoteNumber)}
                        className="gap-1 text-destructive hover:text-destructive"
                        data-ocid="creditnotes.delete_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Credit Note Dialog */}
      <Dialog
        open={viewCreditNote !== null}
        onOpenChange={() => setViewCreditNote(null)}
      >
        <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] overflow-y-auto p-4">
          <DialogHeader className="print:hidden sticky top-0 bg-background z-10 pb-3 border-b mb-3">
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-red-600 font-bold">
                CN-
                {viewCreditNote?.creditNoteNumber.toString().padStart(6, "0")}
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleDownloadJpeg}
                  variant="secondary"
                  className="gap-2"
                  data-ocid="creditnotes.download_button"
                >
                  <Download className="w-4 h-4" />
                  Save as JPEG
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  className="gap-2"
                  data-ocid="creditnotes.pdf_button"
                >
                  <FileText className="w-4 h-4" />
                  Save as PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-center overflow-visible">
            {viewCreditNote && (
              <CreditNotePreview
                creditNote={viewCreditNote}
                firmSettings={firmSettings}
                medicines={medicines}
                doctors={doctors}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteCNNumber !== null}
        onOpenChange={() => setDeleteCNNumber(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Credit Note CN-
              {deleteCNNumber?.toString().padStart(6, "0")}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="creditnotes.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="creditnotes.confirm_button"
            >
              {deleteCreditNote.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
