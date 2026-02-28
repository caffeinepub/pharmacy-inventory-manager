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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Medicine } from "../backend.d";
import {
  useAddMedicine,
  useDeleteMedicine,
  useGetAllInvoices,
  useGetAllMedicines,
  useUpdateMedicine,
  useUpdateOpeningStock,
  useUpdateSampling,
} from "../hooks/useQueries";

interface MedicineFormData {
  name: string;
  openingStock: string;
  sampling: string;
  batchNumber: string;
  hsnCode: string;
  expiryDate: string;
  purchaseRate: string;
  sellingRate: string;
  mrp: string;
}

const emptyForm: MedicineFormData = {
  name: "",
  openingStock: "",
  sampling: "0",
  batchNumber: "",
  hsnCode: "",
  expiryDate: "",
  purchaseRate: "",
  sellingRate: "",
  mrp: "",
};

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  return expiry <= threeMonthsFromNow && expiry >= today;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Move MedicineForm outside to prevent cursor jumping
function MedicineForm({
  formData,
  setFormData,
  isEdit,
}: {
  formData: MedicineFormData;
  setFormData: React.Dispatch<React.SetStateAction<MedicineFormData>>;
  isEdit: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Medicine Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g., Paracetamol 500mg"
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            Medicine name cannot be changed
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="openingStock">Opening Stock (Units) *</Label>
          <Input
            id="openingStock"
            type="number"
            value={formData.openingStock}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, openingStock: e.target.value }))
            }
            placeholder="100"
          />
          <p className="text-xs text-muted-foreground">
            Monthly initial stock value
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sampling">Sampling (Units)</Label>
          <Input
            id="sampling"
            type="number"
            value={formData.sampling}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sampling: e.target.value }))
            }
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">Free samples given</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="batchNumber">Batch Number *</Label>
          <Input
            id="batchNumber"
            value={formData.batchNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, batchNumber: e.target.value }))
            }
            placeholder="BATCH001"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hsnCode">HSN Code *</Label>
          <Input
            id="hsnCode"
            value={formData.hsnCode}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, hsnCode: e.target.value }))
            }
            placeholder="30049099"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="expiryDate">Expiry Date *</Label>
        <Input
          id="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="purchaseRate">Purchase Rate (₹) *</Label>
          <Input
            id="purchaseRate"
            type="number"
            value={formData.purchaseRate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, purchaseRate: e.target.value }))
            }
            placeholder="10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sellingRate">Base Selling Rate (₹) *</Label>
          <Input
            id="sellingRate"
            type="number"
            value={formData.sellingRate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sellingRate: e.target.value }))
            }
            placeholder="15"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mrp">MRP (₹) *</Label>
          <Input
            id="mrp"
            type="number"
            value={formData.mrp}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, mrp: e.target.value }))
            }
            placeholder="20"
          />
        </div>
      </div>
    </div>
  );
}

