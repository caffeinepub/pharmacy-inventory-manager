import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, FileText, Settings, LayoutDashboard, ShoppingCart } from "lucide-react";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import DoctorsPage from "./pages/DoctorsPage";
import BillingPage from "./pages/BillingPage";
import InvoicesPage from "./pages/InvoicesPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-foreground">
                  PharmaCare ERP
                </h1>
                <p className="text-xs text-muted-foreground">
                  Inventory & Billing Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 h-auto p-1">
            <TabsTrigger
              value="dashboard"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger
              value="doctors"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Doctors</span>
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <DashboardPage />
          </TabsContent>
          <TabsContent value="inventory" className="mt-0">
            <InventoryPage />
          </TabsContent>
          <TabsContent value="doctors" className="mt-0">
            <DoctorsPage />
          </TabsContent>
          <TabsContent value="billing" className="mt-0">
            <BillingPage />
          </TabsContent>
          <TabsContent value="invoices" className="mt-0">
            <InvoicesPage />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border mt-12 py-6 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © 2026. Built with love using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
