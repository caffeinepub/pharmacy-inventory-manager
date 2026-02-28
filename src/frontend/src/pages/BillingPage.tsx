import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  CreditCard,
  Download,
  FileCheck,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d";
import {
  useCreateInvoice,
  useGetAllDoctors,
  useGetAllMedicines,
  useGetDoctorMedicinePrice,
  useGetFirmSettings,
  useGetInvoice,
} from "../hooks/useQueries";
import { downloadElementAsJpeg } from "../utils/invoiceDownload";

interface BillItem {
  medicineName: string;
  batchNumber: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  gst: number;
  totalAmount: number;
}

export default function BillingPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<
    bigint | null
  >(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const { data: medicines = [] } = useGetAllMedicines();
  const { data: doctors = [] } = useGetAllDoctors();
  const { data: firmSettings } = useGetFirmSettings();
  const createInvoice = useCreateInvoice();
  const getDoctorMedicinePrice = useGetDoctorMedicinePrice();
  const getInvoice = useGetInvoice();

  const handleAddToCart = async () => {
    if (!selectedMedicine || !quantity || Number(quantity) <= 0) {
      toast.error("Please select a medicine and enter valid quantity");
      return;
    }

    if (!selectedDoctor) {
      toast.error("Please select a doctor first");
      return;
    }

    const medicine = medicines.find((m) => m.name === selectedMedicine);
    if (!medicine) {
      toast.error("Medicine not found");
      return;
    }

    try {
      // Fetch doctor-specific price
      const price = await getDoctorMedicinePrice.mutateAsync({
        doctorName: selectedDoctor,
        medicineName: selectedMedicine,
      });

      const rate = Number(price);
      const qty = Number(quantity);

      // Step 1: Calculate base amount (rate × quantity)
      const amount = rate * qty;

      // Step 2: Calculate GST 5% on base amount with proper rounding
      const gstDecimal = (amount * 5) / 100;
      const gst = Math.round(gstDecimal);

      // Step 3: Calculate item total (amount + GST)
      const totalAmount = amount + gst;

      const newItem: BillItem = {
        medicineName: medicine.name,
        batchNumber: medicine.batchNumber,
        hsnCode: medicine.hsnCode,
        quantity: qty,
        rate,
        amount: Math.round(amount),
        gst,
        totalAmount: Math.round(totalAmount),
      };

      setBillItems([...billItems, newItem]);
      setSelectedMedicine("");
      setQuantity("");
      toast.success("Item added to bill");
    } catch (error) {
      toast.error(`Failed to get medicine price: ${(error as Error).message}`);
    }
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
    toast.success("Item removed from bill");
  };

  const handleClearAll = () => {
    setBillItems([]);
    setSelectedDoctor("");
    toast.success("Bill cleared");
  };

  const handleDoctorChange = (doctorName: string) => {
    if (billItems.length > 0) {
      toast.warning("Changing doctor will clear current bill items");
      setBillItems([]);
    }
    setSelectedDoctor(doctorName);
  };

  const handleCreateInvoice = async () => {
    if (billItems.length === 0) {
      toast.error("Please add items to the bill");
      return;
    }

    if (!selectedDoctor) {
      toast.error("Please select a doctor");
      return;
    }

    // Check for negative inventory warnings
    const negativeInventoryItems: Array<{ name: string; remaining: number }> =
      [];

    for (const item of billItems) {
      const medicine = medicines.find((m) => m.name === item.medicineName);
      if (medicine) {
        const currentStock = Number(medicine.quantity);
        const afterBilling = currentStock - item.quantity;

        if (afterBilling < 0) {
          negativeInventoryItems.push({
            name: item.medicineName,
            remaining: afterBilling,
          });
        }
      }
    }

    // Show warnings for each item that will go negative
    if (negativeInventoryItems.length > 0) {
      for (const item of negativeInventoryItems) {
        toast.warning(
          `⚠️ Warning: ${item.name} will have negative inventory (${item.remaining} units)`,
          { duration: 5000 },
        );
      }
    }

    try {
      const itemNames = billItems.map((item) => item.medicineName);
      const quantities = billItems.map((item) => BigInt(item.quantity));

      const invoiceNumber = await createInvoice.mutateAsync({
        doctorName: selectedDoctor,
        itemNames,
        quantities,
        paymentType,
      });

      setCreatedInvoiceNumber(invoiceNumber);
      toast.success(`Invoice #${invoiceNumber} created successfully!`);
      setBillItems([]);
      setSelectedDoctor("");
    } catch (error) {
      toast.error(`Failed to create invoice: ${(error as Error).message}`);
    }
  };

  const handlePrintInvoice = async () => {
    if (!createdInvoiceNumber) return;

    try {
      const invoice = await getInvoice.mutateAsync(createdInvoiceNumber);
      if (invoice) {
        setPreviewInvoice(invoice);
        setShowPrintPreview(true);
      } else {
        toast.error("Invoice not found");
      }
    } catch (error) {
      toast.error(`Failed to fetch invoice: ${(error as Error).message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  };

  const handleDownloadJpeg = async () => {
    if (!previewInvoice) return;

    const invoiceContainer = document.querySelector(".invoice-print-container");
    if (!invoiceContainer) {
      toast.error("Invoice preview not found");
      return;
    }

    try {
      const invoiceNumber = previewInvoice.invoiceNumber
        .toString()
        .padStart(6, "0");
      const doctorName = sanitizeFilename(previewInvoice.doctorName);
      const filename = `Invoice-${invoiceNumber}-${doctorName}.jpeg`;

      await downloadElementAsJpeg(invoiceContainer as HTMLElement, filename);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      toast.error(`Failed to download invoice: ${(error as Error).message}`);
    }
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
  const totalGst = billItems.reduce((sum, item) => sum + item.gst, 0);
  const grandTotal = billItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Billing & Invoice Generation
        </h2>
        <p className="text-sm text-muted-foreground">
          Create new invoices with GST calculations and doctor-specific pricing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Add Items to Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="doctor">Select Doctor *</Label>
              <Select value={selectedDoctor} onValueChange={handleDoctorChange}>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Choose a doctor first..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {doctors.map((doc) => (
                    <SelectItem key={doc.name} value={doc.name}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDoctor && (
                <p className="text-xs text-muted-foreground">
                  Doctor-specific prices will be applied to medicines
                </p>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="medicine">Select Medicine</Label>
                <Select
                  value={selectedMedicine}
                  onValueChange={setSelectedMedicine}
                  disabled={!selectedDoctor}
                >
                  <SelectTrigger id="medicine">
                    <SelectValue placeholder="Choose a medicine..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {medicines.map((med) => (
                      <SelectItem key={med.name} value={med.name}>
                        {med.name} - Stock: {Number(med.quantity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    disabled={!selectedDoctor}
                  />
                  <Button
                    onClick={handleAddToCart}
                    className="gap-2"
                    disabled={!selectedDoctor}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Payment Type Toggle */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Payment Type
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("cash")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    paymentType === "cash"
                      ? "bg-green-500 border-green-500 text-white shadow-sm"
                      : "bg-background border-border text-muted-foreground hover:border-green-400 hover:text-green-600"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("credit")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    paymentType === "credit"
                      ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                      : "bg-background border-border text-muted-foreground hover:border-orange-400 hover:text-orange-600"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Credit
                </button>
              </div>
              {paymentType === "credit" && (
                <Badge
                  variant="outline"
                  className="border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 self-start text-xs"
                >
                  Will be tracked in Ledger
                </Badge>
              )}
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-semibold">{billItems.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (5%):</span>
              <span className="font-semibold">
                ₹{totalGst.toLocaleString("en-IN")}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Grand Total:</span>
              <span className="text-xl font-bold text-primary">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreateInvoice}
                disabled={
                  billItems.length === 0 ||
                  !selectedDoctor ||
                  createInvoice.isPending
                }
                className="flex-1 gap-2"
              >
                <FileCheck className="w-4 h-4" />
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAll}
                disabled={billItems.length === 0}
              >
                Clear
              </Button>
            </div>
            {createdInvoiceNumber && (
              <Button
                onClick={handlePrintInvoice}
                variant="secondary"
                className="w-full gap-2 mt-2"
                disabled={getInvoice.isPending}
              >
                <Printer className="w-4 h-4" />
                {getInvoice.isPending ? "Loading..." : "Print Invoice"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill Items</CardTitle>
        </CardHeader>
        <CardContent>
          {billItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                No items in cart. Select a doctor and add medicines to start
                billing.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">S.No</TableHead>
                    <TableHead className="font-semibold">Medicine</TableHead>
                    <TableHead className="font-semibold">Batch</TableHead>
                    <TableHead className="font-semibold">HSN</TableHead>
                    <TableHead className="text-right font-semibold">
                      Qty
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Rate
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      GST 5%
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Total
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.map((item, index) => (
                    <TableRow key={`bill-item-${item.medicineName}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {item.medicineName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.batchNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.hsnCode}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">₹{item.rate}</TableCell>
                      <TableCell className="text-right">
                        ₹{item.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{item.gst.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{item.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted font-semibold">
                    <TableCell colSpan={6} className="text-right">
                      Totals:
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{totalGst.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>
                Invoice #
                {previewInvoice?.invoiceNumber.toString().padStart(6, "0")}
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

          {previewInvoice &&
            (() => {
              // Calculate rounded GST for the entire invoice (used in summary)
              const totalGst = Number(previewInvoice.gstAmount);
              const roundedTotalGst = Math.round(totalGst);
              const roundedGrandTotal =
                Number(previewInvoice.subtotal) + roundedTotalGst;

              // Find the doctor's shipping address
              const doctor = doctors.find(
                (d) => d.name === previewInvoice.doctorName,
              );
              const shippingAddress = doctor?.shippingAddress || "";

              return (
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
                        box-sizing: border-box;
                      }
                      @page {
                        size: A4 portrait;
                        margin: 0;
                      }
                      /* Compact font sizes for A4 */
                      .invoice-print-container h1 {
                        font-size: 24px !important;
                      }
                      .invoice-print-container p,
                      .invoice-print-container td,
                      .invoice-print-container th {
                        font-size: 10px !important;
                      }
                      .invoice-print-container table {
                        font-size: 9px !important;
                      }
                      .invoice-print-container .text-3xl {
                        font-size: 20px !important;
                      }
                      /* Reduce padding in table cells */
                      .invoice-print-container table td,
                      .invoice-print-container table th {
                        padding: 1mm !important;
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
                          {previewInvoice.invoiceNumber
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
                          <strong>Doctor:</strong> {previewInvoice.doctorName}
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
                              GST 5%
                            </th>
                            <th className="border border-black p-2 text-right">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewInvoice.items.map((item, index) => {
                            const itemGst = Math.round(
                              (Number(item.amount) * 5) / 100,
                            );
                            const roundedItemTotal =
                              Number(item.amount) + itemGst;

                            return (
                              <tr
                                key={`preview-item-${item.medicineName}-${index}`}
                              >
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
                                  ₹{Number(item.sellingPrice)}
                                </td>
                                <td className="border border-black p-2 text-right">
                                  ₹{Number(item.amount).toLocaleString("en-IN")}
                                </td>
                                <td className="border border-black p-2 text-right">
                                  ₹{itemGst.toLocaleString("en-IN")}
                                </td>
                                <td className="border border-black p-2 text-right font-semibold">
                                  ₹{roundedItemTotal.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            );
                          })}
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
                              {Number(previewInvoice.subtotal).toLocaleString(
                                "en-IN",
                              )}
                            </td>
                            <td className="border border-black p-2 text-right">
                              ₹{roundedTotalGst.toLocaleString("en-IN")}
                            </td>
                            <td className="border border-black p-2 text-right text-lg">
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
                            {Number(previewInvoice.subtotal).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                          <p className="text-sm">
                            <strong>GST (5%):</strong> ₹
                            {roundedTotalGst.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Grand Total</p>
                          <p className="text-3xl font-bold">
                            ₹{roundedGrandTotal.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-600 pt-4 border-t border-gray-300">
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
    </div>
  );
}
