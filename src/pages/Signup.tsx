import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import optiflowIcon from "@/assets/optiflow-icon.png";

const CITIES = ["Erbil", "Sulaymaniyah", "Duhok", "Kirkuk", "Other"];

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ contact_name: string; phone: string; id: string } | null>(null);

  const [form, setForm] = useState({
    restaurant_name: "",
    contact_name: "",
    phone: "",
    email: "",
    city: "Erbil",
    num_tables: "",
    message: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.restaurant_name || !form.contact_name || !form.phone || !form.email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("signup_requests")
        .insert({
          restaurant_name: form.restaurant_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          city: form.city,
          num_tables: form.num_tables ? parseInt(form.num_tables) : null,
          message: form.message.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setSubmitted({ contact_name: form.contact_name, phone: form.phone, id: data.id });
    } catch (err: any) {
      toast.error("Something went wrong. Please try again or contact us on WhatsApp.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-[520px] rounded-3xl bg-card p-10 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-border text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0FBCB0]/10">
            <CheckCircle2 className="h-8 w-8 text-[#0FBCB0]" />
          </div>
          <h1 className="text-2xl font-extrabold text-secondary mb-2">Request Received!</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Thanks, <span className="font-semibold text-foreground">{submitted.contact_name}</span>!<br />
            We'll call you at <span className="font-semibold text-foreground">{submitted.phone}</span><br />
            within 24 hours to discuss setting up your OptiFlow account.
          </p>
          <p className="text-xs text-muted-foreground mb-8">
            Reference: <span className="font-mono font-semibold">#{submitted.id.slice(0, 8)}</span>
          </p>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-[520px]">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={optiflowIcon} alt="OptiFlow" className="h-12 w-12 mx-auto mb-4 rounded-xl" />
          <h1 className="text-[28px] font-extrabold text-secondary">Get Started with OptiFlow</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Tell us about your restaurant and we'll be in touch within 24 hours to get you set up.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-3xl bg-card p-8 md:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="restaurant_name" className="mb-1.5 block">Restaurant Name *</Label>
              <Input
                id="restaurant_name"
                value={form.restaurant_name}
                onChange={(e) => set("restaurant_name", e.target.value)}
                placeholder="e.g. Cafe Derwaza"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact_name" className="mb-1.5 block">Your Name *</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                placeholder="Contact person's full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1.5 block">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+964 750 000 0000"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">We'll call you on this number</p>
            </div>

            <div>
              <Label htmlFor="email" className="mb-1.5 block">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@restaurant.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="city" className="mb-1.5 block">City</Label>
              <Select value={form.city} onValueChange={(v) => set("city", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="num_tables" className="mb-1.5 block">How many tables do you have?</Label>
              <Input
                id="num_tables"
                type="number"
                min={1}
                value={form.num_tables}
                onChange={(e) => set("num_tables", e.target.value)}
                placeholder="e.g. 12"
              />
            </div>

            <div>
              <Label htmlFor="message" className="mb-1.5 block">Anything else you'd like us to know?</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => {
                  if (e.target.value.length <= 300) set("message", e.target.value);
                }}
                placeholder="Tell us about your restaurant, what POS you use, any special requirements..."
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/300</p>
            </div>

            <Button variant="cta" size="xl" className="w-full text-base" type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Request Access →"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
