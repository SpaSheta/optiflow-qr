import { useState, useEffect, useMemo } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Download, PackageOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QrStudio from "@/components/QrStudio";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const DashboardTables = () => {
  const { restaurant } = useRestaurant();
  const rid = restaurant?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

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

  const { data: theme } = useQuery({
    queryKey: ["restaurant-theme", rid],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_themes").select("*").eq("restaurant_id", rid!).maybeSingle();
      return data;
    },
    enabled: !!rid,
  });

  const tokenMap = useMemo(() => new Map(qrTokens.map((t: any) => [t.table_id, t])), [qrTokens]);
  const billTableIds = new Set(openBills.map((b) => b.table_id));

  // Auto-select first table
  useEffect(() => {
    if (tables.length > 0 && !selectedId) setSelectedId(tables[0].id);
  }, [tables, selectedId]);

  const selectedTable = tables.find((t) => t.id === selectedId);
  const selectedTokenRow = selectedId ? (tokenMap.get(selectedId) as any) : null;

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

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [zipping, setZipping] = useState(false);
  const downloadCheckedZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const id of checkedIds) {
        const tbl = tables.find((t) => t.id === id);
        const tokenRow = tokenMap.get(id) as any;
        if (!tbl || !tokenRow?.token) continue;
        const settings = tokenRow.qr_settings || {};
        const url = `${window.location.origin}/r/${restaurant?.slug}/t/${tokenRow.token}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 1000, margin: 2,
          color: { dark: settings.dot_color || "#0F172A", light: settings.bg_color || "#FFFFFF" },
        });
        zip.file(`table-${tbl.table_number}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `optiflow-qr-codes-${restaurant?.name ?? "restaurant"}.zip`);
      toast.success("QR codes downloaded");
    } catch {
      toast.error("Failed to create ZIP");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Tables</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Table</Button>
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

      {/* Two-panel layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LEFT — Table list */}
        <Card className="w-[320px] shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {tables.map((tbl) => {
              const hasOpenBill = billTableIds.has(tbl.id);
              const isSelected = selectedId === tbl.id;
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedId(tbl.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-all last:border-b-0",
                    isSelected ? "bg-primary/5 border-l-[3px] border-l-primary" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={checkedIds.has(tbl.id)}
                    onCheckedChange={() => toggleCheck(tbl.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-foreground" style={{ fontWeight: 800 }}>{tbl.table_number}</span>
                      <Badge variant={hasOpenBill ? "default" : "secondary"} className="text-[10px]">
                        {hasOpenBill ? "Open Bill" : "Empty"}
                      </Badge>
                    </div>
                    {tbl.label && <p className="text-xs text-muted-foreground truncate">{tbl.label}</p>}
                  </div>
                </button>
              );
            })}
            {tables.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">No tables yet. Add one above.</p>
            )}
          </div>
        </Card>

        {/* RIGHT — QR Studio */}
        <Card className="flex-1 overflow-auto">
          {selectedTable && selectedTokenRow?.token ? (
            <QrStudio
              tableId={selectedTable.id}
              tableNumber={selectedTable.table_number}
              tableLabel={selectedTable.label}
              token={selectedTokenRow.token}
              restaurantSlug={restaurant?.slug ?? ""}
              restaurantName={restaurant?.name ?? ""}
              restaurantLogoUrl={theme?.logo_url}
              savedSettings={selectedTokenRow.qr_settings}
              qrTokenQueryKey={["qr-tokens", rid!]}
            />
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a table to customize its QR code</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Bulk action bar */}
      {checkedIds.size >= 2 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary px-5 py-3 text-secondary-foreground animate-fade-in">
          <span className="text-sm font-semibold">{checkedIds.size} tables selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={downloadCheckedZip} disabled={zipping}>
              <PackageOpen className="mr-1.5 h-3.5 w-3.5" />{zipping ? "Zipping…" : "Download All as ZIP"}
            </Button>
            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white" onClick={() => setCheckedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTables;
