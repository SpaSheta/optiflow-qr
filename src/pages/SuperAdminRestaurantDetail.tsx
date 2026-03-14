import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, TableProperties, Receipt } from "lucide-react";
import { useState, useEffect } from "react";

const SuperAdminRestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const { data: openBills = [] } = useQuery({
    queryKey: ["sa-bills", id],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*").eq("restaurant_id", id!).eq("status", "open");
      return data ?? [];
    },
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("active");
  const [plan, setPlan] = useState("starter");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setSlug(restaurant.slug);
      setStatus(restaurant.status ?? "active");
      setPlan(restaurant.plan ?? "starter");
      setContactName(restaurant.contact_name ?? "");
      setContactPhone(restaurant.contact_phone ?? "");
      setEmail(restaurant.email ?? "");
      setCurrency(restaurant.currency ?? "IQD");
      setTaxRate(String(restaurant.tax_rate ?? 0));
      setNotes(restaurant.notes ?? "");
    }
  }, [restaurant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("restaurants").update({
        name, slug, status, plan,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        email: email || null,
        currency,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-restaurant", id] });
      qc.invalidateQueries({ queryKey: ["sa-restaurants"] });
      toast.success("Restaurant updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/super-admin/restaurants")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Restaurants
      </button>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          {restaurant.name}
        </h1>
        <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>
      </div>

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TableProperties className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{tables.length}</p>
              <p className="text-xs text-muted-foreground">Tables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{openBills.length}</p>
              <p className="text-xs text-muted-foreground">Open Bills</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        className="mb-6 w-full"
        onClick={() => navigate(`/super-admin/restaurants/${id}/tables`)}
      >
        <TableProperties className="mr-2 h-4 w-4" /> Manage Tables & QR Codes
      </Button>

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Restaurant Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label>Slug *</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
              <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
            </div>

            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
              <div><Label>Tax Rate (0-1)</Label><Input type="number" step="0.0001" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
            </div>

            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminRestaurantDetail;
