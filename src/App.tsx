import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DashboardTables from "@/pages/DashboardTables";
import DashboardBills from "@/pages/DashboardBills";
import DashboardMenu from "@/pages/DashboardMenu";
import DashboardTheme from "@/pages/DashboardTheme";
import DashboardSettings from "@/pages/DashboardSettings";
import CustomerQR from "@/pages/CustomerQR";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RestaurantProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/r/:slug/t/:tableNumber" element={<CustomerQR />} />

            {/* Protected dashboard with shared layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/tables" element={<DashboardTables />} />
              <Route path="/dashboard/bills/:tableId" element={<DashboardBills />} />
              <Route path="/dashboard/menu" element={<DashboardMenu />} />
              <Route path="/dashboard/theme" element={<DashboardTheme />} />
              <Route path="/dashboard/settings" element={<DashboardSettings />} />
            </Route>

            {/* Redirect root to login */}
            <Route path="/" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
