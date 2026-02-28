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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Doctor } from "../backend.d";
import {
  useAddDoctor,
  useDeleteDoctor,
  useGetAllDoctorPrices,
  useGetAllDoctors,
  useGetAllMedicines,
  useRemoveDoctorMedicinePrice,
  useSetDoctorMedicinePrice,
  useUpdateDoctor,
} from "../hooks/useQueries";

interface DoctorFormData {
  name: string;
  shippingAddress: string;
}

const emptyForm: DoctorFormData = {
  name: "",
  shippingAddress: "",
};

// Move DoctorForm outside to prevent cursor jumping
function DoctorForm({
  formData,
  setFormData,
  isEdit = false,
}: {
  formData: DoctorFormData;
  setFormData: React.Dispatch<React.SetStateAction<DoctorFormData>>;
  isEdit?: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="doctorName">Doctor Name *</Label>
        <Input
          id="doctorName"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Dr. John Smith"
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            Doctor name cannot be changed
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="shippingAddress">Shipping Address *</Label>
        <Input
          id="shippingAddress"
          value={formData.shippingAddress}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              shippingAddress: e.target.value,
            }))
          }
          placeholder="123 Medical Street, City, State, PIN"
        />
        <p className="text-xs text-muted-foreground">
          This address will appear on invoices for this doctor
        </p>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(emptyForm);
  const [editingDoctor, setEditingDoctor] = useState<string>("");
  const [pricingDoctor, setPricingDoctor] = useState<string>("");
  const [customPrices, setCustomPrices] = useState<Map<string, string>>(
    new Map(),
  );
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const { data: doctors = [], isLoading } = useGetAllDoctors();
  const { data: medicines = [] } = useGetAllMedicines();
  const addDoctor = useAddDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();
  const getAllDoctorPrices = useGetAllDoctorPrices();
  const setDoctorMedicinePrice = useSetDoctorMedicinePrice();
  const removeDoctorMedicinePrice = useRemoveDoctorMedicinePrice();

  const handleAdd = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor.name);
    setFormData({
      name: doctor.name,
      shippingAddress: doctor.shippingAddress,
    });
    setIsEditDialogOpen(true);
  };

  const handleManagePricing = async (doctorName: string) => {
    setPricingDoctor(doctorName);
    setIsPricingDialogOpen(true);
    setIsLoadingPrices(true);

    try {
      const prices = await getAllDoctorPrices.mutateAsync(doctorName);
      const priceMap = new Map<string, string>();
      for (const [medicineName, price] of prices) {
        priceMap.set(medicineName, Number(price).toString());
      }
      setCustomPrices(priceMap);
    } catch (_error) {
      toast.error("Failed to load custom prices");
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;

    try {
      await addDoctor.mutateAsync({
        name: formData.name,
        shippingAddress: formData.shippingAddress,
      });
      toast.success("Doctor added successfully");
      setIsAddDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(`Failed to add doctor: ${(error as Error).message}`);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm()) return;

    try {
      await updateDoctor.mutateAsync({
        name: editingDoctor,
        shippingAddress: formData.shippingAddress,
      });
      toast.success("Doctor updated successfully");
      setIsEditDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(`Failed to update doctor: ${(error as Error).message}`);
    }
  };

  const handleSavePrice = async (medicineName: string, price: string) => {
    if (!price || Number(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await setDoctorMedicinePrice.mutateAsync({
        doctorName: pricingDoctor,
        medicineName,
        price: BigInt(price),
      });
      toast.success(`Price updated for ${medicineName}`);
    } catch (error) {
      toast.error(`Failed to update price: ${(error as Error).message}`);
    }
  };

  const handleResetPrice = async (medicineName: string) => {
    try {
      await removeDoctorMedicinePrice.mutateAsync({
        doctorName: pricingDoctor,
        medicineName,
      });
      const newPrices = new Map(customPrices);
      newPrices.delete(medicineName);
      setCustomPrices(newPrices);
      toast.success(`Reset to base price for ${medicineName}`);
    } catch (error) {
      toast.error(`Failed to reset price: ${(error as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDoctor.mutateAsync(deleteTarget);
      toast.success("Doctor removed successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(`Failed to delete doctor: ${(error as Error).message}`);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.shippingAddress) {
      toast.error("All fields are required");
      return false;
    }

    if (formData.shippingAddress.trim() === "") {
      toast.error("Shipping address cannot be empty");
      return false;
    }

    return true;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Doctor Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage doctors and their custom medicine pricing
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Doctor
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Doctors Registered</h3>
          <p className="text-muted-foreground mb-4">
            Add doctors to assign custom medicine pricing for billing
          </p>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Doctor
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Doctor Name</TableHead>
                <TableHead className="font-semibold">
                  Shipping Address
                </TableHead>
                <TableHead className="font-semibold">Custom Prices</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor: Doctor) => (
                <TableRow key={doctor.name}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {doctor.shippingAddress}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {doctor.customPrices.length} medicine
                      {doctor.customPrices.length !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManagePricing(doctor.name)}
                        className="gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Manage Pricing
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(doctor)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(doctor.name)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Register a new doctor. You can set custom medicine prices after
              adding.
            </DialogDescription>
          </DialogHeader>
          <DoctorForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd} disabled={addDoctor.isPending}>
              {addDoctor.isPending ? "Adding..." : "Add Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's shipping address.
            </DialogDescription>
          </DialogHeader>
          <DoctorForm
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
              disabled={updateDoctor.isPending}
            >
              {updateDoctor.isPending ? "Updating..." : "Update Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Manage Pricing for {pricingDoctor}</DialogTitle>
            <DialogDescription>
              Set custom prices for each medicine. Leave blank to use base
              selling rate.
            </DialogDescription>
          </DialogHeader>
          {isLoadingPrices ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {medicines.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No medicines in inventory. Add medicines first.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine Name</TableHead>
                        <TableHead className="text-right">
                          Purchase Rate
                        </TableHead>
                        <TableHead className="text-right">MRP</TableHead>
                        <TableHead className="text-right">
                          Base Selling Rate
                        </TableHead>
                        <TableHead className="text-right">
                          Custom Price
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicines.map((medicine) => {
                        const customPrice =
                          customPrices.get(medicine.name) || "";
                        const baseRate = Number(medicine.baseSellingRate);

                        return (
                          <TableRow key={medicine.name}>
                            <TableCell className="font-medium">
                              {medicine.name}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{Number(medicine.purchaseRate)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{Number(medicine.mrp)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ₹{baseRate}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="1"
                                value={customPrice}
                                onChange={(e) => {
                                  const newPrices = new Map(customPrices);
                                  newPrices.set(medicine.name, e.target.value);
                                  setCustomPrices(newPrices);
                                }}
                                placeholder={baseRate.toString()}
                                className="max-w-[120px] ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSavePrice(medicine.name, customPrice)
                                  }
                                  disabled={
                                    !customPrice ||
                                    setDoctorMedicinePrice.isPending
                                  }
                                >
                                  Save
                                </Button>
                                {customPrice && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleResetPrice(medicine.name)
                                    }
                                    disabled={
                                      removeDoctorMedicinePrice.isPending
                                    }
                                  >
                                    Reset
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPricingDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the
              doctor "{deleteTarget}" and all their custom pricing from your
              system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDoctor.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
