import { useState, useEffect } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Download, Copy, RefreshCw, Printer } from "lucide-react";
import PrintableQRCard from "@/components/PrintableQRCard";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";

const DashboardTables = () => {
  const { restaurant } = useRestaurant();
  const rid = restaurant?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", rid],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*").eq("restaurant_id", rid!).order("table_number");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: qrTokens = [] } = useQuery({
    queryKey: ["qr-tokens", rid],
    queryFn: async () => {
      const { data } = await supabase.from("table_qr_tokens").select("*").eq("restaurant_id", rid!);
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: openBills = [] } = useQuery({
    queryKey: ["open-bills", rid],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*").eq("restaurant_id", rid!).eq("status", "open");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["pending-requests", rid],
    queryFn: async () => {
      const { data } = await supabase.from("waiter_requests").select("*").eq("restaurant_id", rid!).eq("status", "pending");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const tokenMap = new Map(qrTokens.map((t: any) => [t.table_id, t]));
  const billTableIds = new Set(openBills.map((b) => b.table_id));
  const attentionTableIds = new Set(pendingRequests.map((r) => r.table_id));

  const getStatus = (tableId: string) => {
    if (attentionTableIds.has(tableId)) return "attention";
    if (billTableIds.has(tableId)) return "open";
    return "empty";
  };

  const getQrUrl = (token: string) =>
    `${window.location.origin}/r/${restaurant?.slug}/t/${token}`;

  // Generate QR data URLs for all tables
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const generate = async () => {
      const urls: Record<string, string> = {};
      for (const tbl of tables) {
        const tokenRow = tokenMap.get(tbl.id) as any;
        if (!tokenRow?.token) continue;
        try {
          urls[tbl.id] = await QRCode.toDataURL(getQrUrl(tokenRow.token), {
            width: 500, margin: 2, color: { dark: "#1E3A5F", light: "#FFFFFF" },
          });
        } catch { /* skip */ }
      }
      setQrDataUrls(urls);
    };
    if (tables.length > 0 && restaurant?.slug) generate();
  }, [tables, qrTokens, restaurant?.slug]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tables").insert({
        restaurant_id: rid!,
        table_number: tableNumber,
        label: label || null,
        capacity: parseInt(capacity) || 4,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", rid] });
      qc.invalidateQueries({ queryKey: ["qr-tokens", rid] });
      setAddOpen(false);
      setTableNumber("");
      setLabel("");
      setCapacity("4");
      toast.success("Table added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Regenerate QR ── */
  const [regenTableId, setRegenTableId] = useState<string | null>(null);
  const regenMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("table_qr_tokens")
        .update({ token: newToken, regenerated_at: new Date().toISOString() })
        .eq("table_id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qr-tokens", rid] });
      setRegenTableId(null);
      toast.success("QR code regenerated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadQR = (tableId: string, tblNumber: string) => {
    const dataUrl = qrDataUrls[tableId];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${restaurant?.name ?? "restaurant"}-table-${tblNumber}.png`;
    a.click();
  };

  const copyLink = (tableId: string) => {
    const tokenRow = tokenMap.get(tableId) as any;
    if (!tokenRow?.token) return;
    navigator.clipboard.writeText(getQrUrl(tokenRow.token));
    toast.success("Link copied!");
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      empty: { label: "Empty", variant: "secondary" },
      open: { label: "Open Bill", variant: "default" },
      attention: { label: "Attention", variant: "destructive" },
    };
    const s = map[status] ?? map.empty;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Tables
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Table</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <Label>Table Number *</Label>
                <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required />
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Patio Left" />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding…" : "Add Table"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => {
          const status = getStatus(t.id);
          const qrImg = qrDataUrls[t.id];
          return (
            <Card key={t.id} className="relative">
              <CardContent className="flex flex-col items-center gap-3 p-5">
                {qrImg && (
                  <div className="rounded-xl border border-border bg-white p-2">
                    <img src={qrImg} alt={`Table ${t.table_number} QR`} className="h-[140px] w-[140px]" />
                  </div>
                )}
                <span className="text-2xl font-bold text-foreground">{t.table_number}</span>
                {t.label && <span className="text-xs text-muted-foreground">{t.label}</span>}
                {statusBadge(status)}
                <span className="text-xs text-muted-foreground">{t.capacity} seats</span>
                <div className="flex w-full flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/dashboard/bills/${t.id}`)}
                  >
                    Manage Bill
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(t.id)} title="Copy Link">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadQR(t.id, t.table_number)} title="Download QR">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRegenTableId(t.id)}
                    title="Regenerate QR"
                    className="text-amber-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tables.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">No tables yet. Click "Add Table" to get started.</p>
      )}

      {/* Regenerate QR confirmation */}
      <AlertDialog open={!!regenTableId} onOpenChange={() => setRegenTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current QR code. Old printed QR codes will stop working. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenTableId && regenMutation.mutate(regenTableId)}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardTables;
