import { Outlet, useNavigate, useLocation } from "react-router-dom";
import optiflowIcon from "@/assets/optiflow-icon.png";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
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
  { label: "Tables", icon: TableProperties, path: "/dashboard/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/dashboard/menu" },
  { label: "Theme", icon: Palette, path: "/dashboard/theme" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const DashboardLayout = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img src={optiflowIcon} alt="OptiFlow" className="h-7 w-7" />
        <span
          className="text-lg font-bold text-sidebar-foreground"
          style={{ fontFamily: "var(--restaurant-name)" }}
        >
          OptiFlow
        </span>
        </span>
        <button
          className="ml-auto md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5 text-sidebar-foreground" />
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
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              isActive(item.path)
                ? "bg-sidebar-accent font-semibold text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        <p className="mb-2 truncate px-3 text-xs font-medium text-muted-foreground">
          {restaurant?.name}
        </p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
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
      <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
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
          "fixed inset-y-0 left-0 z-50 w-56 bg-sidebar transition-transform md:hidden",
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
          <span
            className="ml-3 text-base font-bold text-foreground"
            style={{ fontFamily: "var(--restaurant-name)" }}
          >
            OptiFlow
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
