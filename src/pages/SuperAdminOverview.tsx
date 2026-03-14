import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Count tables per restaurant
  const tablesPerRestaurant = new Map<string, number>();
  tables.forEach((t) => {
    if (t.restaurant_id) {
      tablesPerRestaurant.set(t.restaurant_id, (tablesPerRestaurant.get(t.restaurant_id) || 0) + 1);
    }
  });

  const activeCount = restaurants.filter((r) => r.status === "active" || !r.status).length;

  const stats = [
    { icon: Store, label: "Total Restaurants", value: restaurants.length, color: "text-blue-600 bg-blue-100" },
    { icon: Users, label: "Active Restaurants", value: activeCount, color: "text-emerald-600 bg-emerald-100" },
    { icon: TableProperties, label: "Total Tables", value: tables.length, color: "text-violet-600 bg-violet-100" },
    { icon: Receipt, label: "Bills Today", value: todayBills.length, color: "text-amber-600 bg-amber-100" },
  ];

  const recentRestaurants = restaurants.slice(0, 5);

  const planBadge = (plan: string | null) => {
    const p = plan ?? "starter";
    const colors: Record<string, string> = {
      starter: "bg-muted text-muted-foreground",
      pro: "bg-blue-100 text-blue-700",
      enterprise: "bg-violet-100 text-violet-700",
    };
    return <Badge className={colors[p] ?? colors.starter}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
  };

  const statusBadge = (status: string | null) => {
    const s = status ?? "active";
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      suspended: "bg-red-100 text-red-700",
      pending: "bg-amber-100 text-amber-700",
      inactive: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[s] ?? colors.active}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Overview
        </h1>
        <Button onClick={() => navigate("/super-admin/restaurants/new")}>
          + Create Restaurant
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Restaurants</h2>
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
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {r.name}
                  </button>
                </TableCell>
                <TableCell>{planBadge(r.plan)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-center">{tablesPerRestaurant.get(r.id) ?? 0}</TableCell>
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
