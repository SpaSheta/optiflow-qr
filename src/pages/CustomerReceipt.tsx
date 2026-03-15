import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme, Bill, BillItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle, Download, Share2, Star, Instagram, Facebook, Globe, ExternalLink,
} from "lucide-react";
import jsPDF from "jspdf";

interface PaymentRow {
  id: string;
  bill_id: string;
  bill_split_id: string | null;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

interface BillSplitRow {
  id: string;
  split_method: string;
  amount: number;
  item_ids: string[];
}

interface TableRow {
  id: string;
  table_number: string;
}

const CustomerReceipt = () => {
  const { slug, token, paymentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [table, setTable] = useState<TableRow | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [billSplit, setBillSplit] = useState<BillSplitRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

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

  // Show rating after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowRating(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Payment
        const { data: payData, error: payErr } = await supabase
          .from("payments").select("*").eq("id", paymentId!).maybeSingle();
        if (payErr) throw payErr;
        if (!payData) { setError("not_found"); setLoading(false); return; }
        setPayment(payData as unknown as PaymentRow);

        // 2. Bill
        const { data: billData } = await supabase
          .from("bills").select("*").eq("id", payData.bill_id!).maybeSingle();
        setBill(billData as Bill | null);

        // 3. Bill items
        if (billData) {
          const { data: items } = await supabase
            .from("bill_items").select("*").eq("bill_id", billData.id).eq("voided", false)
            .order("created_at", { ascending: true });
          setBillItems((items as BillItem[]) || []);
        }

        // 4. Bill split
        if (payData.bill_split_id) {
          const { data: splitData } = await supabase
            .from("bill_splits").select("*").eq("id", payData.bill_split_id).maybeSingle();
          setBillSplit(splitData as unknown as BillSplitRow | null);
        }

        // 5. Restaurant (from token)
        const { data: tokenRow } = await supabase
          .from("table_qr_tokens").select("*").eq("token", token!).maybeSingle();
        if (tokenRow) {
          const [restRes, tableRes, themeRes] = await Promise.all([
            supabase.from("restaurants").select("*").eq("id", tokenRow.restaurant_id!).eq("slug", slug!).maybeSingle(),
            supabase.from("tables").select("id, table_number").eq("id", tokenRow.table_id!).maybeSingle(),
            supabase.from("restaurant_themes").select("*").eq("restaurant_id", tokenRow.restaurant_id!).maybeSingle(),
          ]);
          setRestaurant(restRes.data as Restaurant | null);
          setTable(tableRes.data as TableRow | null);
          setTheme(themeRes.data as RestaurantTheme | null);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, token, paymentId]);

  const primaryColor = theme?.primary_color || "#F5A623";
  const bgColor = theme?.background_color || "#F5F5F0";
  const secondaryColor = theme?.secondary_color || "#1E3A5F";
  const fontFamily = theme?.font_family || "Inter";

  const formatPrice = useCallback((amt: number) => {
    const currency = restaurant?.currency || "EUR";
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(amt);
  }, [restaurant?.currency]);

  const paymentDate = payment
    ? new Date(payment.created_at)
    : new Date();

  const methodLabel = (m: string) => {
    if (m === "fib") return "FIB Pay ✓";
    if (m === "cash") return "Cash ✓";
    if (m === "card") return "Card ✓";
    return m;
  };

  const splitLabel = (s: string) => {
    if (s === "equal") return "Equal Split";
    if (s === "by_item") return "By Item";
    if (s === "custom") return "Custom Amount";
    return s;
  };

  // Filter items for by_item splits
  const displayItems = billSplit?.split_method === "by_item" && billSplit.item_ids?.length
    ? billItems.filter(item => billSplit.item_ids.includes(item.id))
    : billItems;

  const isPartialPay = billSplit?.split_method === "by_item" || billSplit?.split_method === "equal" || billSplit?.split_method === "custom";

  // PDF generation
  const generatePDF = () => {
    if (!restaurant || !payment || !bill) return;
    const doc = new jsPDF({ unit: "mm", format: [80, 200] });
    const w = 80;
    let y = 10;

    doc.setFontSize(14);
    doc.text(restaurant.name, w / 2, y, { align: "center" });
    y += 6;

    if (restaurant.address) {
      doc.setFontSize(8);
      doc.text(restaurant.address, w / 2, y, { align: "center" });
      y += 4;
    }
    if (restaurant.phone) {
      doc.text(restaurant.phone, w / 2, y, { align: "center" });
      y += 4;
    }

    y += 3;
    doc.setFontSize(10);
    doc.text("─── RECEIPT ───", w / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(8);
    doc.text(`Table: ${table?.table_number || "–"}`, 5, y);
    y += 4;
    doc.text(`Date: ${paymentDate.toLocaleDateString()} ${paymentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, 5, y);
    y += 4;
    doc.text(`Receipt #: ${payment.id.slice(0, 8).toUpperCase()}`, 5, y);
    y += 4;
    doc.text(`Payment: ${methodLabel(payment.method)}`, 5, y);
    y += 6;

    // Items
    doc.line(5, y, w - 5, y);
    y += 4;
    doc.setFontSize(7);
    doc.text("ITEM", 5, y);
    doc.text("QTY", 45, y, { align: "center" });
    doc.text("PRICE", w - 5, y, { align: "right" });
    y += 3;
    doc.line(5, y, w - 5, y);
    y += 4;

    displayItems.forEach(item => {
      doc.text(item.name.substring(0, 20), 5, y);
      doc.text(String(item.quantity), 45, y, { align: "center" });
      doc.text(formatPrice(item.total_price), w - 5, y, { align: "right" });
      y += 4;
    });

    y += 2;
    doc.line(5, y, w - 5, y);
    y += 4;

    doc.setFontSize(8);
    doc.text("Subtotal", 5, y);
    doc.text(formatPrice(bill.subtotal), w - 5, y, { align: "right" });
    y += 4;
    doc.text(`Tax`, 5, y);
    doc.text(formatPrice(bill.tax_amount), w - 5, y, { align: "right" });
    y += 4;
    doc.line(5, y, w - 5, y);
    y += 4;

    doc.setFontSize(10);
    doc.text("TOTAL", 5, y);
    doc.text(formatPrice(bill.total), w - 5, y, { align: "right" });
    y += 6;

    doc.setFontSize(9);
    doc.text("YOUR PAYMENT", 5, y);
    doc.text(formatPrice(payment.amount / 100), w - 5, y, { align: "right" });
    y += 8;

    doc.setFontSize(8);
    doc.text("Thank you for visiting!", w / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(6);
    doc.text("Powered by OptiFlow", w / 2, y, { align: "center" });

    const dateStr = paymentDate.toISOString().slice(0, 10);
    doc.save(`${restaurant.name.replace(/\s+/g, "-")}-receipt-${dateStr}.pdf`);
  };

  // Share
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt from ${restaurant?.name || "Restaurant"}`,
          text: `My receipt - ${formatPrice((payment?.amount || 0) / 100)}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied! ✓" });
    }
  };

  // Rating submit
  const submitRating = async () => {
    if (!restaurant || !bill || !payment || rating === 0) return;
    setRatingSubmitting(true);
    try {
      await supabase.from("ratings").insert({
        restaurant_id: restaurant.id,
        bill_id: bill.id,
        payment_id: payment.id,
        rating,
      });
      setRatingSubmitted(true);
      toast({ title: "Thank you for your feedback! ⭐" });
    } catch (e: any) {
      toast({ title: "Failed to submit rating", variant: "destructive" });
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12" style={{ backgroundColor: bgColor }}>
        <Skeleton className="mb-4 h-16 w-16 rounded-2xl" />
        <Skeleton className="mb-2 h-6 w-40" />
        <Skeleton className="mb-6 h-4 w-32" />
        <Skeleton className="h-96 w-full max-w-sm rounded-2xl" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: bgColor }}>
        <AlertCircle className="h-12 w-12" style={{ color: secondaryColor }} />
        <p className="text-lg font-medium" style={{ color: secondaryColor }}>Receipt not found</p>
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

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-8"
      style={{ backgroundColor: bgColor, fontFamily }}
    >
      {/* Receipt card */}
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-lg"
        style={{
          backgroundColor: "#FFFEF9",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.02) 24px)",
        }}
      >
        {/* Restaurant header */}
        <div className="flex flex-col items-center px-6 pt-8 pb-4">
          {theme?.logo_url && (
            <img
              src={theme.logo_url}
              alt={restaurant?.name}
              className="mb-3 h-16 w-16 rounded-2xl object-contain"
            />
          )}
          <h1 className="text-xl font-bold" style={{ color: secondaryColor }}>
            {restaurant?.name}
          </h1>
          {restaurant?.address && (
            <p className="mt-1 text-center text-xs" style={{ color: `${secondaryColor}80` }}>
              {restaurant.address}
            </p>
          )}
          {restaurant?.phone && (
            <p className="text-xs" style={{ color: `${secondaryColor}60` }}>
              {restaurant.phone}
            </p>
          )}
        </div>

