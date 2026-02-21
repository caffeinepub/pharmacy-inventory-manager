import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, AlertCircle } from "lucide-react";
import {
  useGetAllMedicines,
  useAddMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
} from "../hooks/useQueries";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { Medicine } from "../backend.d";
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

interface MedicineFormData {
  name: string;
  quantity: string;
  batchNumber: string;
  hsnCode: string;
  expiryDate: string;
  purchaseRate: string;
  sellingRate: string;
  mrp: string;
}

const emptyForm: MedicineFormData = {
  name: "",
  quantity: "",
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

export default function InventoryPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<MedicineFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: medicines = [], isLoading } = useGetAllMedicines();
  const addMedicine = useAddMedicine();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();

  const filteredMedicines = medicines.filter((med) =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData({
      name: medicine.name,
      quantity: Number(medicine.quantity).toString(),
      batchNumber: medicine.batchNumber,
      hsnCode: medicine.hsnCode,
      expiryDate: medicine.expiryDate,
      purchaseRate: Number(medicine.purchaseRate).toString(),
      sellingRate: Number(medicine.sellingRate).toString(),
      mrp: Number(medicine.mrp).toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;

    try {
      await addMedicine.mutateAsync({
        name: formData.name,
        quantity: BigInt(formData.quantity),
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
      toast.error("Failed to add medicine: " + (error as Error).message);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm()) return;

    try {
      await updateMedicine.mutateAsync({
        name: formData.name,
        quantity: BigInt(formData.quantity),
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
      toast.error("Failed to update medicine: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMedicine.mutateAsync(deleteTarget);
      toast.success("Medicine deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete medicine: " + (error as Error).message);
    }
  };

  const validateForm = (): boolean => {
    if (
      !formData.name ||
      !formData.quantity ||
      !formData.batchNumber ||
      !formData.hsnCode ||
      !formData.expiryDate ||
      !formData.purchaseRate ||
      !formData.sellingRate ||
      !formData.mrp
    ) {
      toast.error("All fields are required");
      return false;
    }

    if (
      Number(formData.quantity) <= 0 ||
      Number(formData.purchaseRate) <= 0 ||
      Number(formData.sellingRate) <= 0 ||
      Number(formData.mrp) <= 0
    ) {
      toast.error("Numeric values must be positive");
      return false;
    }

    return true;
  };

  const MedicineForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Medicine Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Paracetamol 500mg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="quantity">Quantity (Units) *</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, quantity: e.target.value }))
            }
            placeholder="100"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="batchNumber">Batch Number *</Label>
          <Input
            id="batchNumber"
            value={formData.batchNumber}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, batchNumber: e.target.value }))
            }
            placeholder="BATCH001"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="hsnCode">HSN Code *</Label>
          <Input
            id="hsnCode"
            value={formData.hsnCode}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, hsnCode: e.target.value }))
            }
            placeholder="30049099"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expiryDate">Expiry Date *</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, expiryDate: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="purchaseRate">Purchase Rate (₹) *</Label>
          <Input
            id="purchaseRate"
            type="number"
            value={formData.purchaseRate}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, purchaseRate: e.target.value }))
            }
            placeholder="10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sellingRate">Selling Rate (₹) *</Label>
          <Input
            id="sellingRate"
            type="number"
            value={formData.sellingRate}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, sellingRate: e.target.value }))
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
            onChange={(e) => setFormData(prev => ({ ...prev, mrp: e.target.value }))}
            placeholder="20"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Inventory Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage medicines, stock levels, and pricing
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Medicine
        </Button>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Units</TableHead>
                <TableHead className="font-semibold">Batch</TableHead>
                <TableHead className="font-semibold">HSN</TableHead>
                <TableHead className="font-semibold">Expiry</TableHead>
                <TableHead className="text-right font-semibold">
                  Purchase
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Selling
                </TableHead>
                <TableHead className="text-right font-semibold">MRP</TableHead>
                <TableHead className="text-right font-semibold">
                  Stock Value
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
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery
                      ? "No medicines found matching your search"
                      : "No medicines in inventory. Add your first medicine to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicines.map((medicine: Medicine) => {
                  const stockValue =
                    Number(medicine.quantity) * Number(medicine.purchaseRate);
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
                      <TableCell>{Number(medicine.quantity)}</TableCell>
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
                          "en-IN"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{Number(medicine.purchaseRate)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{Number(medicine.sellingRate)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{Number(medicine.mrp)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{stockValue.toLocaleString("en-IN")}
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
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Enter all details for the new medicine. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <MedicineForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={addMedicine.isPending}
            >
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
              Update medicine details. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <MedicineForm />
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
