import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { FirmSettings, Invoice, Medicine } from "../backend.d";
import { useCreateCreditNote } from "../hooks/useQueries";

interface SelectedItem {
  included: boolean;
  creditedQty: number;
}

interface CreateCreditNoteDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  firmSettings: FirmSettings | undefined;
  medicines: Medicine[];
}

export default function CreateCreditNoteDialog({
  open,
  onClose,
  invoice,
}: CreateCreditNoteDialogProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() =>
    invoice.items.map(() => ({ included: false, creditedQty: 0 })),
  );
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("apply_to_balance");

  const createCreditNote = useCreateCreditNote();

  const toggleItem = (index: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              included: !item.included,
              creditedQty: !item.included
                ? Number(invoice.items[i].quantity)
                : 0,
            }
          : item,
      ),
    );
  };

  const setQty = (index: number, qty: number) => {
    const max = Number(invoice.items[index].quantity);
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, creditedQty: Math.min(Math.max(1, qty), max) }
          : item,
      ),
    );
  };

  const creditedSubtotal = invoice.items.reduce((sum, item, i) => {
    if (!selectedItems[i]?.included) return sum;
    return sum + selectedItems[i].creditedQty * Number(item.sellingPrice);
  }, 0);

  const creditedGst = Math.round((creditedSubtotal * 5) / 100);
  const creditedTotal = creditedSubtotal + creditedGst;

  const hasSelectedItems = selectedItems.some(
    (item) => item.included && item.creditedQty > 0,
  );

  const handleSubmit = async () => {
    if (!hasSelectedItems) {
      toast.error("Please select at least one item to credit");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for the credit note");
      return;
    }

    // Build items array using original indices to preserve correct qty mapping
    const itemsWithQty: Array<[string, bigint]> = invoice.items
      .filter(
        (_, i) =>
          selectedItems[i]?.included && selectedItems[i].creditedQty > 0,
      )
      .map((item) => {
        const origIndex = invoice.items.indexOf(item);
        return [
          item.medicineName,
          BigInt(selectedItems[origIndex].creditedQty),
        ] as [string, bigint];
      });

    try {
      await createCreditNote.mutateAsync({
        linkedInvoiceNumber: invoice.invoiceNumber,
        items: itemsWithQty,
        reason: reason.trim(),
        status,
      });
      toast.success("Credit note created successfully");
      onClose();
    } catch (error) {
      toast.error(`Failed to create credit note: ${(error as Error).message}`);
    }
  };

  const invNum = invoice.invoiceNumber.toString().padStart(6, "0");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="creditnote.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              style={{
                background: "#dc2626",
                color: "white",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              CREDIT NOTE
            </span>
            <span>Against Invoice #{invNum}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Select Items Section */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">
              Select Items to Credit
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50 border-b">
                    <th className="text-left p-3 w-8" />
                    <th className="text-left p-3">Medicine</th>
                    <th className="text-center p-3">Orig Qty</th>
                    <th className="text-center p-3">Credit Qty</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Credited Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => {
                    const sel = selectedItems[index];
                    const creditedAmt = sel?.included
                      ? sel.creditedQty * Number(item.sellingPrice)
                      : 0;
                    return (
                      <tr
                        key={`${item.medicineName}-${index}`}
                        className={`border-b last:border-0 ${
                          sel?.included ? "bg-red-50/50" : ""
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={sel?.included ?? false}
                            onCheckedChange={() => toggleItem(index)}
                            data-ocid={`creditnote.checkbox.${index + 1}`}
                          />
                        </td>
                        <td className="p-3 font-medium">
                          {item.medicineName}
                          <div className="text-xs text-muted-foreground">
                            Batch: {item.batchNumber} | Exp: {item.expiryDate}
                          </div>
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {Number(item.quantity)}
                        </td>
                        <td className="p-3 text-center">
                          {sel?.included ? (
                            <Input
                              type="number"
                              min={1}
                              max={Number(item.quantity)}
                              value={sel.creditedQty}
                              onChange={(e) =>
                                setQty(index, Number(e.target.value))
                              }
                              className="w-20 mx-auto text-center h-8"
                              data-ocid={`creditnote.input.${index + 1}`}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          ₹{Number(item.sellingPrice).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {sel?.included ? (
                            <span className="text-red-600">
                              ₹{creditedAmt.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST Summary */}
          {hasSelectedItems && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between text-sm gap-4 flex-wrap">
                <span>
                  <strong>Credited Subtotal:</strong> ₹
                  {creditedSubtotal.toFixed(2)}
                </span>
                <span>
                  <strong>GST (5%):</strong> ₹{creditedGst}
                </span>
                <span className="text-red-700 font-bold text-base">
                  Credit Total: ₹{creditedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Credit Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Credit Details
            </h4>

            <div className="grid gap-2">
              <Label htmlFor="cn-reason">Reason *</Label>
              <Textarea
                id="cn-reason"
                placeholder="e.g. Customer returned items — damaged packaging"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                data-ocid="creditnote.textarea"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cn-status">Credit Application</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="cn-status" data-ocid="creditnote.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apply_to_balance">
                    Apply to Balance — Reduces outstanding on this invoice
                  </SelectItem>
                  <SelectItem value="refund">
                    Refund — Record as cash refund to customer
                  </SelectItem>
                  <SelectItem value="carry_forward">
                    Carry Forward — Store as credit for future invoices
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="creditnote.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCreditNote.isPending || !hasSelectedItems}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
              data-ocid="creditnote.submit_button"
            >
              {createCreditNote.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {createCreditNote.isPending
                ? "Creating..."
                : "Create Credit Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
