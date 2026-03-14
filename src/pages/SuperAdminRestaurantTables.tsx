import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Plus,
  Download,
  Copy,
  RefreshCw,
  Printer,
  PackageOpen,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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

  const tokenMap = new Map(qrTokens.map((t: any) => [t.table_id, t]));
  const billTableIds = new Set(openBills.map((b) => b.table_id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Select first table by default
  useEffect(() => {
    if (tables.length > 0 && !selectedId) {
      setSelectedId(tables[0].id);
    }
  }, [tables, selectedId]);

  const selectedTable = tables.find((t) => t.id === selectedId);
  const selectedToken = selectedId ? (tokenMap.get(selectedId) as any)?.token : null;

  const getQrUrl = (token: string) =>
    `${window.location.origin}/r/${restaurant?.slug}/t/${token}`;

  // Generate QR when selection changes
  useEffect(() => {
    if (selectedToken) {
      const url = getQrUrl(selectedToken);
      QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: "#1E3A5F", light: "#FFFFFF" } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [selectedToken, restaurant?.slug]);

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
      setNewNum("");
      setNewLabel("");
      setNewCap("4");
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

  /* ── Regenerate QR ── */
  const [regenOpen, setRegenOpen] = useState(false);
  const regenMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("table_qr_tokens")
        .update({ token: newToken, regenerated_at: new Date().toISOString() })
        .eq("table_id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", restaurantId] });
      setRegenOpen(false);
      toast.success("QR code regenerated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Download single QR ── */
  const downloadQR = () => {
    if (!qrDataUrl || !selectedTable) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${restaurant?.name ?? "restaurant"}-table-${selectedTable.table_number}.png`;
    a.click();
  };

  /* ── Copy link ── */
  const copyLink = () => {
    if (!selectedToken) return;
    navigator.clipboard.writeText(getQrUrl(selectedToken));
    toast.success("Link copied!");
  };

  /* ── Print QR ── */
  const printQR = () => {
    if (!qrDataUrl || !selectedTable) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Table ${selectedTable.table_number} QR</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;">
          <img src="${qrDataUrl}" style="width:400px;height:400px;" />
          <h1 style="margin:16px 0 4px;font-size:32px;">Table ${selectedTable.table_number}</h1>
          <p style="margin:0;color:#666;font-size:18px;">${restaurant?.name ?? ""}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  /* ── Download all QRs as ZIP ── */
  const [zipping, setZipping] = useState(false);
  const downloadAllQRs = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const tbl of tables) {
        const token = (tokenMap.get(tbl.id) as any)?.token;
        if (!token) continue;
        const url = getQrUrl(token);
        const dataUrl = await QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: "#1E3A5F", light: "#FFFFFF" } });
        const base64 = dataUrl.split(",")[1];
        zip.file(`${restaurant?.name ?? "restaurant"}-table-${tbl.table_number}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${restaurant?.name ?? "restaurant"}-qr-codes.zip`);
      toast.success("QR codes downloaded");
    } catch {
      toast.error("Failed to create ZIP");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-theme(spacing.12))] flex-col md:h-[calc(100vh-theme(spacing.12))]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/super-admin/restaurants/${restaurantId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
            Tables — {restaurant?.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadAllQRs} disabled={zipping || tables.length === 0}>
            <PackageOpen className="mr-1.5 h-3.5 w-3.5" /> {zipping ? "Zipping…" : "Download All QRs"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Table
          </Button>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left — table list */}
        <Card className="w-64 shrink-0 overflow-auto">
          <CardContent className="p-0">
            {tables.map((tbl) => {
              const hasOpenBill = billTableIds.has(tbl.id);
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedId(tbl.id)}
                  className={cn(
                    "flex w-full items-center justify-between border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
                    selectedId === tbl.id ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className={cn("text-sm font-semibold", selectedId === tbl.id ? "text-primary" : "text-foreground")}>
                      Table {tbl.table_number}
                    </p>
                    {tbl.label && <p className="text-xs text-muted-foreground">{tbl.label}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={hasOpenBill ? "default" : "secondary"} className="text-[10px]">
                      {hasOpenBill ? "Open" : "Empty"}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(tbl.id); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              );
            })}
            {tables.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tables yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Right — QR display */}
        <Card className="flex flex-1 items-center justify-center overflow-auto">
          {selectedTable && selectedToken ? (
            <CardContent className="flex flex-col items-center gap-4 py-8">
              {qrDataUrl && (
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <img src={qrDataUrl} alt="QR Code" className="h-[300px] w-[300px]" />
                </div>
              )}

              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">Table {selectedTable.table_number}</p>
                {selectedTable.label && <p className="text-sm text-muted-foreground">{selectedTable.label}</p>}
                <p className="mt-1 text-sm text-muted-foreground">{restaurant?.name}</p>
              </div>

              <div className="rounded-lg bg-muted px-4 py-2">
                <p className="max-w-[400px] break-all text-center text-xs font-mono text-muted-foreground">
                  {getQrUrl(selectedToken)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={downloadQR}>
                  <Download className="mr-1.5 h-4 w-4" /> Download PNG
                </Button>
                <Button variant="outline" onClick={copyLink}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copy Link
                </Button>
                <Button variant="outline" onClick={printQR}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print QR
                </Button>
                <Button variant="outline" className="text-amber-600" onClick={() => setRegenOpen(true)}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate QR
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Token: <span className="font-mono">{selectedToken}</span>
              </p>
            </CardContent>
          ) : (
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Select a table to view its QR code</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ── Dialogs ── */}

      {/* Add table */}
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

      {/* Delete table */}
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

      {/* Regenerate QR */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current QR code. Old printed QR codes will stop working. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenMutation.mutate()}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminRestaurantTables;
