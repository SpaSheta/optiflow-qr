import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Store, TableProperties, Receipt, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    queryKey: ["sa-tables-count"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("id");
      return data ?? [];
    },
  });

  const { data: openBills = [] } = useQuery({
    queryKey: ["sa-open-bills"],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("id").eq("status", "open");
      return data ?? [];
    },
  });

  const activeRestaurants = restaurants.filter((r) => r.status === "active" || !r.status);

  const stats = [
    { icon: Store, label: "Total Restaurants", value: restaurants.length },
    { icon: Users, label: "Active", value: activeRestaurants.length },
    { icon: TableProperties, label: "Total Tables", value: tables.length },
    { icon: Receipt, label: "Open Bills", value: openBills.length },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Super Admin Overview
        </h1>
        <Button onClick={() => navigate("/super-admin/restaurants/new")}>
          + New Restaurant
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {restaurants.slice(0, 5).map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.slug} · {r.plan ?? "starter"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  r.status === "active" || !r.status
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {r.status ?? "active"}
                </span>
              </button>
            ))}
            {restaurants.length === 0 && (
              <p className="px-5 py-8 text-center text-muted-foreground">No restaurants yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminOverview;
