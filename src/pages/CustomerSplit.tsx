import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme, Bill, BillItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle, Minus, Plus, Copy, Check, Delete, Receipt } from "lucide-react";

interface TableRow {
  id: string;
  restaurant_id: string | null;
  table_number: string;
}

type SplitTab = "equal" | "byItem" | "custom";

/* ── Helpers ── */

function getThemeVar(theme: RestaurantTheme | null, key: string, fallback: string): string {
  if (!theme) return fallback;
  const map: Record<string, string | null> = {
    pageBg: theme.background_color || "#F5F5F0",
    headerBg: theme.header_bg_color || theme.secondary_color || "#1E3A5F",
    headerText: theme.header_text_color || "#FFFFFF",
    tabActive: theme.tab_active_color || theme.primary_color || "#0FBCB0",
    cardBg: theme.card_bg_color || "#FFFFFF",
    bodyText: theme.body_text_color || "#1F2937",
    priceColor: theme.price_color || theme.primary_color || "#0FBCB0",
    accent: theme.primary_color || "#0FBCB0",
  };
  return map[key] || fallback;
}

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

  // Shared tax divider state
  const [numPeople, setNumPeople] = useState(2);

  // By item state
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  // Custom state
  const [customAmount, setCustomAmount] = useState("0");

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Theme colors
  const pageBg = getThemeVar(theme, "pageBg", "#F5F5F0");
  const headerBg = getThemeVar(theme, "headerBg", "#1E3A5F");
  const headerText = getThemeVar(theme, "headerText", "#FFFFFF");
  const tabActive = getThemeVar(theme, "tabActive", "#0FBCB0");
  const cardBg = getThemeVar(theme, "cardBg", "#FFFFFF");
  const bodyText = getThemeVar(theme, "bodyText", "#1F2937");
  const accent = getThemeVar(theme, "accent", "#0FBCB0");
  const fontFamily = theme?.font_family || "Inter";

  // Apply theme CSS variables
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    const props: Record<string, string> = {
      "--page-bg": pageBg,
      "--header-bg": headerBg,
      "--header-text": headerText,
      "--tab-active": tabActive,
      "--card-bg": cardBg,
      "--body-text": bodyText,
      "--accent": accent,
      "--price-color": getThemeVar(theme, "priceColor", "#0FBCB0"),
    };
    Object.entries(props).forEach(([k, v]) => root.style.setProperty(k, v));

    if (theme.font_family) {
      const existing = document.getElementById("split-google-font");
      if (existing) existing.remove();
      const link = document.createElement("link");
      link.id = "split-google-font";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${theme.font_family.replace(/ /g, "+")}:wght@400;500;600;700;800&display=swap`;
      document.head.appendChild(link);
    }
    return () => {
      Object.keys(props).forEach(k => root.style.removeProperty(k));
    };
  }, [theme, pageBg, headerBg, headerText, tabActive, cardBg, bodyText, accent]);

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

  const formatPrice = useCallback((amount: number) => {
    const currency = restaurant?.currency || "IQD";
    if (currency === "IQD") {
      return `IQD ${new Intl.NumberFormat().format(Math.round(amount))}`;
    }
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  }, [restaurant?.currency]);

  // Tax per person (shared across all tabs)
  const taxPerPerson = useMemo(() => {
    if (!bill || numPeople < 1) return 0;
    return Math.round(bill.tax_amount / numPeople);
  }, [bill, numPeople]);

  // Equal split
  const equalCalc = useMemo(() => {
    if (!bill) return { subtotalPerPerson: 0, taxPerPerson: 0, totalPerPerson: 0 };
    const subtotalPerPerson = Math.round(bill.subtotal / numPeople);
    return {
      subtotalPerPerson,
      taxPerPerson,
      totalPerPerson: subtotalPerPerson + taxPerPerson,
    };
  }, [bill, numPeople, taxPerPerson]);

  // By item
  const byItemCalc = useMemo(() => {
    let mySubtotal = 0;
    for (const item of billItems) {
      const qty = selectedItems.get(item.id);
      if (qty && qty > 0) mySubtotal += qty * item.unit_price;
    }
    return { mySubtotal, myTax: taxPerPerson, myTotal: mySubtotal + taxPerPerson };
  }, [billItems, selectedItems, taxPerPerson]);

  // Custom
  const customNum = parseInt(customAmount) || 0;
  const customOverflow = bill ? customNum > bill.total : false;

  const toggleItem = (itemId: string) => {
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

  // Custom keypad (whole numbers for IQD)
  const handleKeypad = (key: string) => {
    setCustomAmount(prev => {
      if (key === "backspace") {
        const newVal = prev.slice(0, -1);
        return newVal || "0";
      }
      if (key === ".") return prev;
      if (prev === "0") return key;
      if (prev.length >= 10) return prev;
      return prev + key;
    });
  };

  // Save split and navigate
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
          amount: Math.round(amount),
          status: "pending",
          item_ids: itemIds,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (data) sessionStorage.setItem("current_split_id", data.id);

      const params = new URLSearchParams({
        method: method === "byItem" ? "byitem" : method,
        amount: Math.round(amount).toString(),
      });
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

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12" style={{ backgroundColor: pageBg }}>
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-6 h-4 w-48" />
        <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-full" />
        <div className="w-full max-w-sm space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: pageBg }}>
        <AlertCircle className="h-12 w-12" style={{ color: bodyText }} />
        <p className="text-lg font-medium" style={{ color: bodyText }}>
          {error === "not_found" || error === "table_not_found" ? "Table not found" : "Something went wrong"}
        </p>
      </div>
    );
  }

  if (bill && bill.status !== "open") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: pageBg, fontFamily }}>
        <Check className="h-16 w-16 rounded-full p-3" style={{ backgroundColor: `${accent}20`, color: accent }} />
        <p className="text-lg font-semibold" style={{ color: bodyText }}>This bill has been paid ✓</p>
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="rounded-full px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: accent }}
        >
          Back to Bill
        </button>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: pageBg, fontFamily }}>
        <AlertCircle className="h-12 w-12" style={{ color: `${bodyText}60` }} />
        <p className="text-lg font-medium" style={{ color: bodyText }}>No open bill</p>
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="rounded-full px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: accent }}
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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: pageBg, fontFamily }}>
      {/* ── Header ── */}
      <header className="px-5 pt-5 pb-4" style={{ backgroundColor: headerBg }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/r/${slug}/t/${token}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={{ backgroundColor: `${headerText}15`, color: headerText }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl" style={{ color: headerText, fontWeight: 800 }}>Split Bill</h1>
            <p className="text-xs" style={{ color: headerText, opacity: 0.7 }}>
              Table {table?.table_number} · {formatPrice(bill.total)} total
            </p>
          </div>
        </div>
      </header>

      {/* ── Tax Divider Card ── */}
      {bill.tax_amount > 0 && (
        <div className="mx-5 mt-4 rounded-2xl p-4" style={{ backgroundColor: cardBg, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="mb-1 flex items-center gap-2">
            <Receipt className="h-4 w-4" style={{ color: accent }} />
            <span className="text-sm" style={{ color: bodyText, fontWeight: 700 }}>Tax Split</span>
          </div>
          <p className="mb-3 text-[13px]" style={{ color: `${bodyText}90` }}>
            Divide the tax equally between everyone at the table
          </p>
          <p className="mb-3 text-sm" style={{ color: bodyText }}>
            Total tax on this bill: <span style={{ fontWeight: 600 }}>{formatPrice(bill.tax_amount)}</span>
          </p>
          <p className="mb-2 text-sm" style={{ color: bodyText, fontWeight: 600 }}>
            How many people at the table?
          </p>
          {/* Stepper */}
          <div className="mb-3 flex items-center justify-center gap-4 rounded-xl py-2" style={{ backgroundColor: `${bodyText}06` }}>
            <button
              onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
              disabled={numPeople <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{ border: `1.5px solid ${accent}`, color: accent }}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[100px] text-center text-[22px] tabular-nums" style={{ color: bodyText, fontWeight: 800 }}>
              {numPeople} {numPeople === 1 ? "person" : "people"}
            </span>
            <button
              onClick={() => setNumPeople(Math.min(20, numPeople + 1))}
              disabled={numPeople >= 20}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{ border: `1.5px solid ${accent}`, color: accent }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {/* Tax per person result */}
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${accent}10` }}>
            <p className="text-xs" style={{ color: `${bodyText}80` }}>Each person's tax share:</p>
            <p className="text-[24px]" style={{ color: accent, fontWeight: 800 }}>
              {formatPrice(taxPerPerson)}
            </p>
            <p className="text-xs" style={{ color: `${bodyText}60` }}>per person</p>
          </div>
        </div>
      )}

      {/* ── Tab Pills ── */}
      <div className="mx-5 mt-4 rounded-[999px] p-1" style={{ backgroundColor: cardBg }}>
        <div className="flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex-1 rounded-full py-2.5 text-sm transition-all"
              style={
                activeTab === t.key
                  ? { backgroundColor: accent, color: "#fff", fontWeight: 600 }
                  : { color: `${bodyText}80`, fontWeight: 500 }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {activeTab === "equal" && (
          <EqualTabView
            numPeople={numPeople}
            calc={equalCalc}
            formatPrice={formatPrice}
            accent={accent}
            bodyText={bodyText}
            cardBg={cardBg}
            copied={copied}
            onCopy={copyLink}
            onPay={() => handlePay("equal", equalCalc.totalPerPerson)}
            saving={saving}
          />
        )}
        {activeTab === "byItem" && (
          <ByItemTabView
            billItems={billItems}
            selectedItems={selectedItems}
            toggleItem={toggleItem}
            setItemQty={setItemQty}
            calc={byItemCalc}
            formatPrice={formatPrice}
            accent={accent}
            bodyText={bodyText}
            cardBg={cardBg}
            onPay={() => handlePay("byItem", byItemCalc.myTotal)}
            saving={saving}
          />
        )}
        {activeTab === "custom" && (
          <CustomTabView
            customAmount={customAmount}
            customNum={customNum}
            overflow={customOverflow}
            bill={bill}
            taxPerPerson={taxPerPerson}
            equalSuggestion={equalCalc.totalPerPerson}
            formatPrice={formatPrice}
            accent={accent}
            bodyText={bodyText}
            cardBg={cardBg}
            onKey={handleKeypad}
            onPay={() => handlePay("custom", customNum)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════ EQUAL TAB ═══════════════════════════ */

function EqualTabView({
  numPeople, calc, formatPrice, accent, bodyText, cardBg,
  copied, onCopy, onPay, saving,
}: {
  numPeople: number;
  calc: { subtotalPerPerson: number; taxPerPerson: number; totalPerPerson: number };
  formatPrice: (n: number) => string;
  accent: string; bodyText: string; cardBg: string;
  copied: boolean; onCopy: () => void; onPay: () => void; saving: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Summary card */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: cardBg, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="mb-2 flex justify-between text-sm" style={{ color: `${bodyText}90` }}>
          <span>Subtotal per person</span>
          <span>{formatPrice(calc.subtotalPerPerson)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm" style={{ color: `${bodyText}90` }}>
          <span>Tax per person</span>
          <span>{formatPrice(calc.taxPerPerson)}</span>
        </div>
        <div className="border-t pt-3" style={{ borderColor: `${bodyText}15` }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: bodyText }}>Each person pays</span>
            <span className="text-2xl" style={{ color: accent, fontWeight: 800 }}>
              {formatPrice(calc.totalPerPerson)}
            </span>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="mt-5">
        <p className="mb-2 text-xs" style={{ color: `${bodyText}70` }}>
          Share this page with your group
        </p>
        <div className="flex gap-2">
          <div
            className="flex-1 overflow-hidden truncate rounded-xl px-3 py-2.5 text-xs"
            style={{ backgroundColor: `${bodyText}08`, color: `${bodyText}90` }}
          >
            {window.location.href}
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition-all"
            style={{ backgroundColor: copied ? "#22c55e" : accent }}
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
        style={{ backgroundColor: accent, marginTop: "auto", minHeight: "56px" }}
      >
        {saving ? "Saving…" : `Pay My Share ${formatPrice(calc.totalPerPerson)}`}
      </button>
    </div>
  );
}

/* ═══════════════════════════ BY ITEM TAB ═══════════════════════════ */

function ByItemTabView({
  billItems, selectedItems, toggleItem, setItemQty, calc, formatPrice,
  accent, bodyText, cardBg, onPay, saving,
}: {
  billItems: BillItem[];
  selectedItems: Map<string, number>;
  toggleItem: (id: string) => void;
  setItemQty: (id: string, qty: number) => void;
  calc: { mySubtotal: number; myTax: number; myTotal: number };
  formatPrice: (n: number) => string;
  accent: string; bodyText: string; cardBg: string;
  onPay: () => void; saving: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col pb-[220px]">
      <p className="mb-3 text-sm" style={{ color: `${bodyText}B3`, fontSize: 14 }}>
        Tap the items you ordered
      </p>

      <div className="space-y-2">
        {billItems.map(item => {
          const qty = selectedItems.get(item.id) || 0;
          const isSelected = qty > 0;

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-start rounded-xl px-4 py-3.5 transition-all"
                style={{
                  backgroundColor: isSelected ? `${accent}08` : cardBg,
                  borderLeft: isSelected ? `4px solid ${accent}` : `4px solid transparent`,
                  border: `1.5px solid ${isSelected ? accent : `${bodyText}18`}`,
                  borderLeftWidth: isSelected ? "4px" : "1.5px",
                  borderLeftColor: isSelected ? accent : `${bodyText}18`,
                }}
              >
                {/* Radio */}
                <div
                  className="mr-3 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isSelected ? accent : `${bodyText}30`,
                    backgroundColor: isSelected ? accent : "transparent",
                  }}
                >
                  {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                </div>
                {/* Text block */}
                <div className="flex flex-1 flex-col text-left">
                  <span className="text-sm" style={{ color: bodyText, fontWeight: 600 }}>
                    {item.name}
                  </span>
                  <span className="text-xs" style={{ color: `${bodyText}60` }}>
                    ×{item.quantity} on bill · {formatPrice(item.unit_price)} each
                  </span>
                </div>
              </button>

              {/* Quantity slider panel */}
              <div
                className="overflow-hidden transition-all duration-200"
                style={{
                  maxHeight: isSelected && item.quantity > 1 ? 200 : 0,
                  opacity: isSelected && item.quantity > 1 ? 1 : 0,
                }}
              >
                <div className="mx-2 mt-1 rounded-xl p-3" style={{ backgroundColor: `${bodyText}06` }}>
                  <p className="mb-2 text-xs" style={{ color: `${bodyText}80` }}>How many did you have?</p>
                  {/* Slider */}
                  <input
                    type="range"
                    min={1}
                    max={item.quantity}
                    step={1}
                    value={qty || 1}
                    onChange={e => setItemQty(item.id, parseInt(e.target.value))}
                    className="mb-2 h-1.5 w-full appearance-none rounded-full outline-none"
                    style={{
                      accentColor: accent,
                      background: `linear-gradient(to right, ${accent} 0%, ${accent} ${((qty || 1) - 1) / (item.quantity - 1) * 100}%, ${bodyText}20 ${((qty || 1) - 1) / (item.quantity - 1) * 100}%, ${bodyText}20 100%)`,
                    }}
                  />
                  {/* Counter */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setItemQty(item.id, Math.max(1, (qty || 1) - 1)); }}
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ border: `1.5px solid ${accent}`, color: accent }}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xl tabular-nums" style={{ color: bodyText, fontWeight: 800, fontSize: 20 }}>
                      {qty || 1} of {item.quantity}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setItemQty(item.id, Math.min(item.quantity, (qty || 1) + 1)); }}
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ border: `1.5px solid ${accent}`, color: accent }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 text-center text-lg" style={{ color: accent, fontWeight: 700, fontSize: 18 }}>
                    You pay: {formatPrice((qty || 1) * item.unit_price)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl px-5 pb-5 pt-4"
        style={{ backgroundColor: cardBg, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="mb-1 flex justify-between text-sm" style={{ color: `${bodyText}90` }}>
          <span>Your items</span>
          <span>{formatPrice(calc.mySubtotal)}</span>
        </div>
        <div className="mb-2 flex justify-between text-sm" style={{ color: `${bodyText}90` }}>
          <span>Your tax share</span>
          <span>{formatPrice(calc.myTax)}</span>
        </div>
        <div className="mb-3 flex justify-between border-t pt-2" style={{ borderColor: `${bodyText}15` }}>
          <span className="text-base" style={{ color: bodyText, fontWeight: 700 }}>Your total</span>
          <span className="text-xl" style={{ color: accent, fontWeight: 800 }}>{formatPrice(calc.myTotal)}</span>
        </div>
        <button
          onClick={onPay}
          disabled={calc.mySubtotal <= 0 || saving}
          className="w-full rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          {saving ? "Saving…" : `Pay My Share ${formatPrice(calc.myTotal)}`}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ CUSTOM TAB ═══════════════════════════ */

function CustomTabView({
  customAmount, customNum, overflow, bill, taxPerPerson, equalSuggestion,
  formatPrice, accent, bodyText, cardBg, onKey, onPay, saving,
}: {
  customAmount: string;
  customNum: number;
  overflow: boolean;
  bill: Bill;
  taxPerPerson: number;
  equalSuggestion: number;
  formatPrice: (n: number) => string;
  accent: string; bodyText: string; cardBg: string;
  onKey: (key: string) => void;
  onPay: () => void; saving: boolean;
}) {
  const progressPct = bill.total > 0 ? Math.min(100, (customNum / bill.total) * 100) : 0;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-4 text-center text-sm" style={{ color: `${bodyText}90` }}>
        Enter the amount you want to pay
      </p>

      {/* Amount display */}
      <div className="mb-2 text-center">
        <span style={{ color: bodyText, fontWeight: 800, fontSize: 48 }} className="tabular-nums">
          {formatPrice(customNum)}
        </span>
      </div>

      {overflow && (
        <p className="mb-3 text-center text-xs font-medium" style={{ color: "#ef4444" }}>
          Amount exceeds remaining bill balance
        </p>
      )}

      {/* Keypad */}
      <div className="mx-auto mb-4 grid w-full max-w-[300px] grid-cols-3 gap-2.5">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => onKey(key)}
            className="flex items-center justify-center rounded-xl text-2xl transition-all active:scale-95"
            style={{
              backgroundColor: cardBg,
              color: bodyText,
              fontWeight: 600,
              height: 64,
              border: `1px solid ${bodyText}10`,
              borderRadius: 12,
            }}
          >
            {key === "backspace" ? <Delete className="h-5 w-5" /> : key}
          </button>
        ))}
      </div>

      {/* Reference card */}
      <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: cardBg, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="mb-1 flex justify-between text-sm" style={{ color: `${bodyText}80` }}>
          <span>Bill total</span>
          <span>{formatPrice(bill.total)}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm" style={{ color: `${bodyText}80` }}>
          <span>Your tax share</span>
          <span>{formatPrice(taxPerPerson)}</span>
        </div>
        <div className="flex justify-between text-sm" style={{ color: `${bodyText}80` }}>
          <span>Suggested amount</span>
          <span style={{ fontWeight: 600 }}>{formatPrice(equalSuggestion)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-1">
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${bodyText}12` }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: overflow ? "#ef4444" : accent }}
          />
        </div>
        <p className="mt-1 text-center text-xs" style={{ color: `${bodyText}60` }}>
          {formatPrice(customNum)} of {formatPrice(bill.total)}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onPay}
        disabled={customNum <= 0 || overflow || saving}
        className="mt-auto rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ backgroundColor: accent, minHeight: 56 }}
      >
        {saving ? "Saving…" : `Pay ${formatPrice(customNum)}`}
      </button>
    </div>
  );
}

export default CustomerSplit;
