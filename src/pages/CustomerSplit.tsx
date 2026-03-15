import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme, Bill, BillItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle, Minus, Plus, Copy, Check, Delete } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TableRow {
  id: string;
  restaurant_id: string | null;
  table_number: string;
}

type SplitTab = "equal" | "byItem" | "custom";

const CustomerSplit = () => {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [table, setTable] = useState<TableRow | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SplitTab>("equal");
  const [saving, setSaving] = useState(false);

  // Equal split state
  const [numPeople, setNumPeople] = useState(2);

  // By item state
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  // Custom state
  const [customAmount, setCustomAmount] = useState("0.00");

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Apply theme
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primary_color) root.style.setProperty("--qr-primary", theme.primary_color);
    if (theme.secondary_color) root.style.setProperty("--qr-secondary", theme.secondary_color);
    if (theme.background_color) root.style.setProperty("--qr-bg", theme.background_color);
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
      root.style.removeProperty("--qr-primary");
      root.style.removeProperty("--qr-secondary");
      root.style.removeProperty("--qr-bg");
    };
  }, [theme]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const { data: tokenRow } = await supabase
          .from("table_qr_tokens").select("*").eq("token", token!).maybeSingle();
        if (!tokenRow) { setError("not_found"); setLoading(false); return; }

        const { data: rest } = await supabase
          .from("restaurants").select("*").eq("id", tokenRow.restaurant_id!).eq("slug", slug!).maybeSingle();
        if (!rest) { setError("not_found"); setLoading(false); return; }
        setRestaurant(rest as Restaurant);

        const [tableRes, themeRes] = await Promise.all([
          supabase.from("tables").select("id, restaurant_id, table_number").eq("id", tokenRow.table_id!).maybeSingle(),
          supabase.from("restaurant_themes").select("*").eq("restaurant_id", rest.id).maybeSingle(),
        ]);

        if (!tableRes.data) { setError("table_not_found"); setLoading(false); return; }
        setTable(tableRes.data as TableRow);
        setTheme(themeRes.data as RestaurantTheme | null);

        // Fetch open bill
        const { data: billData } = await supabase
          .from("bills").select("*")
          .eq("table_id", tableRes.data.id).eq("restaurant_id", rest.id)
          .eq("status", "open").maybeSingle();
        setBill(billData as Bill | null);

        if (billData) {
          const { data: items } = await supabase
            .from("bill_items").select("*").eq("bill_id", billData.id).eq("voided", false)
            .order("created_at", { ascending: true });
          setBillItems((items as BillItem[]) || []);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, token]);

  const primaryColor = theme?.primary_color || "#F5A623";
  const bgColor = theme?.background_color || "#F5F5F0";
  const secondaryColor = theme?.secondary_color || "#1E3A5F";
  const fontFamily = theme?.font_family || "Inter";

  const formatPrice = useCallback((amount: number) => {
    const currency = restaurant?.currency || "EUR";
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  }, [restaurant?.currency]);

  // ── Equal split calculations ──
  const equalCalc = useMemo(() => {
    if (!bill) return { sharePerPerson: 0, taxPerPerson: 0, totalPerPerson: 0 };
    const sharePerPerson = Math.round((bill.subtotal / numPeople) * 100) / 100;
    const taxPerPerson = Math.round((bill.tax_amount / numPeople) * 100) / 100;
    const totalPerPerson = Math.round((sharePerPerson + taxPerPerson) * 100) / 100;
    return { sharePerPerson, taxPerPerson, totalPerPerson };
  }, [bill, numPeople]);

  // ── By item calculations ──
  const byItemCalc = useMemo(() => {
    if (!bill) return { mySubtotal: 0, myTax: 0, myTotal: 0 };
    let mySubtotal = 0;
    for (const item of billItems) {
      const qty = selectedItems.get(item.id);
      if (qty && qty > 0) {
        mySubtotal += qty * item.unit_price;
      }
    }
    const myTax = bill.subtotal > 0
      ? Math.round((mySubtotal / bill.subtotal) * bill.tax_amount * 100) / 100
      : 0;
    return { mySubtotal, myTax, myTotal: Math.round((mySubtotal + myTax) * 100) / 100 };
  }, [bill, billItems, selectedItems]);

  // ── Custom amount ──
  const customNum = parseFloat(customAmount) || 0;
  const remaining = bill ? Math.max(0, bill.total - customNum) : 0;
  const customOverflow = bill ? customNum > bill.total : false;

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(itemId) && (next.get(itemId) || 0) > 0) {
        next.delete(itemId);
      } else {
        next.set(itemId, 1);
      }
      return next;
    });
  };

  const setItemQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.set(itemId, qty);
      return next;
    });
  };

  // ── Custom keypad ──
  const handleKeypad = (key: string) => {
    setCustomAmount(prev => {
      if (key === "backspace") {
        // Remove last char, if we reach empty reset to 0.00
        const stripped = prev.replace(".", "");
        const newStripped = stripped.slice(0, -1) || "0";
        const cents = newStripped.padStart(3, "0");
        return (parseInt(cents.slice(0, -2) || "0")).toString() + "." + cents.slice(-2);
      }
      if (key === ".") return prev; // decimal handled via cents
      // Append digit
      const stripped = prev.replace(".", "") + key;
      const cents = stripped.padStart(3, "0");
      const intPart = parseInt(cents.slice(0, -2) || "0");
      return intPart.toString() + "." + cents.slice(-2);
    });
  };

  // ── Save split and navigate ──
  const handlePay = async (method: SplitTab, amount: number) => {
    if (!bill || saving) return;
    setSaving(true);
    try {
      const itemIds = method === "byItem"
        ? Array.from(selectedItems.entries()).filter(([, q]) => q > 0).map(([id]) => id)
        : [];

      const { data, error: insertErr } = await supabase
        .from("bill_splits")
        .insert({
          bill_id: bill.id,
          split_method: method === "byItem" ? "by_item" : method,
          amount: Math.round(amount * 100), // store in cents
          status: "pending",
          item_ids: itemIds,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (data) sessionStorage.setItem("current_split_id", data.id);

      const params = new URLSearchParams({ method: method === "byItem" ? "byitem" : method, amount: amount.toFixed(2) });
      if (method === "equal") params.set("people", numPeople.toString());
      navigate(`/r/${slug}/t/${token}/pay?${params.toString()}`);
    } catch (e: any) {
      toast({ title: "Failed to save split", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link copied! ✓" });
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12" style={{ backgroundColor: bgColor }}>
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-6 h-4 w-48" />
        <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-full" />
        <div className="w-full max-w-sm space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: bgColor }}>
        <AlertCircle className="h-12 w-12" style={{ color: secondaryColor }} />
        <p className="text-lg font-medium" style={{ color: secondaryColor }}>
          {error === "not_found" || error === "table_not_found" ? "Table not found" : "Something went wrong"}
        </p>
        <p className="text-sm" style={{ color: `${secondaryColor}99` }}>Please scan the QR code again.</p>
      </div>
    );
  }

  // ── Bill already paid ──
  if (bill && bill.status !== "open") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: bgColor, fontFamily }}>
        <Check className="h-16 w-16 rounded-full p-3" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }} />
        <p className="text-lg font-semibold" style={{ color: secondaryColor }}>This bill has been paid ✓</p>
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="rounded-full px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Back to Bill
        </button>
      </div>
    );
  }

  // ── No open bill ──
  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: bgColor, fontFamily }}>
        <AlertCircle className="h-12 w-12" style={{ color: `${secondaryColor}60` }} />
        <p className="text-lg font-medium" style={{ color: secondaryColor }}>No open bill</p>
        <p className="text-sm" style={{ color: `${secondaryColor}80` }}>There's nothing to split yet.</p>
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="rounded-full px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Back
        </button>
      </div>
    );
  }

  const tabs: { key: SplitTab; label: string }[] = [
    { key: "equal", label: "Equal" },
    { key: "byItem", label: "By Item" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: bgColor, fontFamily }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
          style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: secondaryColor }}>Split Bill</h1>
          <p className="text-xs" style={{ color: `${secondaryColor}80` }}>
            Table {table?.table_number} · {formatPrice(bill.total)} total
          </p>
        </div>
      </header>

      {/* Tab pills */}
      <div className="flex gap-2 px-5 py-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={
              activeTab === t.key
                ? { backgroundColor: primaryColor, color: "#fff" }
                : { backgroundColor: `${secondaryColor}10`, color: secondaryColor }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        {activeTab === "equal" && (
          <EqualTab
            numPeople={numPeople}
            setNumPeople={setNumPeople}
            calc={equalCalc}
            formatPrice={formatPrice}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            copied={copied}
            onCopy={copyLink}
            onPay={() => handlePay("equal", equalCalc.totalPerPerson)}
            saving={saving}
          />
        )}
        {activeTab === "byItem" && (
          <ByItemTab
            billItems={billItems}
            selectedItems={selectedItems}
            toggleItem={toggleItem}
            setItemQty={setItemQty}
            calc={byItemCalc}
            formatPrice={formatPrice}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onPay={() => handlePay("byItem", byItemCalc.myTotal)}
            saving={saving}
          />
        )}
        {activeTab === "custom" && (
          <CustomTab
            customAmount={customAmount}
            customNum={customNum}
            remaining={remaining}
            overflow={customOverflow}
            billTotal={bill.total}
            formatPrice={formatPrice}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onKey={handleKeypad}
            onPay={() => handlePay("custom", customNum)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════ EQUAL TAB ═══════════════════════════════════ */

function EqualTab({
  numPeople, setNumPeople, calc, formatPrice, primaryColor, secondaryColor,
  copied, onCopy, onPay, saving,
}: {
  numPeople: number;
  setNumPeople: (n: number) => void;
  calc: { sharePerPerson: number; taxPerPerson: number; totalPerPerson: number };
  formatPrice: (n: number) => string;
  primaryColor: string; secondaryColor: string;
  copied: boolean; onCopy: () => void; onPay: () => void; saving: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Stepper */}
      <p className="mb-4 text-center text-sm font-medium" style={{ color: secondaryColor }}>
        How many people are splitting?
      </p>
      <div className="mb-6 flex items-center justify-center gap-5">
        <button
          onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
          disabled={numPeople <= 2}
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all disabled:opacity-30"
          style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
        >
          <Minus className="h-5 w-5" />
        </button>
        <span className="text-5xl font-bold tabular-nums" style={{ color: secondaryColor }}>
          {numPeople}
        </span>
        <button
          onClick={() => setNumPeople(Math.min(20, numPeople + 1))}
          disabled={numPeople >= 20}
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all disabled:opacity-30"
          style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Summary card */}
      <div className="mb-4 rounded-2xl p-5 shadow-sm" style={{ backgroundColor: "#fff" }}>
        <div className="mb-2 flex justify-between text-sm" style={{ color: `${secondaryColor}99` }}>
          <span>Subtotal split</span>
          <span>{formatPrice(calc.sharePerPerson)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm" style={{ color: `${secondaryColor}99` }}>
          <span>Tax included</span>
          <span>{formatPrice(calc.taxPerPerson)}</span>
        </div>
        <div className="border-t pt-3" style={{ borderColor: `${secondaryColor}15` }}>
          <div className="flex justify-between">
            <span className="text-sm font-medium" style={{ color: secondaryColor }}>Each person pays</span>
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              {formatPrice(calc.totalPerPerson)}
            </span>
          </div>
        </div>
      </div>

      <p className="mb-1 text-xs" style={{ color: `${secondaryColor}70` }}>
        Includes {formatPrice(calc.taxPerPerson)} tax per person
      </p>

      {/* Share link */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium" style={{ color: `${secondaryColor}99` }}>
          Share this split with your group
        </p>
        <div className="flex gap-2">
          <div
            className="flex-1 overflow-hidden truncate rounded-xl px-3 py-2.5 text-xs"
            style={{ backgroundColor: `${secondaryColor}08`, color: `${secondaryColor}90` }}
          >
            {window.location.href}
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition-all"
            style={{ backgroundColor: copied ? "#22c55e" : primaryColor }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onPay}
        disabled={saving}
        className="mt-auto rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: primaryColor, marginTop: "auto", minHeight: "56px" }}
      >
        {saving ? "Saving…" : `Pay My Share ${formatPrice(calc.totalPerPerson)}`}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════ BY ITEM TAB ═══════════════════════════════════ */

function ByItemTab({
  billItems, selectedItems, toggleItem, setItemQty, calc, formatPrice,
  primaryColor, secondaryColor, onPay, saving,
}: {
  billItems: BillItem[];
  selectedItems: Map<string, number>;
  toggleItem: (id: string, max: number) => void;
  setItemQty: (id: string, qty: number) => void;
  calc: { mySubtotal: number; myTax: number; myTotal: number };
  formatPrice: (n: number) => string;
  primaryColor: string; secondaryColor: string;
  onPay: () => void; saving: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-sm" style={{ color: `${secondaryColor}99` }}>
        Tap the items you're paying for
      </p>

      <div className="flex-1 space-y-2 pb-4">
        {billItems.map(item => {
          const qty = selectedItems.get(item.id) || 0;
          const isSelected = qty > 0;
          const displayPrice = isSelected ? qty * item.unit_price : item.total_price;

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleItem(item.id, item.quantity)}
                className="flex w-full items-center rounded-xl px-4 py-3.5 transition-all"
                style={{
                  backgroundColor: isSelected ? `${primaryColor}08` : "#fff",
                  border: `1.5px solid ${isSelected ? primaryColor : `${secondaryColor}18`}`,
                }}
              >
                {/* Radio circle */}
                <div
                  className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isSelected ? primaryColor : `${secondaryColor}30`,
                    backgroundColor: isSelected ? primaryColor : "transparent",
                  }}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span className="flex-1 text-left text-sm font-medium" style={{ color: secondaryColor }}>
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="ml-1 text-xs" style={{ color: `${secondaryColor}60` }}>×{item.quantity}</span>
                  )}
                </span>
                <span className="text-sm" style={{ color: `${secondaryColor}80` }}>
                  {formatPrice(displayPrice)}
                </span>
              </button>

              {/* Quantity selector for multi-qty items */}
              {isSelected && item.quantity > 1 && (
                <div
                  className="mx-4 mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs"
                  style={{ backgroundColor: `${secondaryColor}06`, color: `${secondaryColor}90` }}
                >
                  <span className="shrink-0">How many did you have?</span>
                  <select
                    value={qty}
                    onChange={e => setItemQty(item.id, parseInt(e.target.value))}
                    className="flex-1 rounded-md border bg-white px-2 py-1 text-sm font-medium"
                    style={{ borderColor: `${secondaryColor}20`, color: secondaryColor }}
                  >
                    {Array.from({ length: item.quantity }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n} ({formatPrice(n * item.unit_price)})
                      </option>
                    ))}
                  </select>
                  <span className="shrink-0 font-semibold" style={{ color: primaryColor }}>
                    You pay: {formatPrice(qty * item.unit_price)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-5 rounded-t-2xl px-5 pb-5 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" style={{ backgroundColor: bgColorFor(secondaryColor) }}>
        <div className="mb-1 flex justify-between text-sm" style={{ color: `${secondaryColor}99` }}>
          <span>Your items</span>
          <span>{formatPrice(calc.mySubtotal)}</span>
        </div>
        <div className="mb-2 flex justify-between text-sm" style={{ color: `${secondaryColor}99` }}>
          <span>Your tax share</span>
          <span>{formatPrice(calc.myTax)}</span>
        </div>
        <div className="mb-4 flex justify-between border-t pt-2" style={{ borderColor: `${secondaryColor}15` }}>
          <span className="text-base font-semibold" style={{ color: secondaryColor }}>Your total</span>
          <span className="text-xl font-bold" style={{ color: primaryColor }}>{formatPrice(calc.myTotal)}</span>
        </div>
        <button
          onClick={onPay}
          disabled={calc.myTotal <= 0 || saving}
          className="w-full rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? "Saving…" : `Pay My Share ${formatPrice(calc.myTotal)}`}
        </button>
      </div>
    </div>
  );
}

function bgColorFor(secondaryColor: string) {
  // Use a very light tint of the page background
  return "#fff";
}

/* ═══════════════════════════════════ CUSTOM TAB ═══════════════════════════════════ */

function CustomTab({
  customAmount, customNum, remaining, overflow, billTotal, formatPrice,
  primaryColor, secondaryColor, onKey, onPay, saving,
}: {
  customAmount: string;
  customNum: number;
  remaining: number;
  overflow: boolean;
  billTotal: number;
  formatPrice: (n: number) => string;
  primaryColor: string; secondaryColor: string;
  onKey: (key: string) => void;
  onPay: () => void; saving: boolean;
}) {
  const progressPct = billTotal > 0 ? Math.min(100, (customNum / billTotal) * 100) : 0;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-6 text-center text-sm font-medium" style={{ color: secondaryColor }}>
        Enter the amount you want to pay
      </p>

      {/* Amount display */}
      <div className="mb-2 text-center">
        <span className="text-5xl font-bold tabular-nums" style={{ color: secondaryColor }}>
          {formatPrice(customNum)}
        </span>
      </div>

      <p className="mb-4 text-center text-xs" style={{ color: `${secondaryColor}70` }}>
        Remaining on bill: {formatPrice(remaining)}
      </p>

      {overflow && (
        <p className="mb-3 text-center text-xs font-medium" style={{ color: "#ef4444" }}>
          Amount exceeds bill total
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${secondaryColor}12` }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: overflow ? "#ef4444" : primaryColor,
            }}
          />
        </div>
      </div>

      {/* Keypad */}
      <div className="mx-auto mb-6 grid w-full max-w-[280px] grid-cols-3 gap-3">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => onKey(key)}
            className="flex h-14 items-center justify-center rounded-xl text-xl font-medium transition-all active:scale-95"
            style={{
              backgroundColor: `${secondaryColor}08`,
              color: secondaryColor,
            }}
          >
            {key === "backspace" ? <Delete className="h-5 w-5" /> : key}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onPay}
        disabled={customNum <= 0 || overflow || saving}
        className="mt-auto rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ backgroundColor: primaryColor }}
      >
        {saving ? "Saving…" : `Pay ${formatPrice(customNum)}`}
      </button>
    </div>
  );
}

export default CustomerSplit;
