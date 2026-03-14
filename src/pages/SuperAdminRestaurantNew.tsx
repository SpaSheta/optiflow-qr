import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

const SuperAdminRestaurantNew = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [taxRate, setTaxRate] = useState("0");
  const [plan, setPlan] = useState("starter");
  const [notes, setNotes] = useState("");

  const generateSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("restaurants").insert({
        name,
        slug: slug || generateSlug(name),
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        email: email || null,
        currency,
        tax_rate: parseFloat(taxRate) || 0,
        plan,
        notes: notes || null,
        created_by_super_admin: true,
        status: "active",
      }).select().single();
      if (error) throw error;

      // Create default theme
      await supabase.from("restaurant_themes").insert({
        restaurant_id: data.id,
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success("Restaurant created");
      navigate(`/super-admin/restaurants/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/super-admin/restaurants")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Restaurants
      </button>

      <h1 className="mb-6 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
        New Restaurant
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Restaurant Details</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSlug(generateSlug(e.target.value)); }}
                  required
                />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div>
                <Label>Tax Rate (0-1)</Label>
                <Input type="number" step="0.0001" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
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

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Restaurant"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminRestaurantNew;
