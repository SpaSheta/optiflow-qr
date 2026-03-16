import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Store, Users, TableProperties, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SuperAdminOverview = () => {
  const navigate = useNavigate();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["sa-restaurants"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["sa-all-tables"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("id, restaurant_id");
      return data ?? [];
    },
  });

  const { data: todayBills = [] } = useQuery({
    queryKey: ["sa-today-bills"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("bills")
        .select("id")
        .gte("opened_at", todayStart.toISOString());
      return data ?? [];
    },
  });

  const tablesPerRestaurant = new Map<string, number>();
  tables.forEach((t) => {
    if (t.restaurant_id) {
      tablesPerRestaurant.set(t.restaurant_id, (tablesPerRestaurant.get(t.restaurant_id) || 0) + 1);
    }
  });

  const activeCount = restaurants.filter((r) => r.status === "active" || !r.status).length;

  const stats = [
    { icon: Store, label: "Total Restaurants", value: restaurants.length, color: "text-blue-600 bg-blue-50" },
    { icon: Users, label: "Active Restaurants", value: activeCount, color: "text-emerald-600 bg-emerald-50" },
    { icon: TableProperties, label: "Total Tables", value: tables.length, color: "text-violet-600 bg-violet-50" },
    { icon: Receipt, label: "Bills Today", value: todayBills.length, color: "text-warning bg-amber-50" },
  ];

  const recentRestaurants = restaurants.slice(0, 5);

  const planBadge = (plan: string | null) => {
    const p = plan ?? "starter";
    const colors: Record<string, string> = {
      starter: "bg-muted text-muted-foreground",
      pro: "badge-paid",
      enterprise: "bg-violet-50 text-violet-700",
    };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[p] ?? colors.starter}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>;
  };

  const statusBadge = (status: string | null) => {
    const s = status ?? "active";
    const colors: Record<string, string> = {
      active: "badge-open",
      suspended: "badge-suspended",
      pending: "badge-pending",
      inactive: "bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
    };
    return <span className={colors[s] ?? colors.active}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-h1 text-foreground">
          Overview
        </h1>
        <Button onClick={() => navigate("/super-admin/restaurants/new")}>
          + Create Restaurant
        </Button>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="stat-card">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-label">{s.label}</p>
              <p className="text-stat text-secondary">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-h2 text-foreground">Recent Restaurants</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/restaurants")}>
          View All →
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tables</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRestaurants.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}
                    className="font-bold text-foreground hover:text-primary hover:underline"
                  >
                    {r.name}
                  </button>
                </TableCell>
                <TableCell>{planBadge(r.plan)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-center font-bold">{tablesPerRestaurant.get(r.id) ?? 0}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at!).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}>
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {recentRestaurants.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No restaurants yet. Create your first one!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SuperAdminOverview;
