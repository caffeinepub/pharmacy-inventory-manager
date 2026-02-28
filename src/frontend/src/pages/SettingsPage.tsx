import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Database,
  Download,
  Info,
  Lock,
  Save,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BackupRecord } from "../backend.d";
import {
  useBackup,
  useGetAppPin,
  useGetFirmSettings,
  useSetAppPin,
  useUpdateFirmSettings,
} from "../hooks/useQueries";

interface SettingsFormData {
  name: string;
  address: string;
  gstin: string;
  contact: string;
  email: string;
  defaultShippingAddress: string;
  dilNumber: string;
}

export default function SettingsPage() {
  const { data: firmSettings, isLoading } = useGetFirmSettings();
  const updateFirmSettings = useUpdateFirmSettings();
  const backupMutation = useBackup();
  const { data: savedPin } = useGetAppPin();
  const setAppPin = useSetAppPin();

  const [formData, setFormData] = useState<SettingsFormData>({
    name: "",
    address: "",
    gstin: "",
    contact: "",
    email: "",
    defaultShippingAddress: "",
    dilNumber: "",
  });

  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(
    null,
  );
  const [estimatedFileSize, setEstimatedFileSize] = useState<string | null>(
    null,
  );
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showChangePinDialog, setShowChangePinDialog] = useState(false);

  const oldPinRef = useRef<HTMLInputElement>(null);
  const newPinRef = useRef<HTMLInputElement>(null);
  const confirmNewPinRef = useRef<HTMLInputElement>(null);

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const oldPin = oldPinRef.current?.value ?? "";
    const newPin = newPinRef.current?.value ?? "";
    const confirmNewPin = confirmNewPinRef.current?.value ?? "";

    if (oldPin !== savedPin) {
      toast.error("Current PIN is incorrect");
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      toast.error("New PIN must be exactly 4 digits");
      return;
    }

    if (newPin !== confirmNewPin) {
      toast.error("New PIN and confirmation don't match");
      return;
    }

    try {
      await setAppPin.mutateAsync(newPin);
      toast.success("PIN changed successfully");
      setShowChangePinDialog(false);
    } catch (error) {
      toast.error(`Failed to change PIN: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    if (firmSettings) {
      setFormData({
        name: firmSettings.name,
        address: firmSettings.address,
        gstin: firmSettings.gstin,
        contact: firmSettings.contact,
        email: firmSettings.email,
        defaultShippingAddress: firmSettings.defaultShippingAddress,
        dilNumber: firmSettings.dilNumber,
      });
    }
  }, [firmSettings]);

  // Check for backup reminder on mount
  useEffect(() => {
    const lastBackup = localStorage.getItem("lastBackupTimestamp");
    setLastBackupTimestamp(lastBackup);

    if (lastBackup) {
      const lastBackupDate = new Date(lastBackup);
      const daysSinceLastBackup = Math.floor(
        (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const dismissedKey = `backupReminderDismissed_${currentYear}_${currentMonth}`;
      const isDismissed = localStorage.getItem(dismissedKey);

      if (daysSinceLastBackup >= 30 && !isDismissed) {
        setShowBackupReminder(true);
      }
    } else {
      // No backup yet
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const dismissedKey = `backupReminderDismissed_${currentYear}_${currentMonth}`;
      const isDismissed = localStorage.getItem(dismissedKey);

      if (!isDismissed) {
        setShowBackupReminder(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Firm name is required");
      return;
    }

    try {
      await updateFirmSettings.mutateAsync({
        name: formData.name,
        address: formData.address,
        gstin: formData.gstin,
        contact: formData.contact,
        email: formData.email,
        shippingAddress: formData.defaultShippingAddress,
        dilNumber: formData.dilNumber,
      });
      toast.success("Firm settings updated successfully");
    } catch (error) {
      toast.error(`Failed to update settings: ${(error as Error).message}`);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backupData = await backupMutation.mutateAsync();

      // Convert BackupRecord to JSON with proper metadata
      const backupJson = {
        backupMetadata: {
          timestamp: new Date().toISOString(),
          version: backupData.version,
          appName: "Pharmacy Inventory Manager",
        },
        firmSettings: backupData.firmSettings
          ? {
              name: backupData.firmSettings.name,
              address: backupData.firmSettings.address,
              gstin: backupData.firmSettings.gstin,
              contact: backupData.firmSettings.contact,
              email: backupData.firmSettings.email,
              defaultShippingAddress:
                backupData.firmSettings.defaultShippingAddress,
              dilNumber: backupData.firmSettings.dilNumber,
            }
          : null,
        medicines: backupData.medicines.map((med) => ({
          name: med.name,
          quantity: Number(med.quantity),
          batchNumber: med.batchNumber,
          hsnCode: med.hsnCode,
          expiryDate: med.expiryDate,
          purchaseRate: Number(med.purchaseRate),
          baseSellingRate: Number(med.baseSellingRate),
          mrp: Number(med.mrp),
        })),
        doctors: backupData.doctors.map((doc) => ({
          name: doc.name,
          shippingAddress: doc.shippingAddress,
          customPrices: doc.customPrices.map(([medName, price]) => [
            medName,
            Number(price),
          ]),
        })),
        invoices: backupData.invoices.map((inv) => ({
          invoiceNumber: Number(inv.invoiceNumber),
          doctorName: inv.doctorName,
          subtotal: Number(inv.subtotal),
          gstAmount: Number(inv.gstAmount),
          grandTotal: Number(inv.grandTotal),
          totalProfit: Number(inv.totalProfit),
          timestamp: Number(inv.timestamp),
          items: inv.items.map((item) => ({
            medicineName: item.medicineName,
            quantity: Number(item.quantity),
            sellingPrice: Number(item.sellingPrice),
            purchaseRate: Number(item.purchaseRate),
            amount: Number(item.amount),
            hsnCode: item.hsnCode,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            profit: Number(item.profit),
          })),
        })),
      };

      const jsonString = JSON.stringify(backupJson, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const sizeInKB = (blob.size / 1024).toFixed(2);
      setEstimatedFileSize(`${sizeInKB} KB`);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `pharmacy-backup-${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Store backup timestamp
      const timestamp = new Date().toISOString();
      localStorage.setItem("lastBackupTimestamp", timestamp);
      setLastBackupTimestamp(timestamp);

      toast.success(
        "Backup downloaded successfully - upload to Google Drive for safekeeping",
      );
    } catch (error) {
      toast.error(`Failed to create backup: ${(error as Error).message}`);
    }
  };

  const dismissBackupReminder = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const dismissedKey = `backupReminderDismissed_${currentYear}_${currentMonth}`;
    localStorage.setItem(dismissedKey, "true");
    setShowBackupReminder(false);
  };

  const formatLastBackupDate = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Firm Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your pharmacy details for invoices and documents
        </p>
      </div>

      {showBackupReminder && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm text-amber-800 dark:text-amber-300">
              {lastBackupTimestamp
                ? "It's been over 30 days since your last backup. Please back up your data to prevent data loss."
                : "You haven't backed up your data yet. Create your first backup to safeguard your pharmacy records."}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
              onClick={dismissBackupReminder}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="firmName">
                Firm Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firmName"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ABC Pharmacy"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="123 Main Street, City, State - 123456"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shippingAddress">Shipping Address</Label>
              <Textarea
                id="shippingAddress"
                value={formData.defaultShippingAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultShippingAddress: e.target.value,
                  }))
                }
                placeholder="123 Shipping Street, City, State - 123456"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gstin: e.target.value }))
                }
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                15-character GST Identification Number
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dilNumber">DIL Number (Drug License)</Label>
              <Input
                id="dilNumber"
                value={formData.dilNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dilNumber: e.target.value,
                  }))
                }
                placeholder="DL-XXXXX-XXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Drug License Number for pharmacy operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  type="tel"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contact: e.target.value,
                    }))
                  }
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="pharmacy@example.com"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={updateFirmSettings.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateFirmSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
              {firmSettings && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      name: firmSettings.name,
                      address: firmSettings.address,
                      gstin: firmSettings.gstin,
                      contact: firmSettings.contact,
                      email: firmSettings.email,
                      defaultShippingAddress:
                        firmSettings.defaultShippingAddress,
                      dilNumber: firmSettings.dilNumber,
                    })
                  }
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Backup and Export
          </CardTitle>
          <CardDescription>
            Download a complete backup of your pharmacy data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Manual Backup</p>
              <p className="text-xs text-muted-foreground">
                Last backup: {formatLastBackupDate(lastBackupTimestamp)}
              </p>
              {estimatedFileSize && (
                <p className="text-xs text-muted-foreground">
                  Estimated size: {estimatedFileSize}
                </p>
              )}
            </div>
            <Button
              onClick={handleDownloadBackup}
              disabled={backupMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              {backupMutation.isPending
                ? "Creating Backup..."
                : "Download Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Backup Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Your backup file contains all medicines, doctors, invoices, and
            firm settings in JSON format.
          </p>
          <p>
            • Save the downloaded file to Google Drive or your preferred cloud
            storage for safekeeping.
          </p>
          <p>
            • We recommend creating a backup at least once a month to prevent
            data loss.
          </p>
          <p>
            • Keep backup files secure as they contain sensitive business
            information.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            App Security
          </CardTitle>
          <CardDescription>
            Manage your PIN code to protect app access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">PIN Protection</p>
              <p className="text-xs text-muted-foreground">
                Change the 4-digit PIN used to unlock the app
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowChangePinDialog(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <Lock className="w-4 h-4" />
              Change PIN
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • These details will appear on all generated invoices and official
            documents.
          </p>
          <p>• Ensure GSTIN is accurate for compliance with GST regulations.</p>
          <p>
            • Contact information helps customers reach you for queries and
            support.
          </p>
        </CardContent>
      </Card>

      {/* Change PIN Dialog */}
      <Dialog open={showChangePinDialog} onOpenChange={setShowChangePinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change PIN</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePinSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="oldPin">Current PIN</Label>
              <Input
                id="oldPin"
                ref={oldPinRef}
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]{4}"
                defaultValue=""
                placeholder="Enter current 4-digit PIN"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPin">New PIN</Label>
              <Input
                id="newPin"
                ref={newPinRef}
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]{4}"
                defaultValue=""
                placeholder="Enter new 4-digit PIN"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
              <Input
                id="confirmNewPin"
                ref={confirmNewPinRef}
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]{4}"
                defaultValue=""
                placeholder="Re-enter new 4-digit PIN"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangePinDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={setAppPin.isPending}>
                {setAppPin.isPending ? "Saving..." : "Change PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
