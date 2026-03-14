import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Check, Store, TableProperties, Eye } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TableRow {
  table_number: string;
  label: string;
  capacity: number;
}

const PLANS = [
  { value: "starter", label: "Starter", desc: "Basic features for small restaurants", color: "border-muted" },
  { value: "pro", label: "Pro", desc: "Advanced features + analytics", color: "border-blue-500" },
  { value: "enterprise", label: "Enterprise", desc: "Full suite + priority support", color: "border-violet-500" },
];

const CURRENCIES = [
  { value: "IQD", label: "IQD — Iraqi Dinar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const SuperAdminRestaurantNew = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [taxRate, setTaxRate] = useState("0");
  const [plan, setPlan] = useState("starter");
  const [notes, setNotes] = useState("");

  // Step 2 fields
  const [tableCount, setTableCount] = useState("");
  const [tableRows, setTableRows] = useState<TableRow[]>([]);

  const generateSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleTableCountChange = (val: string) => {
    setTableCount(val);
    const count = Math.min(Math.max(parseInt(val) || 0, 0), 50);
    const rows: TableRow[] = [];
    for (let i = 1; i <= count; i++) {
      rows.push({
        table_number: String(i),
        label: "",
        capacity: 4,
      });
    }
    setTableRows(rows);
  };

  const updateTableRow = (index: number, field: keyof TableRow, value: string | number) => {
    setTableRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addTableRow = () => {
    const next = tableRows.length > 0 ? Math.max(...tableRows.map((r) => parseInt(r.table_number) || 0)) + 1 : 1;
    setTableRows((prev) => [...prev, { table_number: String(next), label: "", capacity: 4 }]);
  };

  const removeTableRow = (index: number) => {
    setTableRows((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceedStep1 = name.trim() && slug.trim() && contactEmail.trim();
  const canProceedStep2 = true; // tables are optional

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-restaurant", {
        body: {
          restaurant_name: name,
          slug,
          contact_name: contactName || null,
          contact_phone: contactPhone || null,
          contact_email: contactEmail,
          address: address || null,
          currency,
          tax_rate: parseFloat(taxRate) || 0,
          plan,
          notes: notes || null,
          tables: tableRows.length > 0 ? tableRows : null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Restaurant created! Invite email sent to ${contactEmail}`);
      navigate(`/super-admin/restaurants/${data.restaurant.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate("/super-admin/restaurants")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Restaurants
      </button>

      <h1 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
        Create New Restaurant
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Set up a restaurant account. The owner will receive an email to set their password.
      </p>

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s < step && setStep(s)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </button>
            <span className={cn("text-sm font-medium", step === s ? "text-foreground" : "text-muted-foreground")}>
              {s === 1 ? "Details" : s === 2 ? "Tables" : "Review"}
            </span>
            {s < 3 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Restaurant Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Restaurant Name *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Café Nawroz" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="cafe-nawroz" />
                <p className="mt-1 text-[11px] text-muted-foreground">URL: /r/{slug || "..."}/t/1</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Person Name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+964 ..." />
              </div>
            </div>

            <div>
              <Label>Contact Email * (used as login)</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="owner@restaurant.com" />
              <p className="mt-1 text-[11px] text-muted-foreground">An account will be created with this email and an invite sent.</p>
            </div>

            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Plan</Label>
              <div className="grid grid-cols-3 gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all",
                      plan === p.value ? `${p.color} bg-accent/50 ring-2 ring-primary/20` : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{p.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Internal Notes (super admin only)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes about this client..." />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Tables →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Initial Tables Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up the initial tables. QR codes will be auto-generated for each table. 
              The owner can always add more later from their dashboard.
            </p>

            <div className="max-w-xs">
              <Label>How many tables?</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={tableCount}
                onChange={(e) => handleTableCountChange(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>

            {tableRows.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1.5fr_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Number</span>
                  <span>Label</span>
                  <span>Seats</span>
                  <span></span>
                </div>
                {tableRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr_80px_40px] gap-2">
                    <Input
                      value={row.table_number}
                      onChange={(e) => updateTableRow(i, "table_number", e.target.value)}
                    />
                    <Input
                      value={row.label}
                      onChange={(e) => updateTableRow(i, "label", e.target.value)}
                      placeholder="Optional label"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={row.capacity}
                      onChange={(e) => updateTableRow(i, "capacity", parseInt(e.target.value) || 4)}
                    />
                    <button
                      onClick={() => removeTableRow(i)}
                      className="flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addTableRow}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add another table
                </button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next: Review →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Store className="h-4 w-4" /> Restaurant Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{name}</strong></div>
                <div><span className="text-muted-foreground">Slug:</span> <strong>{slug}</strong></div>
                <div><span className="text-muted-foreground">Contact:</span> <strong>{contactName || "—"}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> <strong>{contactPhone || "—"}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{contactEmail}</strong></div>
                <div><span className="text-muted-foreground">Address:</span> <strong>{address || "—"}</strong></div>
                <div><span className="text-muted-foreground">Currency:</span> <strong>{currency}</strong></div>
                <div><span className="text-muted-foreground">Tax Rate:</span> <strong>{taxRate}%</strong></div>
                <div>
                  <span className="text-muted-foreground">Plan: </span>
                  <Badge className={cn(
                    plan === "pro" ? "bg-blue-100 text-blue-700" :
                    plan === "enterprise" ? "bg-violet-100 text-violet-700" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                </div>
              </div>
              {notes && (
                <div className="mt-3 rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">Internal Notes</p>
                  <p className="mt-1 text-sm">{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TableProperties className="h-4 w-4" /> Tables ({tableRows.length})</CardTitle></CardHeader>
            <CardContent>
              {tableRows.length > 0 ? (
                <div className="space-y-1">
                  {tableRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-semibold">Table {row.table_number}</span>
                      {row.label && <span className="text-muted-foreground">— {row.label}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{row.capacity} seats</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tables configured. Owner can add them later.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Eye className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">What happens on create:</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <li>• Auth account created for <strong>{contactEmail}</strong></li>
                  <li>• Restaurant, theme, and tables inserted</li>
                  <li>• QR tokens auto-generated for each table</li>
                  <li>• Password reset email sent to the owner</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button onClick={handleSubmit} disabled={loading} className="min-w-[220px]">
              {loading ? "Creating…" : "Create Restaurant & Send Invite"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRestaurantNew;
