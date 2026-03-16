import { useState, useEffect, useRef } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check, Upload, X, Receipt, UtensilsCrossed, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Presets ────────────────────────────────── */
interface ThemeColors {
  bg_color: string;
  header_bg_color: string;
  header_text_color: string;
  card_bg_color: string;
  body_text_color: string;
  accent_color: string;
  price_color: string;
  tab_active_color: string;
}

const PRESETS: Record<string, ThemeColors & { label: string; desc: string }> = {
  Default: {
    label: "Default", desc: "Navy + Teal",
    bg_color: "#F5F5F0", header_bg_color: "#1E3A5F", header_text_color: "#FFFFFF",
    card_bg_color: "#FFFFFF", body_text_color: "#1F2937", accent_color: "#0FBCB0",
    price_color: "#0FBCB0", tab_active_color: "#0FBCB0",
  },
  Dark: {
    label: "Dark", desc: "Black + Gold",
    bg_color: "#0F0F0F", header_bg_color: "#1A1A1A", header_text_color: "#FFFFFF",
    card_bg_color: "#1C1C1C", body_text_color: "#E5E7EB", accent_color: "#F5A623",
    price_color: "#F5A623", tab_active_color: "#F5A623",
  },
  Warm: {
    label: "Warm", desc: "Brown + Orange",
    bg_color: "#FFF8F0", header_bg_color: "#5C3317", header_text_color: "#FFFFFF",
    card_bg_color: "#FFFFFF", body_text_color: "#374151", accent_color: "#E8613C",
    price_color: "#E8613C", tab_active_color: "#E8613C",
  },
  Minimal: {
    label: "Minimal", desc: "White + Black",
    bg_color: "#FFFFFF", header_bg_color: "#FFFFFF", header_text_color: "#0F172A",
    card_bg_color: "#F8FAFC", body_text_color: "#374151", accent_color: "#000000",
    price_color: "#111827", tab_active_color: "#000000",
  },
};

const FONTS = [
  { name: "Inter", desc: "Standard, clean", sample: "The quick brown fox" },
  { name: "Poppins", desc: "Friendly, rounded", sample: "The quick brown fox" },
  { name: "Playfair Display", desc: "Elegant, serif", sample: "The quick brown fox" },
  { name: "Cairo", desc: "Arabic-friendly", sample: "The quick brown fox" },
];

