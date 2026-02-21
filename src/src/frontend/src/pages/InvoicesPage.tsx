import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Printer, Eye, Trash2 } from "lucide-react";
import { useGetAllInvoices, useGetFirmSettings, useDeleteInvoice } from "../hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";
import type { Invoice } from "../backend.d";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteInvoiceNumber, setDeleteInvoiceNumber] = useState<bigint | null>(null);
  const { data: invoices = [], isLoading } = useGetAllInvoices();
  const { data: firmSettings } = useGetFirmSettings();
  const deleteInvoice = useDeleteInvoice();

  const sortedInvoices = [...invoices].sort(
    (a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber)
  );

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handlePrint = () => {
    window.print();
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
      toast.error("Failed to delete invoice: " + (error as Error).message);
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
                  SGST
                </TableHead>
                <TableHead className="text-right font-semibold">
                  CGST
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
                    ₹{Number(invoice.totalAmount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(invoice.totalSgst).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(invoice.totalCgst).toLocaleString("en-IN")}
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
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="invoice-print-container">
              <style>
                {`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    .invoice-print-container,
                    .invoice-print-container * {
                      visibility: visible;
                    }
                    .invoice-print-container {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 210mm;
                      padding: 15mm;
                    }
                    @page {
                      size: A4 portrait;
                      margin: 0;
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
                    <p>
                      <strong>Contact:</strong> {firmSettings?.contact || "N/A"}
                    </p>
                  </div>
                  {firmSettings?.shippingAddress && (
                    <p className="text-sm mt-2">
                      <strong>Shipping Address:</strong> {firmSettings.shippingAddress}
                    </p>
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
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border border-black p-2 text-left">
                          S.No
                        </th>
                        <th className="border border-black p-2 text-left">
                          Medicine Name
                        </th>
                        <th className="border border-black p-2 text-left">
                          Batch
                        </th>
                        <th className="border border-black p-2 text-left">
                          Expiry
                        </th>
                        <th className="border border-black p-2 text-left">
                          HSN Code
                        </th>
                        <th className="border border-black p-2 text-right">
                          Qty
                        </th>
                        <th className="border border-black p-2 text-right">
                          Rate
                        </th>
                        <th className="border border-black p-2 text-right">
                          Amount
                        </th>
                        <th className="border border-black p-2 text-right">
                          SGST
                        </th>
                        <th className="border border-black p-2 text-right">
                          CGST
                        </th>
                        <th className="border border-black p-2 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-black p-2">
                            {index + 1}
                          </td>
                          <td className="border border-black p-2">
                            {item.medicineName}
                          </td>
                          <td className="border border-black p-2 font-mono">
                            {item.batchNumber}
                          </td>
                          <td className="border border-black p-2 text-sm">
                            {item.expiryDate}
                          </td>
                          <td className="border border-black p-2 font-mono">
                            {item.hsnCode}
                          </td>
                          <td className="border border-black p-2 text-right">
                            {Number(item.quantity)}
                          </td>
                          <td className="border border-black p-2 text-right">
                            ₹{Number(item.rate)}
                          </td>
                          <td className="border border-black p-2 text-right">
                            ₹{Number(item.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="border border-black p-2 text-right">
                            ₹{Number(item.sgst).toLocaleString("en-IN")}
                          </td>
                          <td className="border border-black p-2 text-right">
                            ₹{Number(item.cgst).toLocaleString("en-IN")}
                          </td>
                          <td className="border border-black p-2 text-right font-semibold">
                            ₹{Number(item.totalAmount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-semibold">
                      <tr>
                        <td
                          colSpan={7}
                          className="border border-black p-2 text-right"
                        >
                          Subtotal:
                        </td>
                        <td className="border border-black p-2 text-right">
                          ₹
                          {Number(selectedInvoice.totalAmount).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border border-black p-2 text-right">
                          ₹
                          {Number(selectedInvoice.totalSgst).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border border-black p-2 text-right">
                          ₹
                          {Number(selectedInvoice.totalCgst).toLocaleString(
                            "en-IN"
                          )}
                        </td>
                        <td className="border border-black p-2 text-right text-lg">
                          ₹
                          {Number(selectedInvoice.grandTotal).toLocaleString(
                            "en-IN"
                          )}
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
                        {Number(selectedInvoice.totalAmount).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                      <p className="text-sm">
                        <strong>Total SGST (2.5%):</strong> ₹
                        {Number(selectedInvoice.totalSgst).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                      <p className="text-sm">
                        <strong>Total CGST (2.5%):</strong> ₹
                        {Number(selectedInvoice.totalCgst).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Grand Total</p>
                      <p className="text-3xl font-bold">
                        ₹
                        {Number(selectedInvoice.grandTotal).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-600 pt-4 border-t border-gray-300">
                  <p>Thank you for your business!</p>
                  <p className="mt-1">
                    This is a computer-generated invoice and does not require a
                    signature.
                  </p>
                </div>
              </div>
            </div>
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
