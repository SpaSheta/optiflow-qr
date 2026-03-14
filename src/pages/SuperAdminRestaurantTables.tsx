import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import QRCode from "qrcode";

const SuperAdminRestaurantTables = () => {
  const { id: restaurantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");

  const { data: restaurant } = useQuery({
    queryKey: ["sa-restaurant", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("*").eq("id", restaurantId!).single();
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["sa-tables", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*").eq("restaurant_id", restaurantId!).order("table_number");
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  const { data: qrTokens = [] } = useQuery({
    queryKey: ["sa-qr-tokens", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("table_qr_tokens").select("*").eq("restaurant_id", restaurantId!);
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  const tokenMap = new Map(qrTokens.map((t: any) => [t.table_id, t]));

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tables").insert({
        restaurant_id: restaurantId!,
        table_number: tableNumber,
        label: label || null,
        capacity: parseInt(capacity) || 4,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-tables", restaurantId] });
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", restaurantId] });
      setAddOpen(false);
      setTableNumber("");
      setLabel("");
      setCapacity("4");
      toast.success("Table added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const regenerateToken = useMutation({
    mutationFn: async (tableId: string) => {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("table_qr_tokens")
        .update({ token: newToken, regenerated_at: new Date().toISOString() })
        .eq("table_id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", restaurantId] });
      toast.success("QR token regenerated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadQR = async (tblNumber: string, token?: string) => {
    const url = `${window.location.origin}/r/${restaurant?.slug}/t/${tblNumber}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `table-${tblNumber}-qr.png`;
      a.click();
    } catch {
      toast.error("Failed to generate QR");
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(`/super-admin/restaurants/${restaurantId}`)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {restaurant?.name ?? "Restaurant"}
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Tables — {restaurant?.name}
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Table</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
              <div><Label>Table Number *</Label><Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required /></div>
              <div><Label>Label (optional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Patio Left" /></div>
              <div><Label>Capacity</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding…" : "Add Table"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => {
          const qrToken = tokenMap.get(t.id) as any;
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{t.table_number}</span>
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {t.label && <p className="text-xs text-muted-foreground">{t.label}</p>}
                <p className="text-xs text-muted-foreground">{t.capacity} seats</p>

                {qrToken && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">QR Token</p>
                    <p className="truncate text-xs font-mono text-foreground">{qrToken.token}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadQR(t.table_number, qrToken?.token)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> QR
                  </Button>
                  {qrToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateToken.mutate(t.id)}
                      disabled={regenerateToken.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tables.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">No tables yet. Click "Add Table" to get started.</p>
      )}
    </div>
  );
};

export default SuperAdminRestaurantTables;
