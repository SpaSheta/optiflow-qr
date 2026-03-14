import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  TableProperties,
  Receipt,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Download,
  Copy,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  PackageOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/* ─── helpers ─── */
const planBadge = (plan: string | null) => {
  const p = plan ?? "starter";
  const c: Record<string, string> = {
    starter: "bg-muted text-muted-foreground hover:bg-muted",
    pro: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    enterprise: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  };
  return <Badge className={c[p] ?? c.starter}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
};

const statusBadge = (status: string | null) => {
  const s = status ?? "active";
  const c: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    suspended: "bg-red-100 text-red-700 hover:bg-red-100",
    pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    inactive: "bg-muted text-muted-foreground hover:bg-muted",
  };
  return <Badge className={c[s] ?? c.active}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

/* ─── component ─── */
const SuperAdminRestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  /* ── queries ── */
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["sa-restaurant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["sa-tables", id],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*").eq("restaurant_id", id!).order("table_number");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: qrTokens = [] } = useQuery({
    queryKey: ["sa-qr-tokens", id],
    queryFn: async () => {
      const { data } = await supabase.from("table_qr_tokens").select("*").eq("restaurant_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: openBills = [] } = useQuery({
    queryKey: ["sa-open-bills", id],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*").eq("restaurant_id", id!).eq("status", "open");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ["sa-all-bills", id],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*").eq("restaurant_id", id!).order("opened_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["sa-categories", id],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").eq("restaurant_id", id!).order("sort_order");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["sa-menu-items", id],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", id!).order("sort_order");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: theme } = useQuery({
    queryKey: ["sa-theme", id],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_themes").select("*").eq("restaurant_id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const tokenMap = new Map(qrTokens.map((t: any) => [t.table_id, t]));
  const billTableIds = new Set(openBills.map((b) => b.table_id));

  /* ── edit state ── */
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [taxRate, setTaxRate] = useState("0");
  const [plan, setPlan] = useState("starter");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setSlug(restaurant.slug);
      setContactName(restaurant.contact_name ?? "");
      setContactPhone(restaurant.contact_phone ?? "");
      setEmail(restaurant.email ?? "");
      setAddress(restaurant.address ?? "");
      setCurrency(restaurant.currency ?? "IQD");
      setTaxRate(String(restaurant.tax_rate ?? 0));
      setPlan(restaurant.plan ?? "starter");
      setStatus(restaurant.status ?? "active");
      setNotes(restaurant.notes ?? "");
    }
  }, [restaurant]);

  /* ── mutations ── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("restaurants").update({
        name, slug, status, plan,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        email: email || null,
        address: address || null,
        currency,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-restaurant", id] });
      toast.success("Restaurant updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── suspend ── */
  const [suspendOpen, setSuspendOpen] = useState(false);
  const suspendMutation = useMutation({
    mutationFn: async () => {
      const newStatus = (restaurant?.status ?? "active") === "active" ? "suspended" : "active";
      const { error } = await supabase.from("restaurants").update({ status: newStatus }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-restaurant", id] });
      setSuspendOpen(false);
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── tables: add ── */
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");

  const addTableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tables").insert({
        restaurant_id: id!,
        table_number: newTableNumber,
        label: newTableLabel || null,
        capacity: parseInt(newTableCapacity) || 4,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-tables", id] });
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", id] });
      setAddTableOpen(false);
      setNewTableNumber("");
      setNewTableLabel("");
      setNewTableCapacity("4");
      toast.success("Table added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── tables: delete ── */
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-tables", id] });
      setDeleteTableId(null);
      toast.success("Table deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── tables: regenerate QR ── */
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
      qc.invalidateQueries({ queryKey: ["sa-qr-tokens", id] });
      setRegenTableId(null);
      toast.success("QR token regenerated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── QR helpers ── */
  const getQrUrl = (token: string) =>
    `${window.location.origin}/r/${restaurant?.slug}/t/${token}`;

  const downloadQR = async (tblNumber: string, token: string) => {
    const url = getQrUrl(token);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: "#1E3A5F", light: "#FFFFFF" } });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${restaurant?.name ?? "restaurant"}-table-${tblNumber}.png`;
      a.click();
    } catch {
      toast.error("Failed to generate QR");
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getQrUrl(token));
    toast.success("Link copied!");
  };

  /* ── QR view dialog ── */
  const [viewQrTable, setViewQrTable] = useState<any>(null);
  const [viewQrDataUrl, setViewQrDataUrl] = useState("");

  const openQrView = async (tbl: any, token: string) => {
    setViewQrTable(tbl);
    const url = getQrUrl(token);
    const dataUrl = await QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: "#1E3A5F", light: "#FFFFFF" } });
    setViewQrDataUrl(dataUrl);
  };

  /* ── download all QRs as ZIP ── */
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

  /* ── stats ── */
  const totalRevenue = allBills.reduce((s, b) => s + (b.total ?? 0), 0);
  const lastActivity = allBills[0]?.updated_at ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!restaurant) {
    return <p className="py-20 text-center text-muted-foreground">Restaurant not found.</p>;
  }

  const isSuspended = (restaurant.status ?? "active") !== "active";

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => navigate("/super-admin/restaurants")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Restaurants
      </button>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          {restaurant.name}
        </h1>
        {statusBadge(restaurant.status)}
        {planBadge(restaurant.plan)}
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            className={isSuspended ? "text-emerald-600" : "text-amber-600"}
            onClick={() => setSuspendOpen(true)}
          >
            {isSuspended ? "Reactivate" : "Suspend"}
          </Button>
          <Button variant="outline" disabled title="TODO: View as Restaurant">
            <Eye className="mr-2 h-4 w-4" /> View as Restaurant
          </Button>
        </div>
      </div>

      {/* Two-column */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — edit */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Restaurant Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div><Label>Slug *</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
                <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
                <div><Label>Tax Rate (0-1)</Label><Input type="number" step="0.0001" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
                <div>
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Super admin only notes..." />
              </div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right — stats */}
        <Card>
          <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: TableProperties, label: "Total Tables", value: tables.length },
              { icon: Receipt, label: "Active Bills", value: openBills.length },
              { icon: DollarSign, label: "Total Revenue", value: `${(totalRevenue / 100).toFixed(2)} ${restaurant.currency ?? ""}` },
              { icon: Calendar, label: "Member Since", value: fmtDate(restaurant.created_at) },
              { icon: Clock, label: "Last Activity", value: fmtDateTime(lastActivity) },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        {/* ─ TABLES TAB ─ */}
        <TabsContent value="tables">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Tables & QR Codes</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadAllQRs} disabled={zipping || tables.length === 0}>
                  <PackageOpen className="mr-1.5 h-3.5 w-3.5" /> {zipping ? "Zipping…" : "Download All QRs"}
                </Button>
                <Button size="sm" onClick={() => navigate(`/super-admin/restaurants/${id}/tables`)}>
                  <TableProperties className="mr-1.5 h-3.5 w-3.5" /> Full QR Manager
                </Button>
                <Button size="sm" onClick={() => setAddTableOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Table
                </Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QR Token</TableHead>
                  <TableHead>QR Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((tbl) => {
                  const qr = tokenMap.get(tbl.id) as any;
                  const hasOpenBill = billTableIds.has(tbl.id);
                  return (
                    <TableRow key={tbl.id}>
                      <TableCell className="font-semibold">{tbl.table_number}</TableCell>
                      <TableCell className="text-muted-foreground">{tbl.label ?? "—"}</TableCell>
                      <TableCell>{tbl.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={hasOpenBill ? "default" : "secondary"}>
                          {hasOpenBill ? "Open Bill" : "Empty"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {qr?.token ? qr.token.slice(0, 8) + "…" : "—"}
                      </TableCell>
                      <TableCell>
                        {qr?.token && (
                          <button
                            onClick={() => copyLink(qr.token)}
                            className="max-w-[200px] truncate text-xs text-primary hover:underline"
                          >
                            {getQrUrl(qr.token)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {qr?.token && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openQrView(tbl, qr.token)} title="View QR">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadQR(tbl.table_number, qr.token)} title="Download QR">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRegenTableId(tbl.id)} title="Regenerate QR">
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTableId(tbl.id)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No tables yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─ MENU TAB ─ */}
        <TabsContent value="menu">
          <Card>
            <CardHeader><CardTitle className="text-base">Menu (Read-only)</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {categories.length === 0 && <p className="text-sm text-muted-foreground">No menu categories.</p>}
              {categories.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{cat.name}</h3>
                  <div className="space-y-1">
                    {menuItems
                      .filter((mi) => mi.category_id === cat.id)
                      .map((mi) => (
                        <div key={mi.id} className={cn("flex items-center justify-between rounded-lg px-3 py-2", mi.is_available ? "bg-muted/50" : "bg-muted/30 opacity-50")}>
                          <div>
                            <span className="text-sm font-medium">{mi.name}</span>
                            {mi.description && <span className="ml-2 text-xs text-muted-foreground">{mi.description}</span>}
                          </div>
                          <span className="text-sm font-semibold">{((mi.price ?? 0) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─ BILLS TAB ─ */}
        <TabsContent value="bills">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Bills (last 20)</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBills.map((bill) => {
                  const tbl = tables.find((t) => t.id === bill.table_id);
                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{tbl?.table_number ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={bill.status === "open" ? "default" : "secondary"}>
                          {bill.status ?? "open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{((bill.total ?? 0) / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDateTime(bill.opened_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDateTime(bill.closed_at)}</TableCell>
                    </TableRow>
                  );
                })}
                {allBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No bills yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─ THEME TAB ─ */}
        <TabsContent value="theme">
          <Card>
            <CardHeader><CardTitle className="text-base">Theme Settings (Read-only)</CardTitle></CardHeader>
            <CardContent>
              {!theme ? (
                <p className="text-sm text-muted-foreground">No theme configured.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Primary Color", value: theme.primary_color, isColor: true },
                    { label: "Secondary Color", value: theme.secondary_color, isColor: true },
                    { label: "Background Color", value: theme.background_color, isColor: true },
                    { label: "Font Family", value: theme.font_family },
                    { label: "Menu Layout", value: theme.menu_layout },
                    { label: "Logo URL", value: theme.logo_url ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      {item.isColor && item.value && (
                        <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: item.value }} />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-medium">{item.value ?? "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}

      {/* Suspend */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSuspended ? "Reactivate" : "Suspend"} Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              {isSuspended
                ? `Reactivate ${restaurant.name}? Their dashboard will be fully operational again.`
                : `Suspend ${restaurant.name}? Their dashboard will be marked as suspended.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
              onClick={() => suspendMutation.mutate()}
            >
              {isSuspended ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add table */}
      <Dialog open={addTableOpen} onOpenChange={setAddTableOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addTableMutation.mutate(); }} className="space-y-4">
            <div><Label>Table Number *</Label><Input value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} required /></div>
            <div><Label>Label</Label><Input value={newTableLabel} onChange={(e) => setNewTableLabel(e.target.value)} placeholder="e.g. Patio" /></div>
            <div><Label>Capacity</Label><Input type="number" min={1} value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={addTableMutation.isPending}>
              {addTableMutation.isPending ? "Adding…" : "Add Table"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete table */}
      <AlertDialog open={!!deleteTableId} onOpenChange={() => setDeleteTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the table and its QR code. Any existing bills on this table will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTableId && deleteTableMutation.mutate(deleteTableId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate QR */}
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

      {/* View QR dialog */}
      <Dialog open={!!viewQrTable} onOpenChange={() => setViewQrTable(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Table {viewQrTable?.table_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {viewQrDataUrl && <img src={viewQrDataUrl} alt="QR" className="h-64 w-64 rounded-lg" />}
            <p className="text-lg font-bold text-foreground">Table {viewQrTable?.table_number}</p>
            <p className="text-sm text-muted-foreground">{restaurant.name}</p>
            {viewQrTable && tokenMap.get(viewQrTable.id) && (
              <p className="max-w-full truncate text-xs text-muted-foreground">
                {getQrUrl((tokenMap.get(viewQrTable.id) as any).token)}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => viewQrTable && downloadQR(viewQrTable.table_number, (tokenMap.get(viewQrTable.id) as any)?.token)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => viewQrTable && copyLink((tokenMap.get(viewQrTable.id) as any)?.token)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminRestaurantDetail;
