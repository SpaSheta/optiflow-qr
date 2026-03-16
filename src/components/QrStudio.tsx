import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Copy, Printer, RefreshCw, FileDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/* ── Types ── */
export interface QrSettings {
  dot_color: string;
  bg_color: string;
  dot_style: "square" | "rounded" | "dots";
  show_logo: boolean;
  label_text: string;
  label_size: "S" | "M" | "L";
  show_url: boolean;
  card_style: "minimal" | "branded" | "full";
}

const DEFAULT_SETTINGS: QrSettings = {
  dot_color: "#0F172A",
  bg_color: "#FFFFFF",
  dot_style: "square",
  show_logo: true,
  label_text: "",
  label_size: "M",
  show_url: false,
  card_style: "branded",
};

const DOT_COLORS = ["#0F172A", "#0FBCB0", "#7C3AED", "#DC2626", "#EA580C", "#000000"];
const BG_COLORS = ["#FFFFFF", "#F8FAFC", "#0F172A", "#0FBCB0"];

interface QrStudioProps {
  tableId: string;
  tableNumber: string;
  tableLabel?: string | null;
  token: string;
  restaurantSlug: string;
  restaurantName: string;
  restaurantLogoUrl?: string | null;
  savedSettings?: any;
  qrTokenQueryKey: string[];
}

