import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Users, AlertTriangle, TrendingUp, FileText } from "lucide-react";
import { useGetAllMedicines } from "../hooks/useQueries";
import { useGetAllDoctors } from "../hooks/useQueries";
import { useGetAllInvoices } from "../hooks/useQueries";
import { Skeleton } from "@/components/ui/skeleton";
import type { Medicine } from "../backend.d";

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  return expiry <= threeMonthsFromNow && expiry >= today;
}

function isExpired(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry < today;
}

export default function DashboardPage() {
  const { data: medicines = [], isLoading: medicinesLoading } =
    useGetAllMedicines();
  const { data: doctors = [], isLoading: doctorsLoading } = useGetAllDoctors();
  const { data: invoices = [], isLoading: invoicesLoading } =
    useGetAllInvoices();

  const totalInventoryValue = medicines.reduce(
    (sum, med) => sum + Number(med.quantity) * Number(med.purchaseRate),
    0
  );

  const expiringMedicines = medicines.filter(
    (med) => isExpiringSoon(med.expiryDate) || isExpired(med.expiryDate)
  );

  const recentInvoices = [...invoices]
    .sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber))
    .slice(0, 5);

  if (medicinesLoading || doctorsLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
          Dashboard Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor your pharmacy operations at a glance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold text-foreground">
              ₹{totalInventoryValue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase cost basis
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              Total Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold text-foreground">
              {medicines.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique SKUs in stock
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-success" />
              Registered Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold text-foreground">
              {doctors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active prescribers
            </p>
          </CardContent>
        </Card>
      </div>

      {expiringMedicines.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Expiry Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringMedicines.slice(0, 5).map((med: Medicine) => (
                <div
                  key={med.name}
                  className="flex items-center justify-between p-3 bg-card rounded-md border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{med.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Batch: {med.batchNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        isExpired(med.expiryDate) ? "destructive" : "secondary"
                      }
                      className={
                        !isExpired(med.expiryDate)
                          ? "bg-warning/20 text-warning-foreground border-warning/30"
                          : ""
                      }
                    >
                      {isExpired(med.expiryDate) ? "Expired" : "Expiring Soon"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(med.expiryDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No invoices generated yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={Number(invoice.invoiceNumber)}>
                    <TableCell className="font-mono text-sm">
                      #{invoice.invoiceNumber.toString().padStart(6, "0")}
                    </TableCell>
                    <TableCell>{invoice.doctorName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.items.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{Number(invoice.grandTotal).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
