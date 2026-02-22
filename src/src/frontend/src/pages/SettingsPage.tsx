import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Building2 } from "lucide-react";
import {
  useGetFirmSettings,
  useUpdateFirmSettings,
} from "../hooks/useQueries";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsFormData {
  name: string;
  address: string;
  gstin: string;
  contact: string;
  email: string;
  shippingAddress: string;
  dilNumber: string;
}

export default function SettingsPage() {
  const { data: firmSettings, isLoading } = useGetFirmSettings();
  const updateFirmSettings = useUpdateFirmSettings();

  const [formData, setFormData] = useState<SettingsFormData>({
    name: "",
    address: "",
    gstin: "",
    contact: "",
    email: "",
    shippingAddress: "",
    dilNumber: "",
  });

  useEffect(() => {
    if (firmSettings) {
      setFormData({
        name: firmSettings.name,
        address: firmSettings.address,
        gstin: firmSettings.gstin,
        contact: firmSettings.contact,
        email: firmSettings.email,
        shippingAddress: firmSettings.shippingAddress,
        dilNumber: firmSettings.dilNumber,
      });
    }
  }, [firmSettings]);

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
        shippingAddress: formData.shippingAddress,
        dilNumber: formData.dilNumber,
      });
      toast.success("Firm settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings: " + (error as Error).message);
    }
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
                  setFormData(prev => ({ ...prev, name: e.target.value }))
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
                  setFormData(prev => ({ ...prev, address: e.target.value }))
                }
                placeholder="123 Main Street, City, State - 123456"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shippingAddress">Shipping Address</Label>
              <Textarea
                id="shippingAddress"
                value={formData.shippingAddress}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))
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
                  setFormData(prev => ({ ...prev, gstin: e.target.value }))
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
                  setFormData(prev => ({ ...prev, dilNumber: e.target.value }))
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
                      setFormData(prev => ({ ...prev, contact: e.target.value }))
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
                      setFormData(prev => ({ ...prev, email: e.target.value }))
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
                {updateFirmSettings.isPending
                  ? "Saving..."
                  : "Save Settings"}
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
                      shippingAddress: firmSettings.shippingAddress,
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

      <Card className="max-w-3xl bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • These details will appear on all generated invoices and official
            documents.
          </p>
          <p>
            • Ensure GSTIN is accurate for compliance with GST regulations.
          </p>
          <p>
            • Contact information helps customers reach you for queries and
            support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
