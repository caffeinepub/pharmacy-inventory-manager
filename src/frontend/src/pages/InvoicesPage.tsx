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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Eye, FileText, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d";
import {
  useDeleteInvoice,
  useGetAllDoctors,
  useGetAllInvoices,
  useGetAllMedicines,
  useGetFirmSettings,
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
    if (!selectedInvoice) return;

    const invoiceContainer = document.querySelector(".invoice-print-container");
    if (!invoiceContainer) {
      toast.error("Invoice preview not found");
      return;
    }

    try {
      const invoiceNumber = selectedInvoice.invoiceNumber
        .toString()
        .padStart(6, "0");
      const doctorName = sanitizeFilename(selectedInvoice.doctorName);
      const filename = `Invoice-${invoiceNumber}-${doctorName}.jpeg`;

      await downloadElementAsJpeg(invoiceContainer as HTMLElement, filename);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      toast.error(`Failed to download invoice: ${(error as Error).message}`);
    }
  };

  const handleDeleteClick = (invoiceNumber: bigint) => {
    setDeleteInvoiceNumber(invoiceNumber);
  };

  const handleConfirmDelete = async () => {
    if (!deleteInvoiceNumber) return;

    try {
      await deleteInvoice.mutateAsync(deleteInvoiceNumber);
      toast.success("Invoice deleted successfully");
      setDeleteInvoiceNumber(null);
    } catch (error) {
      toast.error(`Failed to delete invoice: ${(error as Error).message}`);
    }
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
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(invoice.invoiceNumber)}
                        className="gap-2 text-destructive hover:text-destructive"
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
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  onClick={handleDownloadJpeg}
                  variant="secondary"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download as JPEG
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice &&
            (() => {
              // Calculate rounded GST for the entire invoice (used in summary)
              const totalGst = Number(selectedInvoice.gstAmount);
              const roundedTotalGst = Math.round(totalGst);
              const roundedGrandTotal =
                Number(selectedInvoice.subtotal) + roundedTotalGst;

              // Find the doctor's shipping address
              const doctor = doctors.find(
                (d) => d.name === selectedInvoice.doctorName,
              );
              const shippingAddress = doctor?.shippingAddress || "";

              return (
                <div className="invoice-print-container">
                  <style>
                    {`
                    @media print {
                      html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                      }
                      body > *:not(.invoice-print-root) {
                        display: none !important;
                      }
                      [role="dialog"] {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        transform: none !important;
                        animation: none !important;
                      }
                      [role="dialog"] > * {
                        display: none !important;
                      }
                      .invoice-print-container {
                        display: block !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        padding: 15mm !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        color: black !important;
                        margin: 0 auto !important;
                      }
                      .invoice-print-container * {
                        display: revert !important;
                      }
                      @page {
                        size: A4 portrait;
                        margin: 0;
                      }
                      /* Compact font sizes for A4 */
                      .invoice-print-container h1 {
                        font-size: 22px !important;
                      }
                      .invoice-print-container p,
                      .invoice-print-container td,
                      .invoice-print-container th {
                        font-size: 10px !important;
                      }
                      .invoice-print-container table {
                        font-size: 9px !important;
                        width: 100% !important;
                      }
                      .invoice-print-container .text-3xl {
                        font-size: 18px !important;
                      }
                      .invoice-print-container table td,
                      .invoice-print-container table th {
                        padding: 1.5mm !important;
                      }
                      .print\\:hidden {
                        display: none !important;
                      }
                    }
                  `}
                  </style>

                  <div className="bg-white text-black p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center border-b-2 border-black pb-4">
                      <h1 className="text-3xl font-bold mb-2">
                        {firmSettings?.name || "PharmaCare"}
                      </h1>
                      <p className="text-sm">
                        {firmSettings?.address || "Address not set"}
                      </p>
                      <div className="flex justify-center gap-6 mt-2 text-sm">
                        <p>
                          <strong>GSTIN:</strong> {firmSettings?.gstin || "N/A"}
                        </p>
                        {firmSettings?.dilNumber && (
                          <p>
                            <strong>DIL No:</strong> {firmSettings.dilNumber}
                          </p>
                        )}
                        <p>
                          <strong>Contact:</strong>{" "}
                          {firmSettings?.contact || "N/A"}
                        </p>
                      </div>
                      {shippingAddress && (
                        <div className="text-sm mt-2">
                          <strong>Shipping Address:</strong>
                          <div
                            className="whitespace-pre-wrap max-w-2xl mx-auto"
                            style={{ lineHeight: "1.5" }}
                          >
                            {shippingAddress}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Invoice Info */}
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="mb-1">
                          <strong>Invoice Number:</strong>{" "}
                          {selectedInvoice.invoiceNumber
                            .toString()
                            .padStart(6, "0")}
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date().toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>
                          <strong>Doctor:</strong> {selectedInvoice.doctorName}
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-black">
                      <table className="w-full text-sm">
                        <thead
                          className="bg-gray-200"
                          style={{ color: "black" }}
                        >
                          <tr style={{ color: "black" }}>
                            <th
                              className="border border-black p-2 text-left"
                              style={{ color: "black" }}
                            >
                              S.No
                            </th>
                            <th
                              className="border border-black p-2 text-left"
                              style={{ color: "black" }}
                            >
                              Medicine Name
                            </th>
                            <th
                              className="border border-black p-2 text-left"
                              style={{ color: "black" }}
                            >
                              Batch
                            </th>
                            <th
                              className="border border-black p-2 text-left"
                              style={{ color: "black" }}
                            >
                              Expiry
                            </th>
                            <th
                              className="border border-black p-2 text-left"
                              style={{ color: "black" }}
                            >
                              HSN Code
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              Qty
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              Rate
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              MRP
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              Amount
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              GST 5%
                            </th>
                            <th
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items.map((item, index) => {
                            const itemGst = Math.round(
                              (Number(item.amount) * 5) / 100,
                            );
                            const roundedItemTotal =
                              Number(item.amount) + itemGst;
                            const medicine = medicines.find(
                              (m) => m.name === item.medicineName,
                            );
                            const mrp = medicine ? Number(medicine.mrp) : null;

                            return (
                              <tr
                                key={`inv-item-${item.medicineName}-${index}`}
                                style={{ color: "black" }}
                              >
                                <td
                                  className="border border-black p-2"
                                  style={{ color: "black" }}
                                >
                                  {index + 1}
                                </td>
                                <td
                                  className="border border-black p-2"
                                  style={{ color: "black" }}
                                >
                                  {item.medicineName}
                                </td>
                                <td
                                  className="border border-black p-2 font-mono"
                                  style={{ color: "black" }}
                                >
                                  {item.batchNumber}
                                </td>
                                <td
                                  className="border border-black p-2 text-sm"
                                  style={{ color: "black" }}
                                >
                                  {item.expiryDate}
                                </td>
                                <td
                                  className="border border-black p-2 font-mono"
                                  style={{ color: "black" }}
                                >
                                  {item.hsnCode}
                                </td>
                                <td
                                  className="border border-black p-2 text-right"
                                  style={{ color: "black" }}
                                >
                                  {Number(item.quantity)}
                                </td>
                                <td
                                  className="border border-black p-2 text-right"
                                  style={{ color: "black" }}
                                >
                                  ₹{Number(item.sellingPrice)}
                                </td>
                                <td
                                  className="border border-black p-2 text-right"
                                  style={{ color: "black" }}
                                >
                                  {mrp !== null
                                    ? `₹${mrp.toLocaleString("en-IN")}`
                                    : "N/A"}
                                </td>
                                <td
                                  className="border border-black p-2 text-right"
                                  style={{ color: "black" }}
                                >
                                  ₹{Number(item.amount).toLocaleString("en-IN")}
                                </td>
                                <td
                                  className="border border-black p-2 text-right"
                                  style={{ color: "black" }}
                                >
                                  ₹{itemGst.toLocaleString("en-IN")}
                                </td>
                                <td
                                  className="border border-black p-2 text-right font-semibold"
                                  style={{ color: "black" }}
                                >
                                  ₹{roundedItemTotal.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot
                          className="bg-gray-100 font-semibold"
                          style={{ color: "black" }}
                        >
                          <tr style={{ color: "black" }}>
                            <td
                              colSpan={8}
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              Subtotal:
                            </td>
                            <td
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              ₹
                              {Number(selectedInvoice.subtotal).toLocaleString(
                                "en-IN",
                              )}
                            </td>
                            <td
                              className="border border-black p-2 text-right"
                              style={{ color: "black" }}
                            >
                              ₹{roundedTotalGst.toLocaleString("en-IN")}
                            </td>
                            <td
                              className="border border-black p-2 text-right text-lg"
                              style={{ color: "black" }}
                            >
                              ₹{roundedGrandTotal.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-100 p-4 border-2 border-black">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm">
                            <strong>Subtotal:</strong> ₹
                            {Number(selectedInvoice.subtotal).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                          <p className="text-sm">
                            <strong>GST (5%):</strong> ₹
                            {roundedTotalGst.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-black font-semibold">
                            Grand Total
                          </p>
                          <p className="text-3xl font-bold text-black">
                            ₹{roundedGrandTotal.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-black pt-4 border-t border-black">
                      <p>Thank you for your business!</p>
                      <p className="mt-1">
                        This is a computer-generated invoice and does not
                        require a signature.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
