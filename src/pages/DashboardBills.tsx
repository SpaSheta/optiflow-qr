import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus, Trash2, Receipt, Search, Loader2 } from "lucide-react";
import type { Bill, BillItem, MenuItem, MenuCategory } from "@/lib/types";
import PendingCashPayments from "@/components/PendingCashPayments";

const DashboardBills = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const rid = restaurant?.id;
  const taxRate = restaurant?.tax_rate ?? 0;
  const qc = useQueryClient();

  const [localItems, setLocalItems] = useState<BillItem[]>([]);
  const [localBill, setLocalBill] = useState<Bill | null>(null);
  const [search, setSearch] = useState("");
  const [mutating, setMutating] = useState(false);

  // Fetch table info
  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*").eq("id", tableId!).maybeSingle();
      return data;
    },
    enabled: !!tableId,
  });

  // Fetch open bill
  const { data: bill, refetch: refetchBill } = useQuery({
    queryKey: ["bill", tableId, rid],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills").select("*")
        .eq("table_id", tableId!).eq("restaurant_id", rid!)
        .eq("status", "open").maybeSingle();
      return data as Bill | null;
    },
    enabled: !!tableId && !!rid,
  });

  // Fetch bill items
  const { data: billItems = [], refetch: refetchItems } = useQuery({
    queryKey: ["bill-items", bill?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bill_items").select("*")
        .eq("bill_id", bill!.id).eq("voided", false)
        .order("created_at");
      return (data as BillItem[]) || [];
    },
    enabled: !!bill?.id,
  });

  // Fetch menu
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items", rid],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", rid!).order("sort_order");
      return (data as MenuItem[]) || [];
    },
    enabled: !!rid,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories", rid],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").eq("restaurant_id", rid!).order("sort_order");
      return (data as MenuCategory[]) || [];
    },
    enabled: !!rid,
  });

  // Sync server → local
  useEffect(() => { setLocalItems(billItems); }, [billItems]);
  useEffect(() => { setLocalBill(bill ?? null); }, [bill]);

  const formatPrice = useCallback((amount: number) => {
    const currency = restaurant?.currency || "IQD";
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  }, [restaurant?.currency]);

  const recalcAndUpdateBill = useCallback(async (items: BillItem[], billId: string) => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tax_amount = Math.round(subtotal * taxRate);
    const total = subtotal + tax_amount;
    setLocalBill((prev) => prev ? { ...prev, subtotal, tax_amount, total } : prev);

    const { error } = await supabase.from("bills").update({ subtotal, tax_amount, total, updated_at: new Date().toISOString() }).eq("id", billId);
    if (error) throw error;
  }, [taxRate]);

  // Open new bill
  const openBill = async () => {
    if (!rid || !tableId) return;
    setMutating(true);
    try {
      const { error } = await supabase.from("bills").insert({
        restaurant_id: rid,
        table_id: tableId,
        status: "open",
        subtotal: 0,
        tax_amount: 0,
        total: 0,
      });
      if (error) throw error;
      await refetchBill();
      toast.success("Bill opened");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMutating(false);
    }
  };

  // Update item quantity
  const updateQty = async (item: BillItem, delta: number) => {
    if (!localBill) return;
    const newQty = item.quantity + delta;

    // Optimistic
    let updatedItems: BillItem[];
    if (newQty <= 0) {
      updatedItems = localItems.filter((i) => i.id !== item.id);
    } else {
      updatedItems = localItems.map((i) => i.id === item.id ? { ...i, quantity: newQty, total_price: newQty * i.unit_price } : i);
    }
    setLocalItems(updatedItems);

    try {
      if (newQty <= 0) {
        const { error } = await supabase.from("bill_items").delete().eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bill_items").update({ quantity: newQty, total_price: newQty * item.unit_price }).eq("id", item.id);
        if (error) throw error;
      }
      await recalcAndUpdateBill(updatedItems, localBill.id);
    } catch (e: any) {
      // Revert
      setLocalItems(billItems);
      setLocalBill(bill ?? null);
      toast.error(e.message);
    }
  };

  // Remove item
  const removeItem = async (itemId: string) => {
    if (!localBill) return;
    const updatedItems = localItems.filter((i) => i.id !== itemId);
    setLocalItems(updatedItems);

    try {
      const { error } = await supabase.from("bill_items").delete().eq("id", itemId);
      if (error) throw error;
      await recalcAndUpdateBill(updatedItems, localBill.id);
    } catch (e: any) {
      setLocalItems(billItems);
      toast.error(e.message);
    }
  };

  // Add item from menu
  const addMenuItem = async (menuItem: MenuItem) => {
    if (!localBill || !rid) return;
    if (!menuItem.is_available) return;

    // Check if already exists
    const existing = localItems.find((i) => i.menu_item_id === menuItem.id);
    if (existing) {
      await updateQty(existing, 1);
      return;
    }

    // Optimistic add
    const tempId = crypto.randomUUID();
    const newItem: BillItem = {
      id: tempId,
      bill_id: localBill.id,
      restaurant_id: rid,
      menu_item_id: menuItem.id,
      name: menuItem.name,
      quantity: 1,
      unit_price: menuItem.price,
      total_price: menuItem.price,
      notes: null,
      voided: false,
      created_at: new Date().toISOString(),
    };
    const updatedItems = [...localItems, newItem];
    setLocalItems(updatedItems);

    try {
      const { data, error } = await supabase.from("bill_items").insert({
        bill_id: localBill.id,
        restaurant_id: rid,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        unit_price: menuItem.price,
        total_price: menuItem.price,
      }).select().single();
      if (error) throw error;
      // Replace temp with real
      setLocalItems((prev) => prev.map((i) => i.id === tempId ? (data as BillItem) : i));
      await recalcAndUpdateBill(updatedItems, localBill.id);
    } catch (e: any) {
      setLocalItems(billItems);
      toast.error(e.message);
    }
  };

  // Mark as paid
  const markAsPaid = async () => {
    if (!localBill) return;
    setMutating(true);
    try {
      const { error } = await supabase.from("bills").update({
        status: "paid",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", localBill.id);
      if (error) throw error;
      toast.success("Bill closed ✓");
      navigate("/dashboard/tables");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMutating(false);
    }
  };

  // Filtered menu search
  const filteredMenu = useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter((m) => m.name.toLowerCase().includes(q));
  }, [menuItems, search]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/dashboard/tables")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Table {table?.table_number ?? "…"}
        </h1>
        {localBill && (
          <Badge variant={localBill.status === "open" ? "default" : "secondary"} className="ml-1">
            {localBill.status === "open" ? "Open" : "Paid"}
          </Badge>
        )}
        <div className="ml-auto">
          {localBill?.status === "open" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="cta" size="sm" disabled={mutating}>Mark as Paid</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this bill?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Close this bill for {formatPrice(localBill.total)}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={markAsPaid}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!localBill && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Receipt className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">No open bill for this table</p>
          <Button onClick={openBill} disabled={mutating} size="lg">
            {mutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Open Table
          </Button>
        </div>
      )}

      {/* Bill UI */}
      {localBill?.status === "open" && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Items + summary: left 3 cols */}
          <div className="space-y-4 lg:col-span-3">
            {localItems.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet — add from the menu below.</p>
            )}

            {localItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.unit_price)} each</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="w-20 text-right font-bold text-foreground">{formatPrice(item.quantity * item.unit_price)}</p>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}

            {/* Summary */}
            {localItems.length > 0 && (
              <Card>
                <CardContent className="space-y-2 p-5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatPrice(localBill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({((taxRate) * 100).toFixed(1)}%)</span>
                    <span>{formatPrice(localBill.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatPrice(localBill.total)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add item: right 2 cols */}
          <div className="lg:col-span-2">
            <div className="sticky top-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Add Item</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-xl border bg-card p-2">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addMenuItem(item)}
                    disabled={!item.is_available}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      item.is_available
                        ? "hover:bg-accent text-foreground"
                        : "cursor-not-allowed text-muted-foreground opacity-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      {item.category_id && categoryMap[item.category_id] && (
                        <p className="text-xs text-muted-foreground">{categoryMap[item.category_id]}</p>
                      )}
                    </div>
                    <span className="ml-3 shrink-0 font-semibold">{formatPrice(item.price)}</span>
                  </button>
                ))}
                {filteredMenu.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No items found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBills;
