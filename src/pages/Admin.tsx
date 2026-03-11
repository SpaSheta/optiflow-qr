import { useState } from "react";
import {
  LayoutGrid,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Receipt,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
];

type TableStatus = "occupied" | "empty" | "attention";
const TABLES: { id: number; status: TableStatus; guests?: number }[] = [
  { id: 1, status: "occupied", guests: 4 },
  { id: 2, status: "empty" },
  { id: 3, status: "attention", guests: 2 },
  { id: 4, status: "occupied", guests: 6 },
  { id: 5, status: "empty" },
  { id: 6, status: "occupied", guests: 3 },
  { id: 7, status: "occupied", guests: 2 },
  { id: 8, status: "empty" },
  { id: 9, status: "attention", guests: 5 },
  { id: 10, status: "empty" },
  { id: 11, status: "occupied", guests: 1 },
  { id: 12, status: "empty" },
];

const WAITER_REQUESTS = [
  { id: 1, table: 3, request: "Extra napkins", time: "2 min ago" },
  { id: 2, table: 9, request: "Bill requested", time: "5 min ago" },
  { id: 3, table: 1, request: "Water refill", time: "8 min ago" },
  { id: 4, table: 7, request: "Menu needed", time: "12 min ago" },
];

const statusColors: Record<TableStatus, string> = {
  occupied: "bg-primary/15 ring-primary/30 text-primary",
  empty: "bg-secondary ring-border text-muted-foreground",
  attention: "bg-destructive/10 ring-destructive/30 text-destructive",
};

const Admin = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {!collapsed && (
            <span
              className="text-base font-bold text-foreground"
              style={{ fontFamily: "var(--restaurant-name)" }}
            >
              Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                activeNav === item.label
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <h1
          className="mb-6 text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--restaurant-name)" }}
        >
          Dashboard
        </h1>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<DollarSign />} label="Today's Revenue" value="€2,847.50" />
          <StatCard icon={<Receipt />} label="Active Bills" value="7" />
          <StatCard icon={<Users />} label="Guests Served" value="43" />
        </div>

        {/* Tables Grid */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Active Tables</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {TABLES.map((table) => (
              <div
                key={table.id}
                className={`flex flex-col items-center justify-center rounded-2xl p-4 ring-1 transition-all hover:scale-105 ${statusColors[table.status]}`}
              >
                <span className="text-lg font-bold">{table.id}</span>
                <span className="text-[10px] uppercase tracking-wider">
                  {table.status === "attention" ? "Help" : table.status}
                </span>
                {table.guests && (
                  <span className="mt-1 text-xs opacity-70">{table.guests} guests</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Empty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" /> Needs Attention
            </span>
          </div>
        </div>

        {/* Waiter Requests */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Waiter Requests</h2>
          <div className="space-y-2">
            {WAITER_REQUESTS.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Table {req.table} — {req.request}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{req.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {icon}
    </div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default Admin;
