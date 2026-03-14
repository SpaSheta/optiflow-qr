import { useRestaurant } from "@/contexts/RestaurantContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutGrid, UtensilsCrossed, Palette, Settings, LogOut, TableProperties } from "lucide-react";

const cards = [
  { label: "Tables", icon: TableProperties, path: "/dashboard/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/dashboard/menu" },
  { label: "Theme", icon: Palette, path: "/dashboard/theme" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const Dashboard = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background px-5 pb-10 pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
              {restaurant?.name}
            </h1>
            <p className="text-sm text-muted-foreground">Dashboard</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {cards.map((c) => (
            <button
              key={c.path}
              onClick={() => navigate(c.path)}
              className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 ring-1 ring-border transition-all hover:shadow-md hover:ring-primary/30"
            >
              <c.icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-semibold text-foreground">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
