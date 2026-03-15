import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { Banknote, Check, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PendingPayment {
  id: string;
  bill_id: string;
  bill_split_id: string | null;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  table_id: string | null;
}

interface Props {
  tableId: string;
  billId: string;
  formatPrice: (amount: number) => string;
}

const PendingCashPayments = ({ tableId, billId, formatPrice }: Props) => {
  const { restaurant } = useRestaurant();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("bill_id", billId)
      .eq("method", "cash")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setPayments((data as unknown as PendingPayment[]) || []);
  }, [billId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`cash-payments-${billId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `bill_id=eq.${billId}`,
      }, () => fetchPayments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [billId, fetchPayments]);

  const markAsReceived = async (paymentId: string) => {
    setMarking(paymentId);
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Cash payment marked as received ✓");
      // The trigger will handle updating bill_splits and bills
      fetchPayments();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMarking(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (payments.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Banknote className="h-4 w-4 text-amber-500" />
        Pending Cash Payments
      </h3>
      {payments.map(p => (
        <Card key={p.id} className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Banknote className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Cash Payment Requested</p>
              <p className="text-xs text-muted-foreground">
                Amount: <span className="font-medium text-foreground">{formatPrice(p.amount / 100)}</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Requested {timeAgo(p.created_at)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => markAsReceived(p.id)}
              disabled={marking === p.id}
              className="shrink-0"
            >
              {marking === p.id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Mark as Received
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PendingCashPayments;

// Hook to get pending cash count for sidebar badge
export function usePendingCashCount() {
  const { restaurant } = useRestaurant();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!restaurant?.id) return;

    const fetch = async () => {
      const { count: c } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("method", "cash")
        .eq("status", "pending");
      setCount(c || 0);
    };

    fetch();

    const channel = supabase
      .channel(`cash-count-${restaurant.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurant?.id]);

  return count;
}
