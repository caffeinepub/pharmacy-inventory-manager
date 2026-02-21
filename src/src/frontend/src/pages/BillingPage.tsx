import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ShoppingCart, FileCheck, AlertTriangle } from "lucide-react";
import {
  useGetAllMedicines,
  useGetAllDoctors,
  useCreateInvoice,
} from "../hooks/useQueries";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BillItem {
  medicineName: string;
  batchNumber: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  marginPercentage: number;
  sgst: number;
  cgst: number;
  totalAmount: number;
}

export default function BillingPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  const { data: medicines = [] } = useGetAllMedicines();
  const { data: doctors = [] } = useGetAllDoctors();
  const createInvoice = useCreateInvoice();

  const handleAddToCart = () => {
    if (!selectedMedicine || !quantity || Number(quantity) <= 0) {
      toast.error("Please select a medicine and enter valid quantity");
      return;
    }

    const medicine = medicines.find((m) => m.name === selectedMedicine);
    if (!medicine) {
      toast.error("Medicine not found");
      return;
    }

    const rate = Number(medicine.sellingRate);
    const qty = Number(quantity);

    // Step 1: Calculate base amount (rate × quantity)
    const amount = rate * qty;
    
    // Step 2: Calculate GST 5% on base amount
    const gst = Math.round((amount * 5) / 100);
    
    // Step 3: Split GST into SGST and CGST (2.5% each)
    const sgst = Math.round(gst / 2);
    const cgst = Math.round(gst / 2);
    
    // Step 4: Calculate item total (amount + GST)
    const totalAmount = amount + gst;

    const newItem: BillItem = {
      medicineName: medicine.name,
      batchNumber: medicine.batchNumber,
      hsnCode: medicine.hsnCode,
      quantity: qty,
      rate,
      amount: Math.round(amount),
      marginPercentage: 0, // Not used in calculations, stored for reference only
      sgst,
      cgst,
      totalAmount: Math.round(totalAmount),
    };

    setBillItems([...billItems, newItem]);
    setSelectedMedicine("");
    setQuantity("");
    toast.success("Item added to bill");
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
    const negativeInventoryItems: Array<{ name: string; remaining: number }> = [];
    
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
      negativeInventoryItems.forEach((item) => {
        toast.warning(
          `⚠️ Warning: ${item.name} will have negative inventory (${item.remaining} units)`,
          { duration: 5000 }
        );
      });
    }

    try {
      const itemNames = billItems.map((item) => item.medicineName);
      const quantities = billItems.map((item) => BigInt(item.quantity));

      const invoiceNumber = await createInvoice.mutateAsync({
        doctorName: selectedDoctor,
        itemNames,
        quantities,
      });

      toast.success(`Invoice #${invoiceNumber} created successfully!`);
      setBillItems([]);
      setSelectedDoctor("");
    } catch (error) {
      toast.error("Failed to create invoice: " + (error as Error).message);
    }
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
  const totalGst = billItems.reduce((sum, item) => sum + item.sgst + item.cgst, 0);
  const grandTotal = billItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Billing & Invoice Generation
        </h2>
        <p className="text-sm text-muted-foreground">
          Create new invoices with GST calculations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Add Items to Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="medicine">Select Medicine</Label>
                <Select
                  value={selectedMedicine}
                  onValueChange={setSelectedMedicine}
                >
                  <SelectTrigger id="medicine">
                    <SelectValue placeholder="Choose a medicine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((med) => (
                      <SelectItem key={med.name} value={med.name}>
                        {med.name} - Stock: {Number(med.quantity)} - ₹
                        {Number(med.sellingRate)}
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
                  />
                  <Button onClick={handleAddToCart} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="doctor">Select Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Choose a doctor..." />
                </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doc) => (
                      <SelectItem key={doc.name} value={doc.name}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              {selectedDoctor && (
                <p className="text-xs text-muted-foreground">
                  Doctor selected for record-keeping
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <p>No items in cart. Add medicines to start billing.</p>
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
                    <TableRow key={index}>
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
                        ₹{(item.sgst + item.cgst).toLocaleString("en-IN")}
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
    </div>
  );
}
