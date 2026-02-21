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
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import {
  useGetAllDoctors,
  useAddDoctor,
  useUpdateDoctor,
  useDeleteDoctor,
} from "../hooks/useQueries";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doctor } from "../backend.d";
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

interface DoctorFormData {
  name: string;
  marginPercentage: string;
}

const emptyForm: DoctorFormData = {
  name: "",
  marginPercentage: "",
};

export default function DoctorsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(emptyForm);
  const [editingDoctor, setEditingDoctor] = useState<string>("");

  const { data: doctors = [], isLoading } = useGetAllDoctors();
  const addDoctor = useAddDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();

  const handleAdd = () => {
    setFormData(emptyForm);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor.name);
    setFormData({
      name: doctor.name,
      marginPercentage: Number(doctor.marginPercentage).toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;

    try {
      await addDoctor.mutateAsync({
        name: formData.name,
        marginPercentage: BigInt(formData.marginPercentage),
      });
      toast.success("Doctor added successfully");
      setIsAddDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error("Failed to add doctor: " + (error as Error).message);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm()) return;

    try {
      await updateDoctor.mutateAsync({
        name: editingDoctor,
        marginPercentage: BigInt(formData.marginPercentage),
      });
      toast.success("Doctor updated successfully");
      setIsEditDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      toast.error("Failed to update doctor: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDoctor.mutateAsync(deleteTarget);
      toast.success("Doctor removed successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete doctor: " + (error as Error).message);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.marginPercentage) {
      toast.error("All fields are required");
      return false;
    }

    const margin = Number(formData.marginPercentage);
    if (margin < 0 || margin > 100) {
      toast.error("Margin percentage must be between 0 and 100");
      return false;
    }

    return true;
  };

  const DoctorForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="doctorName">Doctor Name *</Label>
        <Input
          id="doctorName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
        <Label htmlFor="margin">Margin Percentage (0-100) *</Label>
        <Input
          id="margin"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={formData.marginPercentage}
          onChange={(e) =>
            setFormData({ ...formData, marginPercentage: e.target.value })
          }
          placeholder="15"
        />
        <p className="text-xs text-muted-foreground">
          This margin will be applied to medicines prescribed by this doctor
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
            Doctor Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage doctors and their custom margin percentages
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
            Add doctors to assign custom margin percentages for billing
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
                  Margin Percentage
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor: Doctor) => (
                <TableRow key={doctor.name}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {Number(doctor.marginPercentage)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
              Register a new doctor with a custom margin percentage.
            </DialogDescription>
          </DialogHeader>
          <DoctorForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
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
              Update the doctor's margin percentage.
            </DialogDescription>
          </DialogHeader>
          <DoctorForm isEdit={true} />
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

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the
              doctor "{deleteTarget}" from your system.
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
