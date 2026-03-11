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
import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Invoice, InvoiceItem } from "../backend.d";
import type { EditableInvoiceData } from "../components/InvoicePreview";
import InvoicePreview from "../components/InvoicePreview";
import {
  useDeleteInvoice,
  useGetAllDoctors,
  useGetAllInvoices,
  useGetAllMedicines,
  useGetFirmSettings,
  useSetDoctorMedicinePrice,
} from "../hooks/useQueries";
import { downloadElementAsJpeg } from "../utils/invoiceDownload";

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteInvoiceNumber, setDeleteInvoiceNumber] = useState<bigint | null>(
    null,
  );
  const { data: invoices = [], isLoading } = useGetAllInvoices();
  const { data: firmSettings } = useGetFirmSettings();
  const { data: doctors = [] } = useGetAllDoctors();
  const { data: medicines = [] } = useGetAllMedicines();
  const deleteInvoice = useDeleteInvoice();
  const setDoctorMedicinePrice = useSetDoctorMedicinePrice();
  const queryClient = useQueryClient();

  const sortedInvoices = [...invoices].sort(
    (a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber),
  );

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handlePrint = () => {
    window.print();
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  };

  const handleDownloadJpeg = async () => {
    if (!selectedInvoice) {
      toast.error("No invoice selected");
      return;
    }

    const invoiceContainer = document.querySelector(
      ".invoice-container",
    ) as HTMLElement | null;
    if (!invoiceContainer) {
      toast.error(
        "Invoice preview not found. Please open the invoice preview first.",
      );
      return;
    }

    try {
      const invoiceNumber = selectedInvoice.invoiceNumber
        .toString()
        .padStart(6, "0");
      const doctorName = sanitizeFilename(selectedInvoice.doctorName);
      const filename = `Invoice-${invoiceNumber}-${doctorName}.jpeg`;

      await downloadElementAsJpeg(invoiceContainer, filename);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Invoice generation failed:", error);
      toast.error(
        `Unable to download invoice: ${(error as Error).message}. Please try again.`,
      );
    }
  };

  const handleDeleteClick = (invoiceNumber: bigint) => {
    setDeleteInvoiceNumber(invoiceNumber);
  };

  const handleConfirmDelete = async () => {
    if (!deleteInvoiceNumber) return;

    const invoiceToDelete = sortedInvoices.find(
      (inv) => inv.invoiceNumber === deleteInvoiceNumber,
    );
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice.mutateAsync({
        invoiceNumber: deleteInvoiceNumber,
        items: invoiceToDelete.items.map((item) => ({
          medicineName: item.medicineName,
          quantity: item.quantity,
        })),
      });
      toast.success("Invoice deleted and stock restored");
      setDeleteInvoiceNumber(null);
      if (selectedInvoice?.invoiceNumber === deleteInvoiceNumber) {
        setSelectedInvoice(null);
      }
    } catch (error) {
      toast.error(`Failed to delete invoice: ${(error as Error).message}`);
    }
  };

  const handleSaveInvoice = async (data: EditableInvoiceData) => {
    if (!selectedInvoice) return;

    // 1. Update doctor pricing for changed rates
    if (selectedInvoice.doctorName) {
      const priceUpdates = data.items
        .map((item, i) => {
          const originalRate = Number(
            selectedInvoice.items[i]?.sellingPrice ?? 0,
          );
          return { item, originalRate };
        })
        .filter(({ item, originalRate }) => item.rate !== originalRate);

      await Promise.all(
        priceUpdates.map(({ item }) =>
          setDoctorMedicinePrice.mutateAsync({
            doctorName: selectedInvoice.doctorName,
            medicineName: item.medicineName,
            price: BigInt(Math.round(item.rate)),
          }),
        ),
      );

      if (priceUpdates.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["doctors"] });
      }
    }

    // 2. Rebuild the invoice object with updated values so the UI reflects changes
    const newSubtotal = data.items.reduce((s, item) => s + item.amount, 0);
    const newGst =
      data.gstOverride !== null
        ? data.gstOverride
        : Number.parseFloat(((newSubtotal * 5) / 100).toFixed(2));
    const newGrandTotal = Number.parseFloat((newSubtotal + newGst).toFixed(2));
    const newAmountDue = Math.max(
      0,
      newGrandTotal - Number(selectedInvoice.amountPaid),
    );

    const updatedItems: InvoiceItem[] = data.items.map((editItem, i) => {
      const original = selectedInvoice.items[i];
      return {
        medicineName: editItem.medicineName,
        batchNumber: editItem.batchNumber,
        expiryDate: editItem.expiryDate,
        hsnCode: editItem.hsnCode,
        quantity: BigInt(Math.round(editItem.quantity)),
        sellingPrice: BigInt(Math.round(editItem.rate)),
        amount: BigInt(Math.round(editItem.amount)),
        purchaseRate: original?.purchaseRate ?? BigInt(0),
        profit: original
          ? BigInt(
              Math.round(
                editItem.amount -
                  editItem.quantity * Number(original.purchaseRate),
              ),
            )
          : BigInt(0),
      };
    });

    const updatedInvoice: Invoice = {
      ...selectedInvoice,
      subtotal: BigInt(Math.round(newSubtotal)),
      gstAmount: BigInt(Math.round(newGst)),
      grandTotal: BigInt(Math.round(newGrandTotal)),
      amountDue: BigInt(Math.round(newAmountDue)),
      items: updatedItems,
    };

    // 3. Update query cache so the invoice list table also reflects the new totals
    queryClient.setQueryData<Invoice[]>(["invoices"], (old) => {
      if (!old) return old;
      return old.map((inv) =>
        inv.invoiceNumber === selectedInvoice.invoiceNumber
          ? updatedInvoice
          : inv,
      );
    });

    // 4. Update selectedInvoice so InvoicePreview resets to the saved state
    setSelectedInvoice(updatedInvoice);

    toast.success("Invoice saved and recalculated successfully.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Invoice History
        </h2>
        <p className="text-sm text-muted-foreground">
          View and print generated invoices
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Invoices Yet</h3>
            <p className="text-muted-foreground">
              Create your first invoice in the Billing section
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Invoice Number</TableHead>
                <TableHead className="font-semibold">Doctor</TableHead>
                <TableHead className="font-semibold">Items</TableHead>
                <TableHead className="text-right font-semibold">
                  Subtotal
                </TableHead>
                <TableHead className="text-right font-semibold">
                  GST 5%
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Grand Total
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow key={Number(invoice.invoiceNumber)}>
                  <TableCell className="font-mono font-medium">
                    #{invoice.invoiceNumber.toString().padStart(6, "0")}
                  </TableCell>
                  <TableCell>{invoice.doctorName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{invoice.items.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(invoice.subtotal).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(invoice.gstAmount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    ₹{Number(invoice.grandTotal).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                        className="gap-2"
                        data-ocid="invoices.view_button"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(invoice.invoiceNumber)}
                        className="gap-2 text-destructive hover:text-destructive"
                        data-ocid="invoices.delete_button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>
                Invoice #
                {selectedInvoice?.invoiceNumber.toString().padStart(6, "0")}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  className="gap-2"
                  data-ocid="invoices.print_button"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  onClick={handleDownloadJpeg}
                  variant="secondary"
                  className="gap-2"
                  data-ocid="invoices.download_button"
                >
                  <Download className="w-4 h-4" />
                  Download as JPEG
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <InvoicePreview
              invoice={selectedInvoice}
              firmSettings={firmSettings}
              medicines={medicines}
              doctors={doctors}
              onSave={handleSaveInvoice}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteInvoiceNumber !== null}
        onOpenChange={() => setDeleteInvoiceNumber(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Invoice #
              {deleteInvoiceNumber?.toString().padStart(6, "0")}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