        {/* RECEIPT divider */}
        <div className="flex items-center gap-3 px-6 py-2">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: `${secondaryColor}25` }} />
          <span className="text-xs font-bold tracking-[0.2em]" style={{ color: secondaryColor }}>RECEIPT</span>
          <div className="flex-1 border-t border-dashed" style={{ borderColor: `${secondaryColor}25` }} />
        </div>

        {/* Meta info */}
        <div className="space-y-1.5 px-6 py-3 text-xs" style={{ color: `${secondaryColor}90` }}>
          <div className="flex justify-between">
            <span>Table</span>
            <span className="font-medium">{table?.table_number || "–"}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium">
              {paymentDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
              {paymentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span className="font-mono font-medium">{payment.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span className="font-medium" style={{ color: primaryColor }}>{methodLabel(payment.method)}</span>
          </div>
        </div>

        {/* Items header */}
        <div className="border-t border-dashed px-6 pt-3 pb-1" style={{ borderColor: `${secondaryColor}20` }}>
          <div className="flex text-[10px] font-bold tracking-wider" style={{ color: `${secondaryColor}60` }}>
            <span className="flex-1">ITEM</span>
            <span className="w-10 text-center">QTY</span>
            <span className="w-16 text-right">PRICE</span>
          </div>
        </div>
        <div className="border-t" style={{ borderColor: `${secondaryColor}15` }} />

        {/* Items */}
        <div className="px-6 py-2">
          {displayItems.map(item => (
            <div key={item.id} className="flex items-center py-1.5 text-xs" style={{ color: secondaryColor }}>
              <span className="flex-1 truncate font-medium">{item.name}</span>
              <span className="w-10 text-center" style={{ color: `${secondaryColor}70` }}>{item.quantity}</span>
              <span className="w-16 text-right">{formatPrice(item.total_price)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed px-6 pt-3 pb-1" style={{ borderColor: `${secondaryColor}20` }}>
          <div className="flex justify-between text-xs" style={{ color: `${secondaryColor}80` }}>
            <span>Subtotal</span>
            <span>{formatPrice(bill?.subtotal || 0)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs" style={{ color: `${secondaryColor}80` }}>
            <span>Tax{restaurant?.tax_rate ? ` (${(restaurant.tax_rate * 100).toFixed(0)}%)` : ""}</span>
            <span>{formatPrice(bill?.tax_amount || 0)}</span>
          </div>
        </div>

        <div className="border-t px-6 py-2" style={{ borderColor: `${secondaryColor}20` }}>
          <div className="flex justify-between text-sm font-bold" style={{ color: secondaryColor }}>
            <span>TOTAL</span>
            <span>{formatPrice(bill?.total || 0)}</span>
          </div>
        </div>

        {/* Your payment - highlighted */}
        <div
          className="mx-4 mb-4 rounded-xl px-4 py-3"
          style={{ backgroundColor: `${primaryColor}12` }}
        >
          <div className="flex justify-between">
            <span className="text-sm font-bold" style={{ color: secondaryColor }}>YOUR PAYMENT</span>
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              {formatPrice(payment.amount / 100)}
            </span>
          </div>
          {billSplit && (
            <p className="mt-0.5 text-xs" style={{ color: `${secondaryColor}70` }}>
              Split: {splitLabel(billSplit.split_method)}
            </p>
          )}
          {isPartialPay && bill && (
            <p className="mt-0.5 text-xs" style={{ color: `${secondaryColor}60` }}>
              You paid {formatPrice(payment.amount / 100)} of {formatPrice(bill.total)} total
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dashed px-6 py-5 text-center" style={{ borderColor: `${secondaryColor}20` }}>
          <p className="text-sm font-medium" style={{ color: secondaryColor }}>
            Thank you for visiting! 🙏
          </p>

          {/* Social links */}
          <div className="mt-3 flex justify-center gap-4">
            {restaurant?.instagram && (
              <a
                href={`https://instagram.com/${restaurant.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {restaurant?.facebook && (
              <a
                href={restaurant.facebook.startsWith("http") ? restaurant.facebook : `https://facebook.com/${restaurant.facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {restaurant?.website && (
              <a
                href={restaurant.website.startsWith("http") ? restaurant.website : `https://${restaurant.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
          </div>

          <p className="mt-4 text-[10px]" style={{ color: `${secondaryColor}40` }}>
            Powered by OptiFlow
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex w-full max-w-sm gap-3">
        <button
          onClick={generatePDF}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-95"
          style={{ backgroundColor: "#fff", color: secondaryColor, border: `1.5px solid ${secondaryColor}20` }}
        >
          <Download className="h-4 w-4" />
          Save as PDF
        </button>
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-95"
          style={{ backgroundColor: "#fff", color: secondaryColor, border: `1.5px solid ${secondaryColor}20` }}
        >
          <Share2 className="h-4 w-4" />
          Share Receipt
        </button>
      </div>

      {/* Rating */}
      {showRating && !ratingSubmitted && (
        <div
          className="mt-5 w-full max-w-sm rounded-2xl p-5 text-center shadow-sm"
          style={{ backgroundColor: "#fff" }}
        >
          <p className="mb-3 text-sm font-medium" style={{ color: secondaryColor }}>
            Rate Your Experience
          </p>
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className="h-8 w-8"
                  fill={(hoverRating || rating) >= n ? primaryColor : "transparent"}
                  stroke={(hoverRating || rating) >= n ? primaryColor : `${secondaryColor}40`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <button
              onClick={submitRating}
              disabled={ratingSubmitting}
              className="rounded-full px-6 py-2 text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {ratingSubmitting ? "Submitting…" : "Submit Rating"}
            </button>
          )}
        </div>
      )}

      {ratingSubmitted && (
        <div
          className="mt-5 w-full max-w-sm rounded-2xl p-5 text-center"
          style={{ backgroundColor: "#fff" }}
        >
          <p className="text-sm font-medium" style={{ color: primaryColor }}>
            Thank you for your feedback! ⭐
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerReceipt;
