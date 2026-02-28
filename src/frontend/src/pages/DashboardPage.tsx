import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import type {
  Medicine,
  ProfitLossStats,
  ProfitLossTimeFilter,
} from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  useGetAllDoctors,
  useGetAllInvoices,
  useGetAllMedicines,
} from "../hooks/useQueries";

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
  const [profitLossFilter, setProfitLossFilter] = useState<string>("all");

  const { actor, isFetching: actorFetching } = useActor();
  const { data: medicines = [], isLoading: medicinesLoading } =
    useGetAllMedicines();
  const { data: doctors = [], isLoading: doctorsLoading } = useGetAllDoctors();
  const { data: invoices = [], isLoading: invoicesLoading } =
    useGetAllInvoices();

  const { data: profitLossStats, isLoading: statsLoading } =
    useQuery<ProfitLossStats>({
      queryKey: ["profitLossStats", profitLossFilter],
      queryFn: async () => {
        if (!actor) throw new Error("Actor not initialized");
        return actor.getProfitLossStats(
          profitLossFilter as ProfitLossTimeFilter,
        );
      },
      enabled: !!actor && !actorFetching,
    });

  const totalInventoryValue = medicines.reduce(
    (sum, med) => sum + Number(med.quantity) * Number(med.purchaseRate),
    0,
  );

  const expiringMedicines = medicines.filter(
    (med) => isExpiringSoon(med.expiryDate) || isExpired(med.expiryDate),
  );

  const recentInvoices = [...invoices]
    .sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber))
    .slice(0, 5);

  const isProfit = profitLossStats
    ? Number(profitLossStats.netProfit) >= 0
    : true;
  const profitMarginPercent = profitLossStats
    ? Number(profitLossStats.profitMargin) / 100
    : 0;

  if (medicinesLoading || doctorsLoading || invoicesLoading || statsLoading) {
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
          Monitor your pharmacy operations and profitability
        </p>
      </div>

      {/* Profit/Loss Analytics Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Profit & Loss Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={profitLossFilter} onValueChange={setProfitLossFilter}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          {profitLossStats && (
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-foreground">
                    ₹
                    {Number(profitLossStats.totalRevenue).toLocaleString(
                      "en-IN",
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-foreground">
                    ₹{Number(profitLossStats.totalCost).toLocaleString("en-IN")}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 ${isProfit ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    {isProfit ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    Net {isProfit ? "Profit" : "Loss"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${isProfit ? "text-success" : "text-destructive"}`}
                  >
                    ₹{Number(profitLossStats.netProfit).toLocaleString("en-IN")}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Profit Margin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${isProfit ? "text-success" : "text-destructive"}`}
                  >
                    {profitMarginPercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Invoice Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-foreground">
                    {Number(profitLossStats.invoiceCount)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Section */}
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
