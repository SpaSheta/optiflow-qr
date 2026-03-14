import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme } from "@/lib/types";

const CustomerQR = () => {
  const { slug, tableNumber } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (rest) {
        setRestaurant(rest as Restaurant);
        const { data: t } = await supabase
          .from("restaurant_themes")
          .select("*")
          .eq("restaurant_id", rest.id)
          .maybeSingle();
        setTheme(t as RestaurantTheme | null);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Restaurant not found.</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center px-5 pb-10 pt-12"
      style={{ backgroundColor: theme?.background_color || undefined }}
    >
      {theme?.logo_url && (
        <img src={theme.logo_url} alt={restaurant.name} className="mb-4 h-20 w-20 rounded-2xl object-contain" />
      )}
      <h1
        className="mb-1 text-3xl font-bold"
        style={{ color: theme?.secondary_color || undefined, fontFamily: theme?.font_family }}
      >
        {restaurant.name}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">Table {tableNumber}</p>

      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
        <p className="text-center text-sm text-secondary-foreground">
          Welcome! Your server will be with you shortly. Scan QR to view the menu and manage your bill.
        </p>
      </div>
    </div>
  );
};

export default CustomerQR;
