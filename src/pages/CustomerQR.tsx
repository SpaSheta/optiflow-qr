import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { Restaurant, RestaurantTheme, MenuCategory, MenuItem, Bill, BillItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt, UtensilsCrossed, Phone, Bell, MapPin,
  Instagram, Facebook, Globe, Loader2, AlertCircle,
  HandHelping, Banknote, MessageSquare
} from "lucide-react";

type TabType = "bill" | "menu" | "contact";

interface TableRow {
  id: string;
  restaurant_id: string | null;
  table_number: string;
  label: string | null;
  capacity: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

const CustomerQR = () => {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [table, setTable] = useState<TableRow | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("bill");
  const [updating, setUpdating] = useState(false);
  const [waiterSheetOpen, setWaiterSheetOpen] = useState(false);
  const [waiterMessage, setWaiterMessage] = useState("");
  const [waiterSending, setWaiterSending] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Apply theme CSS custom properties
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    const props: Record<string, string> = {
      "--page-bg": theme.background_color || "#F5F5F0",
      "--header-bg": theme.header_bg_color || theme.secondary_color || "#1E3A5F",
      "--header-text": theme.header_text_color || "#FFFFFF",
      "--tab-active": theme.tab_active_color || theme.primary_color || "#0FBCB0",
      "--card-bg": theme.card_bg_color || "#FFFFFF",
      "--body-text": theme.body_text_color || "#1F2937",
      "--price-color": theme.price_color || theme.primary_color || "#0FBCB0",
      "--accent": theme.primary_color || "#0FBCB0",
      "--qr-primary": theme.primary_color || "#F5A623",
      "--qr-secondary": theme.secondary_color || "#1E3A5F",
      "--qr-bg": theme.background_color || "#F5F5F0",
    };
    Object.entries(props).forEach(([k, v]) => root.style.setProperty(k, v));

    // Load Google Font
    if (theme.font_family) {
      const existing = document.getElementById("qr-google-font");
      if (existing) existing.remove();
      const link = document.createElement("link");
      link.id = "qr-google-font";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${theme.font_family.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }

    return () => {
      Object.keys(props).forEach((k) => root.style.removeProperty(k));
      const el = document.getElementById("qr-google-font");
      if (el) el.remove();
    };
  }, [theme]);

  const fetchBill = useCallback(async (tableId: string, restaurantId: string) => {
    const { data: billData } = await supabase
      .from("bills")
      .select("*")
      .eq("table_id", tableId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "open")
      .maybeSingle();

    setBill(billData as Bill | null);

    if (billData) {
      const { data: items } = await supabase
        .from("bill_items")
        .select("*")
        .eq("bill_id", billData.id)
        .eq("voided", false)
        .order("created_at", { ascending: true });
      setBillItems((items as BillItem[]) || []);
    } else {
      setBillItems([]);
    }
  }, []);

  // Initial data load — resolve token → table → restaurant
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Resolve QR token
        const { data: tokenRow, error: tokenErr } = await supabase
          .from("table_qr_tokens")
          .select("*")
          .eq("token", token!)
          .maybeSingle();
        if (tokenErr) throw tokenErr;
        if (!tokenRow) { setError("not_found"); setLoading(false); return; }

        // 2. Validate restaurant slug matches
        const { data: rest, error: restErr } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", tokenRow.restaurant_id!)
          .eq("slug", slug!)
          .maybeSingle();
        if (restErr) throw restErr;
        if (!rest) { setError("not_found"); setLoading(false); return; }
        setRestaurant(rest as Restaurant);

        const rid = rest.id;

        // 3. Fetch table + theme + menu in parallel
        const [tableRes, themeRes, menuCatRes, menuItemRes] = await Promise.all([
          supabase.from("tables").select("*").eq("id", tokenRow.table_id!).maybeSingle(),
          supabase.from("restaurant_themes").select("*").eq("restaurant_id", rid).maybeSingle(),
          supabase.from("menu_categories").select("*").eq("restaurant_id", rid).order("sort_order"),
          supabase.from("menu_items").select("*").eq("restaurant_id", rid).eq("is_available", true).order("sort_order"),
        ]);

