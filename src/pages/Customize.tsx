import { useState } from "react";
import { ArrowLeft, Receipt, MapPin, Clock, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const FONTS = [
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

const Customize = () => {
  const navigate = useNavigate();
  const [primary, setPrimary] = useState("#d4940a");
  const [secondary, setSecondary] = useState("#f5f0e8");
  const [font, setFont] = useState(FONTS[0].value);
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [restaurantName, setRestaurantName] = useState("La Maison Dorée");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Controls */}
      <div className="flex w-full flex-col border-r border-border bg-card p-6 lg:w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground ring-1 ring-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
            Theme Editor
          </h1>
        </div>

        <div className="space-y-5">
          {/* Restaurant Name */}
          <ControlGroup label="Restaurant Name">
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-primary"
            />
          </ControlGroup>

          {/* Logo Upload */}
          <ControlGroup label="Logo">
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-sm text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors">
              Click to upload logo
            </div>
          </ControlGroup>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <ControlGroup label="Primary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <span className="text-xs text-muted-foreground font-mono">{primary}</span>
              </div>
            </ControlGroup>
            <ControlGroup label="Secondary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <span className="text-xs text-muted-foreground font-mono">{secondary}</span>
              </div>
            </ControlGroup>
          </div>

          {/* Font Selector */}
          <ControlGroup label="Font">
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="w-full rounded-xl bg-background px-4 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-primary"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </ControlGroup>

          {/* Layout Toggle */}
          <ControlGroup label="Menu Layout">
            <div className="flex gap-2">
              {(["list", "grid"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize transition-all ${
                    layout === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </ControlGroup>
        </div>
      </div>

      {/* Right Preview */}
      <div className="hidden flex-1 items-center justify-center bg-muted/50 p-8 lg:flex">
        <div className="relative">
          {/* Phone frame */}
          <div className="h-[700px] w-[340px] overflow-hidden rounded-[2.5rem] border-[8px] border-foreground/10 bg-background shadow-2xl">
            <div
              className="flex h-full flex-col items-center overflow-y-auto px-5 pb-8 pt-10"
              style={{ backgroundColor: secondary }}
            >
              {/* Mock logo */}
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold shadow-md"
                style={{ backgroundColor: primary, color: "#fff" }}
              >
                {restaurantName.charAt(0)}
              </div>
              <h2 className="mb-1 text-center text-xl font-bold" style={{ fontFamily: font, color: "#1a1a1a" }}>
                {restaurantName}
              </h2>
              <p className="mb-6 text-center text-xs" style={{ color: "#888" }}>
                Fine dining, redefined.
              </p>

              <div className="mb-5 w-full rounded-2xl bg-white/80 p-4 shadow-sm">
                <p className="text-center text-xs leading-relaxed" style={{ color: "#555" }}>
                  Welcome to our table. Enjoy handcrafted dishes made with locally sourced ingredients.
                </p>
              </div>

              <button
                className="mb-6 w-full rounded-xl py-3.5 text-sm font-semibold shadow-lg transition-transform active:scale-[0.98]"
                style={{ backgroundColor: primary, color: "#fff" }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Receipt className="h-4 w-4" />
                  View My Bill
                </span>
              </button>

              <div className="w-full space-y-2">
                {[
                  { icon: <MapPin className="h-3.5 w-3.5" />, text: "42 Rue de la Cuisine" },
                  { icon: <Clock className="h-3.5 w-3.5" />, text: "Mon–Sat · 12–11pm" },
                  { icon: <Phone className="h-3.5 w-3.5" />, text: "+33 1 23 45 67" },
                ].map((info, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl bg-white/80 px-3 py-2.5"
                  >
                    <span style={{ color: primary }}>{info.icon}</span>
                    <span className="text-xs" style={{ color: "#555" }}>{info.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Notch */}
          <div className="absolute left-1/2 top-[8px] h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground/10" />
        </div>
      </div>
    </div>
  );
};

const ControlGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

export default Customize;