// Opening Stock Update Dialog
function OpeningStockDialog({
  isOpen,
  onClose,
  medicines,
}: {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
}) {
  const [stockUpdates, setStockUpdates] = useState<Record<string, string>>({});
  const updateOpeningStock = useUpdateOpeningStock();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      for (const med of medicines) {
        initial[med.name] = Number(med.openingStock).toString();
      }
      setStockUpdates(initial);
    }
  }, [isOpen, medicines]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(stockUpdates).filter(([name, value]) => {
        const original = medicines.find((m) => m.name === name);
        return original && Number(value) !== Number(original.openingStock);
      });

      if (updates.length === 0) {
        toast.info("No changes to save");
        onClose();
        return;
      }

      for (const [name, value] of updates) {
        await updateOpeningStock.mutateAsync({
          name,
          openingStock: BigInt(value),
        });
      }

      toast.success(`Opening stock updated for ${updates.length} medicine(s)`);
      onClose();
    } catch (error) {
      toast.error(
        `Failed to update opening stock: ${(error as Error).message}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Update Opening Stock
          </DialogTitle>
          <DialogDescription>
            Set new opening stock values at the start of each month. Changes
            will update the in-hand stock calculations.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <ScrollBar orientation="vertical" />
          <div className="space-y-3 py-4">
            {medicines.map((medicine) => (
              <div
                key={medicine.name}
                className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {medicine.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current: {Number(medicine.openingStock)} units
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={stockUpdates[medicine.name] || ""}
                    onChange={(e) =>
                      setStockUpdates((prev) => ({
                        ...prev,
                        [medicine.name]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save All"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline Sampling Editor Component
function SamplingEditor({
  medicine,
  onUpdate,
}: {
  medicine: Medicine;
  onUpdate: (name: string, sampling: bigint) => Promise<void>;
}) {
  const [value, setValue] = useState(Number(medicine.sampling).toString());
  const [isSaving, setIsSaving] = useState(false);
  const debouncedValue = useDebounce(value, 500);

  useEffect(() => {
    setValue(Number(medicine.sampling).toString());
  }, [medicine.sampling]);

  useEffect(() => {
    const numValue = Number(debouncedValue);
    if (
      debouncedValue !== "" &&
      !Number.isNaN(numValue) &&
      numValue >= 0 &&
      numValue !== Number(medicine.sampling)
    ) {
      setIsSaving(true);
      onUpdate(medicine.name, BigInt(numValue))
        .then(() => setIsSaving(false))
        .catch(() => {
          setIsSaving(false);
          setValue(Number(medicine.sampling).toString());
        });
    }
  }, [debouncedValue, medicine.name, medicine.sampling, onUpdate]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 h-8 text-sm"
        min="0"
      />
      {isSaving && (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] =
    useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<MedicineFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: medicines = [], isLoading } = useGetAllMedicines();
  const { data: invoices = [] } = useGetAllInvoices();
  const addMedicine = useAddMedicine();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();
  const updateSampling = useUpdateSampling();

  // Calculate total billed quantity for each medicine
  const getTotalBilledQuantity = useCallback(
    (medicineName: string): number => {
      return invoices.reduce((total, invoice) => {
        const item = invoice.items.find((i) => i.medicineName === medicineName);
        return total + (item ? Number(item.quantity) : 0);
      }, 0);
    },
    [invoices],
  );

  // Calculate in-hand stock for a medicine
  const getInHandStock = useCallback(
    (medicine: Medicine): number => {
      const totalBilled = getTotalBilledQuantity(medicine.name);
      return (
        Number(medicine.openingStock) - totalBilled - Number(medicine.sampling)
      );
    },
    [getTotalBilledQuantity],
  );

  const handleUpdateSampling = useCallback(
    async (name: string, sampling: bigint) => {
      try {
        await updateSampling.mutateAsync({ name, sampling });
        toast.success("Sampling updated");
      } catch (error) {
        toast.error(`Failed to update sampling: ${(error as Error).message}`);
        throw error;
      }
    },
    [updateSampling],
  );

  const filteredMedicines = medicines.filter((med) =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData({
      name: medicine.name,
      openingStock: Number(medicine.openingStock).toString(),
      sampling: Number(medicine.sampling).toString(),
      batchNumber: medicine.batchNumber,
      hsnCode: medicine.hsnCode,
      expiryDate: medicine.expiryDate,
      purchaseRate: Number(medicine.purchaseRate).toString(),
      sellingRate: Number(medicine.baseSellingRate).toString(),
      mrp: Number(medicine.mrp).toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;

    try {
      await addMedicine.mutateAsync({
        name: formData.name,
        openingStock: BigInt(formData.openingStock),
        sampling: BigInt(formData.sampling || "0"),
        batchNumber: formData.batchNumber,
        hsnCode: formData.hsnCode,
        expiryDate: formData.expiryDate,
        purchaseRate: BigInt(formData.purchaseRate),
        sellingRate: BigInt(formData.sellingRate),
        mrp: BigInt(formData.mrp),
      });
      toast.success("Medicine added successfully");
      setIsAddDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(`Failed to add medicine: ${(error as Error).message}`);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm()) return;

    try {
      await updateMedicine.mutateAsync({
        name: formData.name,
        openingStock: BigInt(formData.openingStock),
        sampling: BigInt(formData.sampling || "0"),
        batchNumber: formData.batchNumber,
        hsnCode: formData.hsnCode,
        expiryDate: formData.expiryDate,
        purchaseRate: BigInt(formData.purchaseRate),
        sellingRate: BigInt(formData.sellingRate),
        mrp: BigInt(formData.mrp),
      });
      toast.success("Medicine updated successfully");
      setIsEditDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(`Failed to update medicine: ${(error as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMedicine.mutateAsync(deleteTarget);
      toast.success("Medicine deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(`Failed to delete medicine: ${(error as Error).message}`);
    }
  };

  const validateForm = (): boolean => {
    if (
      !formData.name ||
      !formData.openingStock ||
      !formData.batchNumber ||
      !formData.hsnCode ||
      !formData.expiryDate ||
      !formData.purchaseRate ||
      !formData.sellingRate ||
      !formData.mrp
    ) {
      toast.error("All required fields must be filled");
      return false;
    }

    if (Number(formData.openingStock) < 0) {
      toast.error("Opening stock cannot be negative");
      return false;
    }

    if (formData.sampling && Number(formData.sampling) < 0) {
      toast.error("Sampling cannot be negative");
      return false;
    }

    if (
      Number(formData.purchaseRate) <= 0 ||
      Number(formData.sellingRate) <= 0 ||
      Number(formData.mrp) <= 0
    ) {
      toast.error("Price values must be positive");
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Inventory Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Track opening stock, sampling, and in-hand inventory with automatic
            calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsOpeningStockDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Update Opening Stock
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Medicine
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search medicines by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold bg-accent/30">
                    Opening Stock
                  </TableHead>
                  <TableHead className="font-semibold">Sampling</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    Sampling Value
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    In Hand Stock
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground">
                    In Hand Stock Price
                  </TableHead>
                  <TableHead className="font-semibold">Batch</TableHead>
                  <TableHead className="font-semibold">HSN</TableHead>
                  <TableHead className="font-semibold">Expiry</TableHead>
                  <TableHead className="text-right font-semibold">
                    Purchase
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Selling
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    MRP
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchQuery
                        ? "No medicines found matching your search"
                        : "No medicines in inventory. Add your first medicine to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedicines.map((medicine: Medicine) => {
                    const inHandStock = getInHandStock(medicine);
                    const isNegative = inHandStock < 0;
                    const samplingValue =
                      Number(medicine.sampling) * Number(medicine.purchaseRate);
                    const inHandStockPrice =
                      inHandStock * Number(medicine.purchaseRate);
                    const expired = isExpired(medicine.expiryDate);
                    const expiringSoon = isExpiringSoon(medicine.expiryDate);

                    return (
                      <TableRow key={medicine.name}>
                        <TableCell className="font-medium">
                          {medicine.name}
                          {(expired || expiringSoon) && (
                            <AlertCircle
                              className={`inline ml-2 w-4 h-4 ${
                                expired ? "text-destructive" : "text-warning"
                              }`}
                            />
                          )}
                        </TableCell>
                        <TableCell className="bg-accent/10">
                          <span className="font-semibold">
                            {Number(medicine.openingStock)}
                          </span>{" "}
                          units
                        </TableCell>
                        <TableCell>
                          <SamplingEditor
                            medicine={medicine}
                            onUpdate={handleUpdateSampling}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ₹{samplingValue.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {isNegative && (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            <span
                              className={
                                isNegative ? "text-amber-500 font-semibold" : ""
                              }
                            >
                              {inHandStock} units
                            </span>
                            {isNegative && (
                              <Badge variant="destructive" className="text-xs">
                                Negative
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ₹{inHandStockPrice.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {medicine.batchNumber}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {medicine.hsnCode}
                        </TableCell>
                        <TableCell
                          className={
                            expired
                              ? "text-destructive font-semibold"
                              : expiringSoon
                                ? "text-warning font-semibold"
                                : ""
                          }
                        >
                          {new Date(medicine.expiryDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(medicine.purchaseRate)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(medicine.baseSellingRate)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(medicine.mrp)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(medicine)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(medicine.name)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Enter all details for the new medicine. Opening stock is the
              monthly initial value.
            </DialogDescription>
          </DialogHeader>
          <MedicineForm
            formData={formData}
            setFormData={setFormData}
            isEdit={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd} disabled={addMedicine.isPending}>
              {addMedicine.isPending ? "Adding..." : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>
              Update medicine details. Medicine name cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <MedicineForm
            formData={formData}
            setFormData={setFormData}
            isEdit={true}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateMedicine.isPending}
            >
              {updateMedicine.isPending ? "Updating..." : "Update Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OpeningStockDialog
        isOpen={isOpeningStockDialogOpen}
        onClose={() => setIsOpeningStockDialogOpen(false)}
        medicines={medicines}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              medicine "{deleteTarget}" from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMedicine.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
