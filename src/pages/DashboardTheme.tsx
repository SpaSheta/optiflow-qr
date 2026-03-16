import { useState, useEffect } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const FONTS = ["Inter", "Poppins", "Playfair Display", "Cairo"];
const PRESETS: Record<string, { primary: string; secondary: string; bg: string }> = {
  Default: { primary: "#F5A623", secondary: "#1E3A5F", bg: "#F5F5F0" },
  Dark: { primary: "#F5A623", secondary: "#2D2D2D", bg: "#1A1A1A" },
  Warm: { primary: "#E8613C", secondary: "#5C3317", bg: "#FFF8F0" },
  Minimal: { primary: "#000000", secondary: "#666666", bg: "#FFFFFF" },
};

const ColorPicker = ({ color, onChange, label }: { color: string; onChange: (c: string) => void; label: string }) => (
  <div>
    <Label className="mb-1 block">{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm">
          <span className="h-5 w-5 rounded-md border" style={{ backgroundColor: color }} />
          {color}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <HexColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  </div>
);

const DashboardTheme = () => {
  const { restaurant, theme: existingTheme, refetch } = useRestaurant();
  const rid = restaurant?.id;

  const [primary, setPrimary] = useState("#F5A623");
  const [secondary, setSecondary] = useState("#1E3A5F");
  const [bgColor, setBgColor] = useState("#F5F5F0");
  const [font, setFont] = useState("Inter");
  const [menuLayout, setMenuLayout] = useState("grid");
  const [introVideo, setIntroVideo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (existingTheme) {
      setPrimary(existingTheme.primary_color);
      setSecondary(existingTheme.secondary_color);
      setBgColor(existingTheme.background_color);
      setFont(existingTheme.font_family);
      setMenuLayout(existingTheme.menu_layout);
      setIntroVideo(existingTheme.intro_video_url ?? "");
      setLogoUrl(existingTheme.logo_url);
    }
  }, [existingTheme]);

  const applyPreset = (name: string) => {
    const p = PRESETS[name];
    setPrimary(p.primary);
    setSecondary(p.secondary);
    setBgColor(p.bg);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalLogo = logoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${rid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("restaurant-logos").upload(path, logoFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("restaurant-logos").getPublicUrl(path);
        finalLogo = urlData.publicUrl;
      }

      const payload = {
        restaurant_id: rid!,
        primary_color: primary,
        secondary_color: secondary,
        background_color: bgColor,
        font_family: font,
        menu_layout: menuLayout,
        intro_video_url: introVideo || null,
        logo_url: finalLogo,
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
      toast.success("Theme saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isDark = isColorDark(bgColor);

  return (
    <div>
      <h1 className="text-h1 text-foreground mb-8">
        Theme
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Controls */}
        <div className="flex-1 space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                {logoUrl && !logoFile && (
                  <img src={logoUrl} alt="logo" className="mt-2 h-12 rounded-lg object-contain" />
                )}
              </div>

              <ColorPicker color={primary} onChange={setPrimary} label="Primary Color" />
              <ColorPicker color={secondary} onChange={setSecondary} label="Secondary Color" />
              <ColorPicker color={bgColor} onChange={setBgColor} label="Background Color" />

              <div>
                <Label>Font Family</Label>
                <Select value={font} onValueChange={setFont}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Menu Layout</Label>
                <div className="flex gap-2">
                  {["grid", "list"].map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={menuLayout === l ? "default" : "outline"}
                      onClick={() => setMenuLayout(l)}
                    >
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Intro Video URL</Label>
                <Input value={introVideo} onChange={(e) => setIntroVideo(e.target.value)} placeholder="https://..." />
              </div>

              <div>
                <Label>Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).map((name) => (
                    <Button key={name} size="sm" variant="outline" onClick={() => applyPreset(name)}>
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? "Saving…" : "Save Theme"}
          </Button>
        </div>

        {/* Phone preview */}
        <div className="flex justify-center lg:w-80">
          <div className="h-[580px] w-[290px] overflow-hidden rounded-[2.5rem] border-[6px] border-foreground/20 shadow-xl">
            <div className="h-full overflow-y-auto" style={{ backgroundColor: bgColor, fontFamily: font }}>
              {/* Header */}
              <div className="px-5 pb-3 pt-10" style={{ backgroundColor: secondary }}>
                {logoUrl && <img src={logoUrl} alt="logo" className="mb-2 h-8 object-contain" />}
                <h2 className="text-lg font-bold" style={{ color: primary }}>
                  {restaurant?.name ?? "Restaurant"}
                </h2>
                <p className="text-xs" style={{ color: isDark ? "#ccc" : "#666" }}>
                  Welcome! Browse our menu below.
                </p>
              </div>

              {/* Mock items */}
              <div className="p-4">
                {["Grilled Chicken", "Caesar Salad", "Tiramisu"].map((name, i) => (
                  <div
                    key={i}
                    className="mb-3 rounded-xl p-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold" style={{ color: isDark ? "#fff" : "#222" }}>
                        {name}
                      </span>
                      <span className="text-sm font-bold" style={{ color: primary }}>
                        {(i + 1) * 4500} {restaurant?.currency ?? "IQD"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: isDark ? "#aaa" : "#888" }}>
                      Delicious {name.toLowerCase()} prepared fresh.
                    </p>
                  </div>
                ))}
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
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export default DashboardTheme;