        if (!tableRes.data) { setError("table_not_found"); setLoading(false); return; }
        setTable(tableRes.data as TableRow);
        setTheme(themeRes.data as RestaurantTheme | null);
        setCategories((menuCatRes.data as MenuCategory[]) || []);
        setMenuItems((menuItemRes.data as MenuItem[]) || []);
        if (menuCatRes.data?.length) setActiveCategory(menuCatRes.data[0].id);

        // Fetch bill
        await fetchBill(tableRes.data.id, rid);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, token, fetchBill]);

  // Realtime subscription
  useEffect(() => {
    if (!table || !restaurant) return;

    const refetch = () => {
      setUpdating(true);
      fetchBill(table.id, restaurant.id).finally(() => setTimeout(() => setUpdating(false), 600));
    };

    const channel = supabase
      .channel(`bill-updates-${table.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bills", filter: `table_id=eq.${table.id}` }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "bill_items", filter: `bill_id=eq.${bill?.id}` }, refetch)
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [table, restaurant, bill?.id, fetchBill]);

  const formatPrice = (amount: number) => {
    const currency = restaurant?.currency || "IQD";
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sendWaiterRequest = async (type: string, message?: string) => {
    if (!restaurant || !table) return;
    setWaiterSending(true);
    try {
      await supabase.from("waiter_requests").insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        bill_id: bill?.id || null,
        type,
        message: message || null,
      });
      toast({ title: "Your request has been sent! ✓" });
      setWaiterSheetOpen(false);
      setWaiterMessage("");
    } catch {
      toast({ title: "Failed to send request", variant: "destructive" });
    } finally {
      setWaiterSending(false);
    }
  };

  const primaryColor = theme?.primary_color || "#F5A623";
  const bgColor = theme?.background_color || "#F5F5F0";
  const secondaryColor = theme?.secondary_color || "#1E3A5F";
  const fontFamily = theme?.font_family || "Inter";
  const headerBg = theme?.header_bg_color || secondaryColor;
  const headerTextColor = theme?.header_text_color || "#FFFFFF";
  const tabActiveColor = theme?.tab_active_color || primaryColor;
  const cardBgColor = theme?.card_bg_color || "#FFFFFF";
  const bodyTextColor = theme?.body_text_color || "#1F2937";
  const priceTextColor = theme?.price_color || primaryColor;
  const accentColor = primaryColor;

  const menuByCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    categories.forEach((c) => { map[c.id] = []; });
    menuItems.forEach((item) => {
      if (item.category_id && map[item.category_id]) {
        map[item.category_id].push(item);
      }
    });
    return map;
  }, [categories, menuItems]);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12" style={{ backgroundColor: bgColor }}>
        <Skeleton className="mb-4 h-20 w-20 rounded-2xl" />
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="mb-6 h-4 w-24" />
        <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-full" />
        <div className="w-full max-w-sm space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">
          {error === "not_found" || error === "table_not_found" ? "Table not found" : "Something went wrong"}
        </p>
        <p className="text-sm text-muted-foreground">Please scan the QR code again or ask your server.</p>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "bill", label: "Bill", icon: <Receipt className="h-4 w-4" /> },
    { key: "menu", label: "Menu", icon: <UtensilsCrossed className="h-4 w-4" /> },
    { key: "contact", label: "Contact", icon: <Phone className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bgColor, fontFamily }}>
      {/* HEADER */}
      <header className="flex flex-col items-center px-5 pt-8 pb-4" style={{ backgroundColor: headerBg }}>
        {theme?.logo_url && (
          <img src={theme.logo_url} alt={restaurant?.name} className="mb-3 h-20 w-20 rounded-2xl object-contain" />
        )}
        {theme?.intro_video_url && (
          <video
            src={theme.intro_video_url}
            className="mb-3 w-full max-w-xs rounded-xl"
            autoPlay muted loop playsInline
          />
        )}
        <h1 className="mb-0.5 text-2xl font-bold" style={{ color: headerTextColor, fontFamily }}>
          {restaurant?.name}
        </h1>
        <p className="text-sm" style={{ color: headerTextColor, opacity: 0.7 }}>Table {table?.table_number}</p>
      </header>

      {/* STICKY TAB BAR */}
      <nav className="sticky top-0 z-30 flex justify-center gap-2 px-5 py-3" style={{ backgroundColor: bgColor }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-all"
            style={
              activeTab === t.key
                ? { backgroundColor: tabActiveColor, color: "#fff" }
                : { backgroundColor: "rgba(0,0,0,0.06)", color: bodyTextColor }
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-md px-4">
        {/* ====== BILL TAB ====== */}
        {activeTab === "bill" && (
          <section className="space-y-4">
            {updating && (
              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: secondaryColor }}>
                 <Loader2 className="h-3 w-3 animate-spin" /> Updating...
              </div>
            )}

            {!bill ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border">
                <Receipt className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No open bill yet — your items will appear here when ordered
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end">
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Live
                  </span>
                </div>

                <div className="space-y-2">
                  {billItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: cardBgColor }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate" style={{ color: bodyTextColor }}>{item.name}</span>
                        <span className="text-xs shrink-0" style={{ color: bodyTextColor, opacity: 0.45 }}>×{item.quantity}</span>
                      </div>
                      <span className="text-sm font-bold shrink-0 ml-3" style={{ color: priceTextColor }}>
                        {formatPrice(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="rounded-xl p-4 shadow-sm ring-1 ring-border" style={{ backgroundColor: cardBgColor }}>
                  <div className="flex justify-between text-sm" style={{ color: bodyTextColor, opacity: 0.6 }}>
                    <span>Subtotal</span><span>{formatPrice(bill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: bodyTextColor, opacity: 0.6 }}>
                    <span>Tax</span><span>{formatPrice(bill.tax_amount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold" style={{ color: bodyTextColor }}>
                    <span>Total</span><span>{formatPrice(bill.total)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    style={{ borderColor: accentColor, color: accentColor }}
                    onClick={() => navigate(`/r/${slug}/t/${token}/split`)}
                  >
                    Split Bill
                  </Button>
                  <Button
                    className="flex-1 rounded-xl text-white"
                    style={{ backgroundColor: accentColor }}
                    onClick={() => navigate(`/r/${slug}/t/${token}/pay`)}
                  >
                    Pay Now
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ====== MENU TAB ====== */}
        {activeTab === "menu" && (
          <section>
            {/* Category pills */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                  style={
                     activeCategory === cat.id
                       ? { backgroundColor: tabActiveColor, color: "#fff" }
                       : { backgroundColor: `${headerBg}12`, color: bodyTextColor }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {categories.map((cat) => {
              const items = menuByCategory[cat.id] || [];
              if (!items.length) return null;
              return (
                <div key={cat.id} ref={(el) => { categoryRefs.current[cat.id] = el; }} className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold" style={{ color: bodyTextColor }}>{cat.name}</h3>
                  <div className={theme?.menu_layout === "list" ? "space-y-3" : "grid grid-cols-2 gap-3"}>
                    {items.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-xl shadow-sm ring-1 ring-border" style={{ backgroundColor: cardBgColor }}>
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="h-28 w-full object-cover" />
                        )}
                        <div className="p-3">
                          <p className="text-sm font-medium" style={{ color: bodyTextColor }}>{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: bodyTextColor, opacity: 0.6 }}>{item.description}</p>
                          )}
                          <p className="mt-1.5 text-sm font-bold" style={{ color: priceTextColor }}>
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ====== CONTACT TAB ====== */}
        {activeTab === "contact" && (
          <section className="space-y-4">
            {(() => {
              const hasAddress = !!restaurant?.address?.trim();
              const hasPhone = !!restaurant?.phone?.trim();
              const hasInsta = !!restaurant?.instagram?.trim();
              const hasFb = !!restaurant?.facebook?.trim();
              const hasWeb = !!restaurant?.website?.trim();
              const hasAny = hasAddress || hasPhone || hasInsta || hasFb || hasWeb;

              if (!hasAny) {
                return (
                  <div className="flex flex-col items-center gap-3 rounded-xl p-8 text-center" style={{ backgroundColor: cardBgColor }}>
                    <Phone className="h-10 w-10" style={{ color: bodyTextColor, opacity: 0.3 }} />
                    <p className="text-sm" style={{ color: bodyTextColor, opacity: 0.5 }}>Contact info not available</p>
                  </div>
                );
              }

              return (
                <>
                  {hasAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant!.address!)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: cardBgColor }}
                    >
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accentColor }} />
                      <span className="text-sm" style={{ color: bodyTextColor }}>{restaurant!.address}</span>
                    </a>
                  )}
                  {hasPhone && (
                    <a href={`tel:${restaurant!.phone}`} className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: cardBgColor }}>
                      <Phone className="h-5 w-5 shrink-0" style={{ color: accentColor }} />
                      <span className="text-sm" style={{ color: bodyTextColor }}>{restaurant!.phone}</span>
                    </a>
                  )}
                  {(hasInsta || hasFb || hasWeb) && (
                    <div className="flex justify-center gap-4 pt-2">
                      {hasInsta && (
                        <a href={`https://instagram.com/${restaurant!.instagram}`} target="_blank" rel="noopener noreferrer"
                          className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
                          <Instagram className="h-5 w-5" style={{ color: accentColor }} />
                        </a>
                      )}
                      {hasFb && (
                        <a href={restaurant!.facebook!} target="_blank" rel="noopener noreferrer"
                          className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
                          <Facebook className="h-5 w-5" style={{ color: accentColor }} />
                        </a>
                      )}
                      {hasWeb && (
                        <a href={restaurant!.website!} target="_blank" rel="noopener noreferrer"
                          className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
                          <Globe className="h-5 w-5" style={{ color: accentColor }} />
                        </a>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}
      </main>

      {/* FLOATING WAITER BUTTON */}
      <button
        onClick={() => setWaiterSheetOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
        style={{ backgroundColor: accentColor, color: "#fff" }}
      >
        <Bell className="h-6 w-6" />
      </button>

      {/* WAITER REQUEST SHEET */}
      <Sheet open={waiterSheetOpen} onOpenChange={setWaiterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Request Waiter</SheetTitle>
            <SheetDescription>How can we help you?</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <button
              onClick={() => sendWaiterRequest("help")}
              disabled={waiterSending}
              className="flex w-full items-center gap-3 rounded-xl bg-muted p-4 text-left text-sm font-medium transition-colors hover:bg-accent"
            >
              <HandHelping className="h-5 w-5 text-muted-foreground" /> I need help
            </button>
            <button
              onClick={() => sendWaiterRequest("cash_payment")}
              disabled={waiterSending}
              className="flex w-full items-center gap-3 rounded-xl bg-muted p-4 text-left text-sm font-medium transition-colors hover:bg-accent"
            >
              <Banknote className="h-5 w-5 text-muted-foreground" /> I want to pay with cash
            </button>
            <div className="rounded-xl bg-muted p-4">
              <div className="mb-2 flex items-center gap-3 text-sm font-medium">
                <MessageSquare className="h-5 w-5 text-muted-foreground" /> Other
              </div>
              <Textarea
                placeholder="Write your message..."
                value={waiterMessage}
                onChange={(e) => setWaiterMessage(e.target.value)}
                className="mb-3"
              />
              <Button
                size="sm"
                disabled={waiterSending || !waiterMessage.trim()}
                onClick={() => sendWaiterRequest("other", waiterMessage)}
                style={{ backgroundColor: primaryColor }}
                className="text-white"
              >
                {waiterSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CustomerQR;
