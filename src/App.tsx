import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import ProtectedRoute, { SuperAdminRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DashboardTables from "@/pages/DashboardTables";
import DashboardBills from "@/pages/DashboardBills";
import DashboardMenu from "@/pages/DashboardMenu";
import DashboardTheme from "@/pages/DashboardTheme";
import DashboardSettings from "@/pages/DashboardSettings";
import CustomerQR from "@/pages/CustomerQR";
import CustomerSplit from "@/pages/CustomerSplit";
import CustomerPay from "@/pages/CustomerPay";
import CustomerReceipt from "@/pages/CustomerReceipt";
import SuperAdminOverview from "@/pages/SuperAdminOverview";
import SuperAdminRestaurants from "@/pages/SuperAdminRestaurants";
import SuperAdminRestaurantNew from "@/pages/SuperAdminRestaurantNew";
import SuperAdminRestaurantDetail from "@/pages/SuperAdminRestaurantDetail";
import SuperAdminRestaurantTables from "@/pages/SuperAdminRestaurantTables";
import SuperAdminRequests from "@/pages/SuperAdminRequests";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import Signup from "@/pages/Signup";

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
            <Route path="/signup" element={<Signup />} />
            <Route path="/r/:slug/t/:token" element={<CustomerQR />} />
            <Route path="/r/:slug/t/:token/split" element={<CustomerSplit />} />
            <Route path="/r/:slug/t/:token/pay" element={<CustomerPay />} />
            <Route path="/r/:slug/t/:token/receipt/:paymentId" element={<CustomerReceipt />} />

            {/* Super Admin */}
            <Route
              element={
                <SuperAdminRoute>
                  <SuperAdminLayout />
                </SuperAdminRoute>
              }
            >
              <Route path="/super-admin" element={<SuperAdminOverview />} />
              <Route path="/super-admin/restaurants" element={<SuperAdminRestaurants />} />
              <Route path="/super-admin/restaurants/new" element={<SuperAdminRestaurantNew />} />
              <Route path="/super-admin/restaurants/:id" element={<SuperAdminRestaurantDetail />} />
              <Route path="/super-admin/restaurants/:id/tables" element={<SuperAdminRestaurantTables />} />
              <Route path="/super-admin/requests" element={<SuperAdminRequests />} />
            </Route>

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

            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