export default function QrStudio({
  tableId,
  tableNumber,
  tableLabel,
  token,
  restaurantSlug,
  restaurantName,
  restaurantLogoUrl,
  savedSettings,
  qrTokenQueryKey,
}: QrStudioProps) {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [settings, setSettings] = useState<QrSettings>(() => ({
    ...DEFAULT_SETTINGS,
    label_text: `Table ${tableNumber}`,
    ...(savedSettings ?? {}),
  }));

  // Reset when table changes
  useEffect(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      label_text: `Table ${tableNumber}`,
      ...(savedSettings ?? {}),
    });
  }, [tableId, savedSettings, tableNumber]);

  const qrUrl = `${window.location.origin}/r/${restaurantSlug}/t/${token}`;

  const update = (patch: Partial<QrSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveSettings = useCallback(
    (s: QrSettings) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await supabase
          .from("table_qr_tokens")
          .update({ qr_settings: s as any })
          .eq("table_id", tableId);
        qc.invalidateQueries({ queryKey: qrTokenQueryKey });
      }, 600);
    },
    [tableId, qrTokenQueryKey, qc]
  );

  // Generate QR on canvas
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 1000,
      margin: 2,
      color: { dark: settings.dot_color, light: settings.bg_color },
    }).then(setQrDataUrl).catch(() => {});
  }, [qrUrl, settings.dot_color, settings.bg_color]);

  // Draw styled QR on canvas for rounded/dots
  useEffect(() => {
    if (settings.dot_style === "square") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: settings.dot_color, light: settings.bg_color },
    }).then(() => {
      if (settings.dot_style === "square") return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = settings.bg_color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const moduleCount = 37; // typical for ~50 char URLs
      const moduleSize = canvas.width / (moduleCount + 4);
      const offset = moduleSize * 2;
      
      ctx.fillStyle = settings.dot_color;
      for (let y = 0; y < canvas.height; y += moduleSize) {
        for (let x = 0; x < canvas.width; x += moduleSize) {
          const px = Math.floor(x + moduleSize / 2);
          const py = Math.floor(y + moduleSize / 2);
          if (px < imageData.width && py < imageData.height) {
            const idx = (py * imageData.width + px) * 4;
            if (imageData.data[idx] < 128) {
              if (settings.dot_style === "dots") {
                ctx.beginPath();
                ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.38, 0, Math.PI * 2);
                ctx.fill();
              } else {
                const r = moduleSize * 0.3;
                ctx.beginPath();
                ctx.roundRect(x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1, r);
                ctx.fill();
              }
            }
          }
        }
      }
    }).catch(() => {});
  }, [qrUrl, settings.dot_color, settings.bg_color, settings.dot_style]);

  /* ── Regen ── */
  const [regenOpen, setRegenOpen] = useState(false);
  const regenMutation = useMutation({
    mutationFn: async () => {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("table_qr_tokens")
        .update({ token: newToken, regenerated_at: new Date().toISOString() })
        .eq("table_id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qrTokenQueryKey });
      setRegenOpen(false);
      toast.success("QR code regenerated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Actions ── */
  const downloadPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `table-${tableNumber}.png`;
    a.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    toast.success("Copied! ✓");
  };

  const printCard = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const labelSize = settings.label_size === "S" ? "18px" : settings.label_size === "L" ? "32px" : "24px";
    win.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f8fafc}
      .card{background:white;border-radius:16px;padding:40px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
      img.qr{width:300px;height:300px;border-radius:8px}
      .name{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#0F172A;margin-bottom:16px}
      .label{font-size:${labelSize};font-weight:800;color:#0F172A;margin-top:16px}
      .cta{font-size:11px;color:#94A3B8;margin-top:8px;text-transform:uppercase;letter-spacing:1px}
      .url{font-size:10px;color:#94A3B8;margin-top:8px;word-break:break-all}</style></head>
      <body><div class="card">
      ${settings.card_style !== "minimal" && restaurantLogoUrl ? `<img src="${restaurantLogoUrl}" style="width:48px;height:48px;border-radius:10px;margin:0 auto 12px;" />` : ""}
      ${settings.card_style === "full" ? `<div class="name">${restaurantName}</div>` : ""}
      <img class="qr" src="${qrDataUrl}" />
      <div class="label">${settings.label_text}</div>
      ${settings.card_style === "full" ? '<div class="cta">Scan to see your bill</div>' : ""}
      ${settings.show_url ? `<div class="url">${qrUrl}</div>` : ""}
      </div></body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  const labelFontSize = settings.label_size === "S" ? "text-sm" : settings.label_size === "L" ? "text-2xl" : "text-lg";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl text-foreground" style={{ fontWeight: 800 }}>
          Table {tableNumber} — QR Studio
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how your QR code looks when printed
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── CONTROLS ── */}
        <div className="space-y-6">
          {/* QR Color */}
          <div>
            <Label className="mb-2 block">QR Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {DOT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ dot_color: c })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    settings.dot_color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"
                  )}
                  style={{ background: c }}
                />
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 w-8 rounded-full border-2 border-dashed border-border bg-gradient-to-br from-red-400 via-green-400 to-blue-400 text-[8px] text-white font-bold flex items-center justify-center">
                    +
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker color={settings.dot_color} onChange={(c) => update({ dot_color: c })} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* BG Color */}
          <div>
            <Label className="mb-2 block">Background Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ bg_color: c })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    settings.bg_color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border",
                    c === "#FFFFFF" && "ring-1 ring-border"
                  )}
                  style={{ background: c }}
                />
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 w-8 rounded-full border-2 border-dashed border-border bg-gradient-to-br from-pink-400 via-yellow-400 to-cyan-400 text-[8px] text-white font-bold flex items-center justify-center">
                    +
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker color={settings.bg_color} onChange={(c) => update({ bg_color: c })} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Dot Style */}
          <div>
            <Label className="mb-2 block">Dot Style</Label>
            <div className="flex gap-2">
              {(["square", "rounded", "dots"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update({ dot_style: style })}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-3 text-center text-sm font-semibold transition-all",
                    settings.dot_style === style
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {style === "square" ? "■" : style === "rounded" ? "●" : "◉"}{" "}
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Center Logo */}
          <div className="flex items-center justify-between">
            <Label>Center Logo</Label>
            <Switch checked={settings.show_logo} onCheckedChange={(v) => update({ show_logo: v })} />
          </div>

          {/* Label Text */}
          <div>
            <Label className="mb-2 block">Table Label Text</Label>
            <Input
              value={settings.label_text}
              onChange={(e) => update({ label_text: e.target.value.slice(0, 30) })}
              maxLength={30}
              placeholder={`Table ${tableNumber}`}
            />
            <p className="text-xs text-muted-foreground mt-1">{settings.label_text.length}/30</p>
          </div>

          {/* Label Size */}
          <div>
            <Label className="mb-2 block">Label Size</Label>
            <div className="flex gap-2">
              {(["S", "M", "L"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update({ label_size: size })}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-2 text-center text-sm font-semibold transition-all",
                    settings.label_size === size
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Show URL */}
          <div className="flex items-center justify-between">
            <Label>Show URL below QR</Label>
            <Switch checked={settings.show_url} onCheckedChange={(v) => update({ show_url: v })} />
          </div>

          {/* Card Style */}
          <div>
            <Label className="mb-2 block">Print Card Style</Label>
            <div className="flex gap-2">
              {(["minimal", "branded", "full"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update({ card_style: style })}
                  className={cn(
                    "flex-1 rounded-xl border-2 p-3 text-center transition-all",
                    settings.card_style === style
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="text-xs font-bold text-foreground capitalize">{style}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    {style === "minimal" && "Just QR"}
                    {style === "branded" && "Logo + QR + label"}
                    {style === "full" && "Logo + name + QR + CTA"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── LIVE PREVIEW ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-[280px] rounded-2xl bg-white border border-border p-6 shadow-lg flex flex-col items-center gap-3" style={{ background: settings.bg_color }}>
            {settings.card_style !== "minimal" && settings.show_logo && restaurantLogoUrl && (
              <img src={restaurantLogoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain" />
            )}
            {settings.card_style === "full" && (
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: settings.dot_color }}>{restaurantName}</p>
            )}
            
            {/* QR */}
            <div className="rounded-xl overflow-hidden" style={{ background: settings.bg_color }}>
              {settings.dot_style === "square" ? (
                <img src={qrDataUrl} alt="QR Code" className="h-[200px] w-[200px]" />
              ) : (
                <canvas ref={canvasRef} className="h-[200px] w-[200px]" style={{ imageRendering: "auto" }} />
              )}
              {settings.show_logo && restaurantLogoUrl && (
                <div className="relative">
                  <img
                    src={restaurantLogoUrl}
                    alt=""
                    className="absolute bottom-[88px] left-1/2 -translate-x-1/2 h-10 w-10 rounded-lg bg-white p-1 shadow"
                  />
                </div>
              )}
            </div>

            {settings.card_style === "full" && (
              <p className="text-[10px] uppercase tracking-wider" style={{ color: settings.dot_color === "#FFFFFF" ? "#0F172A" : settings.dot_color, opacity: 0.6 }}>
                Scan to see your bill
              </p>
            )}
            <p className={cn("font-extrabold", labelFontSize)} style={{ color: settings.dot_color === settings.bg_color ? "#0F172A" : settings.dot_color }}>
              {settings.label_text || `Table ${tableNumber}`}
            </p>
            {settings.show_url && (
              <p className="text-[9px] text-center break-all opacity-50" style={{ color: settings.dot_color }}>{qrUrl}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Live preview — updates instantly</p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-center w-full">
            <Button size="sm" onClick={downloadPNG}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download PNG
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
            </Button>
            <Button size="sm" variant="outline" onClick={printCard}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-amber-600"
              onClick={() => setRegenOpen(true)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for styled QR */}
      {settings.dot_style !== "square" && (
        <canvas ref={canvasRef} className="hidden" width={300} height={300} />
      )}

      {/* Regenerate dialog */}
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
}
