import { Outlet, useNavigate, useLocation } from "react-router-dom";
import optiflowIcon from "@/assets/optiflow-icon.png";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { usePendingCashCount } from "@/components/PendingCashPayments";
import {
  LayoutGrid,
  TableProperties,
  UtensilsCrossed,
  Palette,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", icon: LayoutGrid, path: "/dashboard" },
  { label: "Tables", icon: TableProperties, path: "/dashboard/tables", showBadge: true },
  { label: "Menu", icon: UtensilsCrossed, path: "/dashboard/menu" },
  { label: "Theme", icon: Palette, path: "/dashboard/theme" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const DashboardLayout = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingCashCount = usePendingCashCount();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <img src={optiflowIcon} alt="OptiFlow" className="h-7 w-7" />
        <span className="text-[22px] font-extrabold text-white">
          OptiFlow
        </span>
        <button
          className="ml-auto md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5 text-white/70" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive(item.path)
                ? "bg-primary/15 border-l-[3px] border-primary font-bold text-primary"
                : "text-white/70 hover:bg-white/5"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.showBadge && pendingCashCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-white">
                {pendingCashCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        <p className="mb-2 truncate px-3 text-label text-white/50">
          {restaurant?.name}
        </p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <img src={optiflowIcon} alt="OptiFlow" className="ml-3 h-6 w-6" />
          <span className="ml-1.5 text-base font-extrabold text-foreground">
            OptiFlow
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
