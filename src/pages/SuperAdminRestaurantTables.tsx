import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, PackageOpen } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import QrStudio from "@/components/QrStudio";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const SuperAdminRestaurantTables = () => {
  const { id: restaurantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const { data: openBills = [] } = useQuery({
    queryKey: ["sa-open-bills", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("table_id").eq("restaurant_id", restaurantId!).eq("status", "open");
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  const { data: theme } = useQuery({
    queryKey: ["sa-restaurant-theme", restaurantId],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_themes").select("*").eq("restaurant_id", restaurantId!).maybeSingle();
      return data;
    },
    enabled: !!restaurantId,
  });

  const tokenMap = useMemo(() => new Map(qrTokens.map((t: any) => [t.table_id, t])), [qrTokens]);
  const billTableIds = new Set(openBills.map((b) => b.table_id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tables.length > 0 && !selectedId) setSelectedId(tables[0].id);
  }, [tables, selectedId]);

  const selectedTable = tables.find((t) => t.id === selectedId);
  const selectedTokenRow = selectedId ? (tokenMap.get(selectedId) as any) : null;

  /* ── Add table ── */
  const [addOpen, setAddOpen] = useState(false);
  const [newNum, setNewNum] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCap, setNewCap] = useState("4");

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tables").insert({
        restaurant_id: restaurantId!,
        table_number: newNum,
        label: newLabel || null,
        capacity: parseInt(newCap) || 4,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-tables", restaurantId] });
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", restaurantId] });
      setAddOpen(false);
      setNewNum(""); setNewLabel(""); setNewCap("4");
      toast.success("Table added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Delete table ── */
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-tables", restaurantId] });
      if (deleteId === selectedId) setSelectedId(null);
      setDeleteId(null);
      toast.success("Table deleted");
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/super-admin/restaurants/${restaurantId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-h2 text-foreground">Tables — {restaurant?.name}</h1>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Table
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LEFT — Table list */}
        <Card className="w-[300px] shrink-0 flex flex-col overflow-hidden">
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(tbl.id); }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              );
            })}
            {tables.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">No tables yet.</p>
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
              qrTokenQueryKey={["sa-qr-tokens", restaurantId!]}
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

      {/* Dialogs */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div><Label>Table Number *</Label><Input value={newNum} onChange={(e) => setNewNum(e.target.value)} required /></div>
            <div><Label>Label</Label><Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Patio" /></div>
            <div><Label>Capacity</Label><Input type="number" min={1} value={newCap} onChange={(e) => setNewCap(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add Table"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this table and its QR code.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminRestaurantTables;
