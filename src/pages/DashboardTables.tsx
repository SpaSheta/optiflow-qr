import { useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Download, Pencil } from "lucide-react";
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

  const billTableIds = new Set(openBills.map((b) => b.table_id));
  const attentionTableIds = new Set(pendingRequests.map((r) => r.table_id));

  const getStatus = (tableId: string) => {
    if (attentionTableIds.has(tableId)) return "attention";
    if (billTableIds.has(tableId)) return "open";
    return "empty";
  };

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
      setAddOpen(false);
      setTableNumber("");
      setLabel("");
      setCapacity("4");
      toast.success("Table added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadQR = async (tblNumber: string) => {
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => {
          const status = getStatus(t.id);
          return (
            <Card key={t.id} className="relative">
              <CardContent className="flex flex-col items-center gap-3 p-5">
                <span className="text-3xl font-bold text-foreground">{t.table_number}</span>
                {statusBadge(status)}
                <span className="text-xs text-muted-foreground">{t.capacity} seats</span>
                <div className="flex w-full gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/dashboard/bills/${t.id}`)}
                  >
                    Manage Bill
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadQR(t.table_number)}>
                    <Download className="h-3.5 w-3.5" />
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
    </div>
  );
};

export default DashboardTables;
