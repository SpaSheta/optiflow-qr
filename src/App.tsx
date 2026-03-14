import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import ProtectedRoute from "@/components/ProtectedRoute";

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

            {/* Protected dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/tables" element={<ProtectedRoute><DashboardTables /></ProtectedRoute>} />
            <Route path="/dashboard/bills/:tableId" element={<ProtectedRoute><DashboardBills /></ProtectedRoute>} />
            <Route path="/dashboard/menu" element={<ProtectedRoute><DashboardMenu /></ProtectedRoute>} />
            <Route path="/dashboard/theme" element={<ProtectedRoute><DashboardTheme /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />

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
