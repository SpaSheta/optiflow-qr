import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, RestaurantTheme, Bill } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, AlertCircle, Check, Loader2, Landmark, Banknote, CreditCard, QrCode, Clock,
} from "lucide-react";

interface TableRow {
  id: string;
  restaurant_id: string | null;
  table_number: string;
}

type PayMethod = "fib" | "cash" | "card";

interface PaymentRecord {
  id: string;
  status: string;
  fib_qr_url: string | null;
  fib_deep_link: string | null;
  expires_at: string | null;
}

const CustomerPay = () => {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const splitMethod = searchParams.get("method") || "custom";
  const amount = parseFloat(searchParams.get("amount") || "0");
  const people = searchParams.get("people");

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme | null>(null);
  const [table, setTable] = useState<TableRow | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("fib");
  const [processing, setProcessing] = useState(false);

  // FIB state
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [fibScreen, setFibScreen] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
  const [fibExpired, setFibExpired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cash state
  const [cashSent, setCashSent] = useState(false);

  const billSplitId = typeof window !== "undefined"
    ? sessionStorage.getItem("current_split_id")
    : null;

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

        const { data: billData } = await supabase
          .from("bills").select("*")
          .eq("table_id", tableRes.data.id).eq("restaurant_id", rest.id)
          .eq("status", "open").maybeSingle();
        setBill(billData as Bill | null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, token]);

  // Cleanup polling/timer on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Realtime subscription for payment status
  useEffect(() => {
    if (!payment) return;
    const channel = supabase
      .channel(`payment-${payment.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "payments",
        filter: `id=eq.${payment.id}`,
      }, (payload) => {
        const newStatus = (payload.new as any).status;
        if (newStatus === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          navigate(`/r/${slug}/t/${token}/receipt/${payment.id}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [payment, slug, token, navigate]);

  const primaryColor = theme?.primary_color || "#F5A623";
  const bgColor = theme?.background_color || "#F5F5F0";
  const secondaryColor = theme?.secondary_color || "#1E3A5F";
  const fontFamily = theme?.font_family || "Inter";

  const formatPrice = useCallback((amt: number) => {
    const currency = restaurant?.currency || "EUR";
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(amt);
  }, [restaurant?.currency]);

  const splitLabel = splitMethod === "equal"
    ? `Equal split · ${people} people`
    : splitMethod === "byitem"
    ? "By item"
    : "Custom amount";

  // ── FIB Pay ──
  const handleFibPay = async () => {
    if (!bill || !restaurant || !table) return;
    setProcessing(true);
    try {
      // Insert payment record
      const { data: paymentData, error: insertErr } = await supabase
        .from("payments")
        .insert({
          bill_id: bill.id,
          bill_split_id: billSplitId || null,
          restaurant_id: restaurant.id,
          table_id: table.id,
          amount: Math.round(amount * 100),
          method: "fib",
          status: "pending",
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select("id, status, fib_qr_url, fib_deep_link, expires_at")
        .single();

      if (insertErr) throw insertErr;
      setPayment(paymentData as PaymentRecord);

      // Call edge function to initiate FIB payment
      try {
        const { data: fibData } = await supabase.functions.invoke("fib-payment", {
          body: {
            payment_id: paymentData.id,
            amount: Math.round(amount * 100),
            currency: restaurant.currency || "IQD",
          },
        });

        if (fibData?.qr_url || fibData?.deep_link) {
          // Update payment with FIB details
          await supabase.from("payments").update({
            fib_qr_url: fibData.qr_url || null,
            fib_deep_link: fibData.deep_link || null,
            fib_transaction_id: fibData.transaction_id || null,
          }).eq("id", paymentData.id);

          setPayment(prev => prev ? {
            ...prev,
            fib_qr_url: fibData.qr_url || null,
            fib_deep_link: fibData.deep_link || null,
          } : null);
        }
      } catch {
        // FIB integration not yet configured — show screen anyway
      }

      setFibScreen(true);
      setCountdown(600);

      // Start countdown
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            setFibExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling
      pollRef.current = setInterval(async () => {
        const { data } = await supabase
          .from("payments").select("status").eq("id", paymentData.id).single();
        if (data?.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          navigate(`/r/${slug}/t/${token}/receipt/${paymentData.id}`);
        } else if (data?.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
          setFibScreen(false);
        }
      }, 3000);
    } catch (e: any) {
      toast({ title: "Payment error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ── Cash ──
  const handleCashPay = async () => {
    if (!bill || !restaurant || !table) return;
    setProcessing(true);
    try {
      const { data: paymentData, error: insertErr } = await supabase
        .from("payments")
        .insert({
          bill_id: bill.id,
          bill_split_id: billSplitId || null,
          restaurant_id: restaurant.id,
          table_id: table.id,
          amount: Math.round(amount * 100),
          method: "cash",
          status: "pending",
        })
        .select("id, status, fib_qr_url, fib_deep_link, expires_at")
        .single();

      if (insertErr) throw insertErr;
      setPayment(paymentData as PaymentRecord);

      // Send waiter request
      await supabase.from("waiter_requests").insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        bill_id: bill.id,
        type: "cash_payment",
        message: `Customer wants to pay ${formatPrice(amount)} in cash`,
      });

      setCashSent(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const retryFib = () => {
    setFibScreen(false);
    setFibExpired(false);
    setPayment(null);
    setCountdown(600);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center px-4 pt-12" style={{ backgroundColor: bgColor }}>
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-6 h-20 w-full max-w-sm rounded-2xl" />
        <div className="w-full max-w-sm space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: bgColor }}>
        <AlertCircle className="h-12 w-12" style={{ color: secondaryColor }} />
        <p className="text-lg font-medium" style={{ color: secondaryColor }}>
          {!bill ? "No open bill found" : "Something went wrong"}
        </p>
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

  // ── Cash success screen ──
  if (cashSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6" style={{ backgroundColor: bgColor, fontFamily }}>
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Check className="h-10 w-10" style={{ color: primaryColor }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: secondaryColor }}>Waiter notified!</h2>
        <p className="text-center text-sm" style={{ color: `${secondaryColor}90` }}>
          A waiter will come to your table to collect {formatPrice(amount)}
        </p>
        <p className="text-sm font-medium" style={{ color: `${secondaryColor}70` }}>
          Table {table?.table_number}
        </p>
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}`)}
          className="mt-4 w-full max-w-xs rounded-2xl py-4 text-base font-semibold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Back to Bill
        </button>
      </div>
    );
  }

  // ── FIB payment screen ──
  if (fibScreen && payment) {
    return (
      <div className="flex min-h-screen flex-col items-center px-6 pt-10" style={{ backgroundColor: bgColor, fontFamily }}>
        <h2 className="mb-6 text-xl font-bold" style={{ color: secondaryColor }}>Pay with FIB</h2>

        {/* QR Code area */}
        <div className="mb-4 flex h-52 w-52 items-center justify-center rounded-2xl bg-white shadow-sm">
          {payment.fib_qr_url ? (
            <img src={payment.fib_qr_url} alt="FIB QR Code" className="h-48 w-48 rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <QrCode className="h-16 w-16" style={{ color: `${secondaryColor}30` }} />
              <p className="text-xs" style={{ color: `${secondaryColor}60` }}>QR code</p>
            </div>
          )}
        </div>
        <p className="mb-5 text-sm" style={{ color: `${secondaryColor}80` }}>
          Scan with FIB app
        </p>

        {/* Divider */}
        <div className="mb-5 flex w-full max-w-xs items-center gap-3">
          <div className="flex-1 border-t" style={{ borderColor: `${secondaryColor}20` }} />
          <span className="text-xs" style={{ color: `${secondaryColor}50` }}>or</span>
          <div className="flex-1 border-t" style={{ borderColor: `${secondaryColor}20` }} />
        </div>

        {/* Deep link button */}
        {payment.fib_deep_link ? (
          <a
            href={payment.fib_deep_link}
            className="mb-6 w-full max-w-xs rounded-xl py-3 text-center text-sm font-medium"
            style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
          >
            Open FIB App
          </a>
        ) : (
          <button
            className="mb-6 w-full max-w-xs rounded-xl py-3 text-center text-sm font-medium"
            style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
            disabled
          >
            Open FIB App
          </button>
        )}

        {/* Status */}
        {fibExpired ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Payment expired. Try again.</p>
            <button
              onClick={retryFib}
              className="rounded-full px-6 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: primaryColor }} />
              <span className="text-sm" style={{ color: `${secondaryColor}80` }}>Waiting for payment...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: `${secondaryColor}60` }}>
              <Clock className="h-3.5 w-3.5" />
              Expires in {formatTime(countdown)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main payment method selection ──
  const methods: { key: PayMethod; icon: React.ReactNode; title: string; desc: string; badge?: string; disabled?: boolean }[] = [
    {
      key: "fib",
      icon: <Landmark className="h-6 w-6" />,
      title: "FIB Pay",
      desc: "Pay instantly with FIB app",
    },
    {
      key: "cash",
      icon: <Banknote className="h-6 w-6" />,
      title: "Cash",
      desc: "Request waiter to collect cash",
    },
    {
      key: "card",
      icon: <CreditCard className="h-6 w-6" />,
      title: "Card",
      desc: "Not available yet",
      badge: "Coming Soon",
      disabled: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: bgColor, fontFamily }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <button
          onClick={() => navigate(`/r/${slug}/t/${token}/split`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
          style={{ backgroundColor: `${secondaryColor}10`, color: secondaryColor }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: secondaryColor }}>Payment</h1>
          <p className="text-xs" style={{ color: `${secondaryColor}80` }}>{restaurant?.name}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Amount card */}
        <div className="mb-5 rounded-2xl p-5 shadow-sm" style={{ backgroundColor: "#fff" }}>
          <p className="text-xs" style={{ color: `${secondaryColor}80` }}>You are paying</p>
          <p className="my-1 text-3xl font-bold" style={{ color: primaryColor }}>
            {formatPrice(amount)}
          </p>
          <p className="text-xs" style={{ color: `${secondaryColor}60` }}>
            Table {table?.table_number} · {splitLabel}
          </p>
        </div>

        {/* Method cards */}
        <div className="mb-6 space-y-3">
          {methods.map(m => (
            <button
              key={m.key}
              onClick={() => !m.disabled && setSelectedMethod(m.key)}
              disabled={m.disabled}
              className="flex w-full items-start gap-4 rounded-xl p-4 text-left transition-all"
              style={{
                backgroundColor: m.disabled ? `${secondaryColor}04` : "#fff",
                border: `2px solid ${
                  m.disabled
                    ? `${secondaryColor}10`
                    : selectedMethod === m.key
                    ? primaryColor
                    : `${secondaryColor}15`
                }`,
                opacity: m.disabled ? 0.55 : 1,
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: selectedMethod === m.key && !m.disabled
                    ? `${primaryColor}15`
                    : `${secondaryColor}08`,
                  color: selectedMethod === m.key && !m.disabled ? primaryColor : secondaryColor,
                }}
              >
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: secondaryColor }}>{m.title}</span>
                  {m.badge && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${secondaryColor}10`, color: `${secondaryColor}70` }}
                    >
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs" style={{ color: `${secondaryColor}70` }}>{m.desc}</p>
              </div>
              {/* Radio */}
              {!m.disabled && (
                <div
                  className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: selectedMethod === m.key ? primaryColor : `${secondaryColor}30`,
                    backgroundColor: selectedMethod === m.key ? primaryColor : "transparent",
                  }}
                >
                  {selectedMethod === m.key && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={selectedMethod === "fib" ? handleFibPay : handleCashPay}
          disabled={processing}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {processing && <Loader2 className="h-4 w-4 animate-spin" />}
          {processing
            ? "Processing..."
            : selectedMethod === "fib"
            ? `Pay with FIB ${formatPrice(amount)}`
            : `Request Cash Collection`}
        </button>
      </div>
    </div>
  );
};

export default CustomerPay;
