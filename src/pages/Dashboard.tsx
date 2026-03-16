import { useRestaurant } from "@/contexts/RestaurantContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableProperties, Receipt, DollarSign, Bell } from "lucide-react";

const Dashboard = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const rid = restaurant?.id;

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", rid],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*").eq("restaurant_id", rid!).order("table_number");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: openBills = [] } = useQuery({
    queryKey: ["open-bills", rid],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*").eq("restaurant_id", rid!).eq("status", "open");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["pending-requests", rid],
    queryFn: async () => {
      const { data } = await supabase.from("waiter_requests").select("*").eq("restaurant_id", rid!).eq("status", "pending");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const billTableIds = new Set(openBills.map((b) => b.table_id));
  const attentionTableIds = new Set(pendingRequests.map((r) => r.table_id));

  const todayRevenue = openBills.reduce((sum, b) => sum + (b.total ?? 0), 0);

  const getStatus = (tableId: string) => {
    if (attentionTableIds.has(tableId)) return "attention";
    if (billTableIds.has(tableId)) return "open";
    return "empty";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      empty: { label: "Empty", className: "badge-paid" },
      open: { label: "Open Bill", className: "badge-open" },
      attention: { label: "Needs Attention", className: "badge-suspended" },
    };
    const s = map[status] ?? map.empty;
    return <span className={s.className}>{s.label}</span>;
  };

  const stats = [
    { icon: TableProperties, label: "Active Tables", value: tables.filter((t) => t.is_active).length },
    { icon: Receipt, label: "Open Bills", value: openBills.length },
    { icon: DollarSign, label: "Today Revenue", value: `${(todayRevenue / 100).toFixed(2)} ${restaurant?.currency ?? ""}` },
    { icon: Bell, label: "Pending Requests", value: pendingRequests.length },
  ];

  return (
    <div>
      <h1 className="text-h1 text-foreground mb-8">
        Overview
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="stat-card">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-label">{s.label}</p>
              <p className="text-stat text-secondary">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((t) => {
              const status = getStatus(t.id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-bold">{t.table_number}</TableCell>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell className="text-right">
                    {status !== "empty" && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/bills/${t.id}`)}>
                        View Bill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {tables.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No tables yet. Add them in the Tables page.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Dashboard;