/* ── Color control row ──────────────────────── */
const ColorRow = ({ color, onChange, label, description }: {
  color: string; onChange: (c: string) => void; label: string; description: string;
}) => {
  const [inputValue, setInputValue] = useState(color);
  useEffect(() => { setInputValue(color); }, [color]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onChange(val);
  };

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-10 w-10 shrink-0 rounded-xl border-2 border-border transition-all hover:scale-105"
            style={{ backgroundColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" side="left">
          <HexColorPicker color={color} onChange={onChange} />
        </PopoverContent>
      </Popover>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        className="w-24 shrink-0 font-mono text-xs"
      />
    </div>
  );
};

/* ── Section wrapper ────────────────────────── */
const Section = ({ title, description, defaultOpen = true, children }: {
  title: string; description?: string; defaultOpen?: boolean; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
        <div className="text-left">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 px-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

/* ── Main component ─────────────────────────── */
const DashboardTheme = () => {
  const { restaurant, theme: existingTheme, refetch } = useRestaurant();
  const rid = restaurant?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live theme state
  const [bgColor, setBgColor] = useState("#F5F5F0");
  const [headerBg, setHeaderBg] = useState("#1E3A5F");
  const [headerText, setHeaderText] = useState("#FFFFFF");
  const [cardBg, setCardBg] = useState("#FFFFFF");
  const [bodyText, setBodyText] = useState("#1F2937");
  const [accent, setAccent] = useState("#0FBCB0");
  const [priceColor, setPriceColor] = useState("#0FBCB0");
  const [tabActive, setTabActive] = useState("#0FBCB0");
  const [font, setFont] = useState("Inter");
  const [menuLayout, setMenuLayout] = useState("grid");
  const [introVideo, setIntroVideo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!existingTheme) return;
    setBgColor(existingTheme.background_color || "#F5F5F0");
    setHeaderBg(existingTheme.header_bg_color || existingTheme.secondary_color || "#1E3A5F");
    setHeaderText(existingTheme.header_text_color || "#FFFFFF");
    setCardBg(existingTheme.card_bg_color || "#FFFFFF");
    setBodyText(existingTheme.body_text_color || "#1F2937");
    setAccent(existingTheme.primary_color || "#0FBCB0");
    setPriceColor(existingTheme.price_color || existingTheme.primary_color || "#0FBCB0");
    setTabActive(existingTheme.tab_active_color || existingTheme.primary_color || "#0FBCB0");
    setFont(existingTheme.font_family || "Inter");
    setMenuLayout(existingTheme.menu_layout || "grid");
    setIntroVideo(existingTheme.intro_video_url ?? "");
    setLogoUrl(existingTheme.logo_url);
  }, [existingTheme]);

  const applyPreset = (name: string) => {
    const p = PRESETS[name];
    setSelectedPreset(name);
    setBgColor(p.bg_color);
    setHeaderBg(p.header_bg_color);
    setHeaderText(p.header_text_color);
    setCardBg(p.card_bg_color);
    setBodyText(p.body_text_color);
    setAccent(p.accent_color);
    setPriceColor(p.price_color);
    setTabActive(p.tab_active_color);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSavedState("saving");
      let finalLogo = logoUrl;
      if (logoFile && rid) {
        const ext = logoFile.name.split(".").pop();
        const path = `${rid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("restaurant-logos").upload(path, logoFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("restaurant-logos").getPublicUrl(path);
        finalLogo = urlData.publicUrl;
      }

      const payload = {
        restaurant_id: rid!,
        primary_color: accent,
        secondary_color: headerBg,
        background_color: bgColor,
        font_family: font,
        menu_layout: menuLayout,
        intro_video_url: introVideo || null,
        logo_url: finalLogo,
        header_bg_color: headerBg,
        header_text_color: headerText,
        tab_active_color: tabActive,
        card_bg_color: cardBg,
        body_text_color: bodyText,
        price_color: priceColor,
      };

      if (existingTheme) {
        const { error } = await supabase.from("restaurant_themes").update(payload).eq("id", existingTheme.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurant_themes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetch();
      setLogoFile(null);
      setSavedState("saved");
      toast.success("Theme saved");
      setTimeout(() => setSavedState("idle"), 2000);
    },
    onError: (e: any) => { toast.error(e.message); setSavedState("idle"); },
  });

  const isDark = isColorDark(bgColor);
  const isHeaderDark = isColorDark(headerBg);

  return (
    <div>
      <h1 className="text-h1 text-foreground mb-1" style={{ fontWeight: 800 }}>Theme Studio</h1>
      <p className="text-body-sm mb-6">Customize how your restaurant looks to customers</p>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ─── LEFT: Controls ─── */}
        <div className="flex-1 space-y-4 lg:max-w-[55%]">
          {/* Presets */}
          <Section title="Quick Start" description="Start with a preset and customize from there">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:shadow-md",
                    selectedPreset === key ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex shrink-0 overflow-hidden rounded-lg">
                    {[p.header_bg_color, p.accent_color, p.bg_color].map((c, i) => (
                      <div key={i} className="h-8 w-4" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  {selectedPreset === key && (
                    <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Branding */}
          <Section title="Branding" description="Logo and intro video">
            <div>
              <Label className="mb-2 block">Logo</Label>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoSelect} />
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="logo" className="h-16 w-16 rounded-xl border border-border object-contain" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Change</Button>
                    <Button size="sm" variant="outline" onClick={() => { setLogoUrl(null); setLogoFile(null); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Upload className="h-4 w-4" /> Drop logo here or click to upload
                </button>
              )}
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG — max 2MB</p>
            </div>

            <div>
              <Label className="mb-1 block">Intro Video URL</Label>
              <Input value={introVideo} onChange={(e) => setIntroVideo(e.target.value)} placeholder="https://youtube.com/..." />
              <p className="mt-1 text-xs text-muted-foreground">Shown at the top of your customer page</p>
            </div>
          </Section>

          {/* Colors */}
          <Section title="Colors" description="Control every color your customers see">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorRow color={bgColor} onChange={(c) => { setBgColor(c); setSelectedPreset(null); }} label="Page Background" description="Main background of the customer page" />
              <ColorRow color={headerBg} onChange={(c) => { setHeaderBg(c); setSelectedPreset(null); }} label="Header Background" description="Top section with logo and name" />
              <ColorRow color={headerText} onChange={(c) => { setHeaderText(c); setSelectedPreset(null); }} label="Header Text" description="Restaurant name and table number" />
              <ColorRow color={tabActive} onChange={(c) => { setTabActive(c); setSelectedPreset(null); }} label="Tab Bar Active" description="Selected tab (Bill, Menu, Contact)" />
              <ColorRow color={cardBg} onChange={(c) => { setCardBg(c); setSelectedPreset(null); }} label="Body Background" description="Bill and menu card backgrounds" />
              <ColorRow color={bodyText} onChange={(c) => { setBodyText(c); setSelectedPreset(null); }} label="Body Text" description="Item names and general text" />
              <ColorRow color={accent} onChange={(c) => { setAccent(c); setSelectedPreset(null); }} label="Accent / Highlight" description="Buttons, links, interactive elements" />
              <ColorRow color={priceColor} onChange={(c) => { setPriceColor(c); setSelectedPreset(null); }} label="Price Color" description="How prices appear on menu and bill" />
            </div>
          </Section>

          {/* Typography */}
          <Section title="Typography" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setFont(f.name)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    font === f.name ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <p className="text-sm font-bold text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                  <p className="mt-1 text-sm" style={{ fontFamily: f.name }}>{f.sample}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* Menu Display */}
          <Section title="Menu Display" defaultOpen={false}>
            <Label className="mb-2 block">Menu Layout</Label>
            <div className="flex gap-3">
              {(["grid", "list"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setMenuLayout(l)}
                  className={cn(
                    "flex-1 rounded-xl border-2 p-4 text-center transition-all",
                    menuLayout === l ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="mx-auto mb-2 w-16">
                    {l === "grid" ? (
                      <div className="grid grid-cols-2 gap-1">
                        {[1,2,3,4].map(i => <div key={i} className="h-3 rounded-sm bg-muted-foreground/20" />)}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {[1,2,3].map(i => <div key={i} className="h-2 rounded-sm bg-muted-foreground/20" />)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground capitalize">{l}</p>
                  <p className="text-xs text-muted-foreground">{l === "grid" ? "2 columns" : "Full width"}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* Save */}
          <div className="sticky bottom-0 bg-background py-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={savedState === "saving"}
              className="w-full"
              size="lg"
            >
              {savedState === "saving" ? "Saving…" : savedState === "saved" ? "Saved ✓" : "Save Theme"}
            </Button>
          </div>
        </div>

        {/* ─── RIGHT: Preview ─── */}
        <div className="hidden lg:block lg:w-[45%]">
          <div className="sticky top-24">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Customer View — Live Preview
            </p>
            <div className="mx-auto h-[600px] w-[290px] overflow-hidden rounded-[2.5rem] border-[6px] border-foreground/15 shadow-2xl">
              <div className="flex h-full flex-col overflow-y-auto" style={{ backgroundColor: bgColor, fontFamily: font }}>
                {/* Header */}
                <div className="px-5 pb-4 pt-10" style={{ backgroundColor: headerBg }}>
                  {logoUrl && <img src={logoUrl} alt="logo" className="mb-2 h-10 object-contain" />}
                  <h2 className="text-lg font-bold" style={{ color: headerText }}>
                    {restaurant?.name ?? "Cafe Test"}
                  </h2>
                  <p className="text-xs" style={{ color: headerText, opacity: 0.7 }}>Table 1</p>
                </div>

                {/* Tab bar */}
                <div className="flex justify-center gap-2 px-4 py-3" style={{ backgroundColor: bgColor }}>
                  {[
                    { icon: <Receipt className="h-3 w-3" />, label: "Bill", active: true },
                    { icon: <UtensilsCrossed className="h-3 w-3" />, label: "Menu", active: false },
                    { icon: <Phone className="h-3 w-3" />, label: "Contact", active: false },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
                      style={
                        t.active
                          ? { backgroundColor: tabActive, color: "#fff" }
                          : { backgroundColor: `${headerBg}15`, color: isHeaderDark ? bodyText : headerBg }
                      }
                    >
                      {t.icon} {t.label}
                    </div>
                  ))}
                </div>

                {/* Bill items */}
                <div className="space-y-2 px-4 py-2">
                  {[
                    { name: "Grilled Chicken", qty: 1, price: 15000 },
                    { name: "Caesar Salad", qty: 2, price: 9000 },
                    { name: "Tiramisu", qty: 1, price: 13500 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: cardBg }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: bodyText }}>{item.name}</p>
                        <p className="text-[10px]" style={{ color: bodyText, opacity: 0.5 }}>× {item.qty}</p>
                      </div>
                      <p className="text-xs font-bold" style={{ color: priceColor }}>
                        IQD {item.price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mx-4 rounded-xl p-3" style={{ backgroundColor: cardBg }}>
                  <div className="flex justify-between text-[10px]" style={{ color: bodyText, opacity: 0.6 }}>
                    <span>Subtotal</span><span>IQD 37,500</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-1 text-xs font-bold" style={{ color: bodyText, borderColor: `${bodyText}15` }}>
                    <span>Total</span><span>IQD 37,500</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 px-4 py-3">
                  <div
                    className="flex-1 rounded-lg border py-2 text-center text-[10px] font-semibold"
                    style={{ borderColor: accent, color: accent }}
                  >
                    Split Bill
                  </div>
                  <div
                    className="flex-1 rounded-lg py-2 text-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Pay Now
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function isColorDark(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export default DashboardTheme;
