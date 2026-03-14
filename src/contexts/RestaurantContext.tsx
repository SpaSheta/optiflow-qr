import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface RestaurantContextValue {
  user: User | null;
  restaurant: Restaurant | null;
  theme: RestaurantTheme | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue>({
  user: null,
  restaurant: null,
  theme: null,
  isSuperAdmin: false,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

export const useRestaurant = () => useContext(RestaurantContext);

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if super admin
      const { data: saData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (saData) {
        setIsSuperAdmin(true);
        setRestaurant(null);
        setTheme(null);
        setIsLoading(false);
        return;
      }

      setIsSuperAdmin(false);

      // Regular restaurant owner flow
      const { data: rest, error: restErr } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (restErr) throw restErr;
      setRestaurant(rest as Restaurant | null);

      if (rest) {
        const { data: themeData } = await supabase
          .from("restaurant_themes")
          .select("*")
          .eq("restaurant_id", rest.id)
          .maybeSingle();
        setTheme(themeData as RestaurantTheme | null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    if (user) await fetchUserData(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchUserData(u.id);
        } else {
          setRestaurant(null);
          setTheme(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserData(u.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <RestaurantContext.Provider value={{ user, restaurant, theme, isSuperAdmin, isLoading, error, refetch }}>
      {children}
    </RestaurantContext.Provider>
  );
};
