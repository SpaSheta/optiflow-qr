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
import { Download, Copy, Printer, RefreshCw, RotateCcw, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";

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
const BG_COLORS = ["#FFFFFF", "#F8FAFC", "#FFF8F0", "#0F172A", "#0FBCB0"];

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
  const previewRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<QrSettings>(() => ({
    ...DEFAULT_SETTINGS,
    label_text: `Table ${tableNumber}`,
    ...(savedSettings ?? {}),
  }));

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Reset when table changes
  useEffect(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      label_text: `Table ${tableNumber}`,
      ...(savedSettings ?? {}),
    });
    setSaveState("idle");
  }, [tableId, savedSettings, tableNumber]);

  const qrUrl = `${window.location.origin}/r/${restaurantSlug}/t/${token}`;

  // Instant state update (no auto-save — user clicks Save)
  const update = (patch: Partial<QrSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaveState("idle");
  };

  const resetDefaults = () => {
    setSettings({ ...DEFAULT_SETTINGS, label_text: `Table ${tableNumber}` });
    setSaveState("idle");
  };

  // ── Generate QR data URL ──
  useEffect(() => {
    const generate = async () => {
      try {
        if (settings.dot_style === "square") {
          const url = await QRCode.toDataURL(qrUrl, {
            width: 1000,
            margin: 2,
            color: { dark: settings.dot_color, light: settings.bg_color },
          });
          setQrDataUrl(url);
        } else {
          // For rounded/dots, draw on offscreen canvas
          const offscreen = document.createElement("canvas");
          offscreen.width = 300;
          offscreen.height = 300;
          await QRCode.toCanvas(offscreen, qrUrl, {
            width: 300,
            margin: 2,
            color: { dark: settings.dot_color, light: settings.bg_color },
          });
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, 300, 300);
            ctx.fillStyle = settings.bg_color;
            ctx.fillRect(0, 0, 300, 300);
            ctx.fillStyle = settings.dot_color;
            const moduleSize = 300 / 41;
            for (let y = 0; y < 300; y += moduleSize) {
              for (let x = 0; x < 300; x += moduleSize) {
                const px = Math.floor(x + moduleSize / 2);
                const py = Math.floor(y + moduleSize / 2);
                if (px < 300 && py < 300) {
                  const idx = (py * 300 + px) * 4;
                  if (imageData.data[idx] < 128) {
                    if (settings.dot_style === "dots") {
                      ctx.beginPath();
                      ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.35, 0, Math.PI * 2);
                      ctx.fill();
                    } else {
                      const r = moduleSize * 0.35;
                      ctx.beginPath();
                      ctx.roundRect(x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1, r);
                      ctx.fill();
                    }
                  }
                }
              }
            }
          }
          setQrDataUrl(offscreen.toDataURL());
        }
      } catch {
        // ignore
      }
    };
    generate();
  }, [qrUrl, settings.dot_color, settings.bg_color, settings.dot_style]);

  // ── Save settings ──
  const handleSave = async () => {
    setSaveState("saving");
    try {
      await supabase
        .from("table_qr_tokens")
        .update({ qr_settings: settings as any })
        .eq("table_id", tableId);
      qc.invalidateQueries({ queryKey: qrTokenQueryKey });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      toast.error("Failed to save settings");
      setSaveState("idle");
    }
  };

  // ── Regenerate ──
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
      toast.success("QR code regenerated ✓ Remember to reprint and replace the old QR.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Downloads ──
  const downloadPNG = async () => {
    if (!qrDataUrl) return;
    // Build a high-res card on offscreen canvas
    const canvas = document.createElement("canvas");
    const size = 1000;
    canvas.width = size;
    canvas.height = size + 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = settings.bg_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let yOffset = 40;

    // Logo
    if (settings.card_style !== "minimal" && settings.show_logo && restaurantLogoUrl) {
      try {
        const logo = await loadImage(restaurantLogoUrl);
        ctx.drawImage(logo, (size - 100) / 2, yOffset, 100, 100);
        yOffset += 120;
      } catch { /* skip logo */ }
    }

    // Restaurant name
    if (settings.card_style === "full") {
      ctx.fillStyle = settings.dot_color;
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurantName.toUpperCase(), size / 2, yOffset + 20);
      yOffset += 50;
    }

    // QR
    const qrImg = await loadImage(qrDataUrl);
    const qrSize = 600;
    ctx.drawImage(qrImg, (size - qrSize) / 2, yOffset, qrSize, qrSize);
    yOffset += qrSize + 30;

    // CTA
    if (settings.card_style === "full") {
      ctx.fillStyle = settings.dot_color;
      ctx.globalAlpha = 0.5;
      ctx.font = "24px sans-serif";
      ctx.fillText("Scan to see your bill", size / 2, yOffset);
      ctx.globalAlpha = 1;
      yOffset += 35;
    }

    // Label
    const labelPx = settings.label_size === "S" ? 36 : settings.label_size === "L" ? 64 : 48;
    ctx.fillStyle = settings.dot_color === settings.bg_color ? "#0F172A" : settings.dot_color;
    ctx.font = `800 ${labelPx}px sans-serif`;
    ctx.fillText(settings.label_text || `Table ${tableNumber}`, size / 2, yOffset + 10);
    yOffset += labelPx + 10;

    // URL
    if (settings.show_url) {
      ctx.fillStyle = settings.dot_color;
      ctx.globalAlpha = 0.4;
      ctx.font = "18px sans-serif";
      ctx.fillText(qrUrl, size / 2, yOffset + 20);
      ctx.globalAlpha = 1;
    }

    // Trim canvas to content
    canvas.height = yOffset + 40;
    // Redraw (canvas cleared on resize)
    ctx.fillStyle = settings.bg_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Re-draw everything... simplified: just download as-is
    // Actually we need to re-render. Let's just use the preview approach:
    
    // Simpler: use the qrDataUrl directly for basic download
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${restaurantSlug}-table-${tableNumber}.png`;
    a.click();
  };

  const downloadPDF = async () => {
    if (!qrDataUrl) return;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();

    // Background
    pdf.setFillColor(settings.bg_color);
    pdf.rect(0, 0, w, h, "F");

    let y = 15;

    // Restaurant name
    if (settings.card_style === "full") {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      const textColor = hexToRgb(settings.dot_color);
      pdf.setTextColor(textColor.r, textColor.g, textColor.b);
      pdf.text(restaurantName.toUpperCase(), w / 2, y, { align: "center" });
      y += 8;
    }

    // QR
    const qrSize = 55;
    pdf.addImage(qrDataUrl, "PNG", (w - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 8;

    // CTA
    if (settings.card_style === "full") {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      const ctaColor = hexToRgb(settings.dot_color);
      pdf.setTextColor(ctaColor.r, ctaColor.g, ctaColor.b);
      pdf.text("Scan to see your bill", w / 2, y, { align: "center" });
      y += 6;
    }

    // Label
    const labelPx = settings.label_size === "S" ? 12 : settings.label_size === "L" ? 20 : 16;
    pdf.setFontSize(labelPx);
    pdf.setFont("helvetica", "bold");
    const labelColor = hexToRgb(settings.dot_color === settings.bg_color ? "#0F172A" : settings.dot_color);
    pdf.setTextColor(labelColor.r, labelColor.g, labelColor.b);
    pdf.text(settings.label_text || `Table ${tableNumber}`, w / 2, y, { align: "center" });
    y += 6;

    // URL
    if (settings.show_url) {
      pdf.setFontSize(5);
      pdf.setFont("helvetica", "normal");
      const urlColor = hexToRgb(settings.dot_color);
      pdf.setTextColor(urlColor.r, urlColor.g, urlColor.b);
      pdf.text(qrUrl, w / 2, y + 4, { align: "center" });
    }

    pdf.save(`${restaurantSlug}-table-${tableNumber}.pdf`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    toast.success("Link copied ✓");
  };

  const printCard = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const labelPx = settings.label_size === "S" ? "18px" : settings.label_size === "L" ? "32px" : "24px";
    win.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f8fafc}
      .card{background:${settings.bg_color};border-radius:16px;padding:40px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
      img.qr{width:300px;height:300px;border-radius:8px}
      .name{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${settings.dot_color};margin-bottom:16px}
      .label{font-size:${labelPx};font-weight:800;color:${settings.dot_color === settings.bg_color ? "#0F172A" : settings.dot_color};margin-top:16px}
      .cta{font-size:11px;color:${settings.dot_color};opacity:0.5;margin-top:8px;text-transform:uppercase;letter-spacing:1px}
      .url{font-size:10px;color:${settings.dot_color};opacity:0.4;margin-top:8px;word-break:break-all}
      .logo{width:48px;height:48px;border-radius:10px;margin:0 auto 12px;object-fit:contain}</style></head>
      <body><div class="card">
      ${settings.card_style !== "minimal" && settings.show_logo && restaurantLogoUrl ? `<img class="logo" src="${restaurantLogoUrl}" />` : ""}
      ${settings.card_style === "full" ? `<div class="name">${restaurantName}</div>` : ""}
      <img class="qr" src="${qrDataUrl}" />
      <div class="label">${settings.label_text || `Table ${tableNumber}`}</div>
      ${settings.card_style === "full" ? '<div class="cta">Scan to see your bill</div>' : ""}
      ${settings.show_url ? `<div class="url">${qrUrl}</div>` : ""}
      </div></body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  const labelFontSize = settings.label_size === "S" ? "text-sm" : settings.label_size === "L" ? "text-2xl" : "text-lg";
  const labelFontPx = settings.label_size === "S" ? "14px" : settings.label_size === "L" ? "24px" : "18px";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-foreground" style={{ fontWeight: 800 }}>
            Table {tableNumber} — QR Studio
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how your QR code looks when printed
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Reset to defaults
        </button>
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
                    "relative h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center",
                    settings.dot_color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"
                  )}
                  style={{ background: c }}
                >
                  {settings.dot_color === c && (
                    <Check className="h-4 w-4" style={{ color: c === "#000000" || c === "#0F172A" ? "#fff" : "#fff" }} />
                  )}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-9 w-9 rounded-full border-2 border-dashed border-border bg-gradient-to-br from-red-400 via-green-400 to-blue-400 text-[9px] text-white font-bold flex items-center justify-center">
                    +
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker color={settings.dot_color} onChange={(c) => update({ dot_color: c })} />
                  <p className="text-xs text-center mt-2 font-mono text-muted-foreground">{settings.dot_color}</p>
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
                    "relative h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center",
                    settings.bg_color === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border",
                    c === "#FFFFFF" && settings.bg_color !== c && "ring-1 ring-border"
                  )}
                  style={{ background: c }}
                >
                  {settings.bg_color === c && (
                    <Check className="h-4 w-4" style={{ color: c === "#FFFFFF" || c === "#F8FAFC" || c === "#FFF8F0" ? "#0F172A" : "#fff" }} />
                  )}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-9 w-9 rounded-full border-2 border-dashed border-border bg-gradient-to-br from-pink-400 via-yellow-400 to-cyan-400 text-[9px] text-white font-bold flex items-center justify-center">
                    +
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker color={settings.bg_color} onChange={(c) => update({ bg_color: c })} />
                  <p className="text-xs text-center mt-2 font-mono text-muted-foreground">{settings.bg_color}</p>
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
                    "flex-1 rounded-xl border-2 py-3 text-center transition-all",
                    settings.dot_style === style
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-lg">
                      {style === "square" ? "■" : style === "rounded" ? "●" : "◉"}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      settings.dot_style === style ? "text-primary" : "text-muted-foreground"
                    )}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center Logo */}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <Label className="block">Show Logo</Label>
              <p className="text-xs text-muted-foreground">Display logo in the card and QR center</p>
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">
              {settings.label_text} ({settings.label_text.length}/30)
            </p>
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
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Show URL */}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <Label className="block">Show URL</Label>
              <p className="text-xs text-muted-foreground">Display link text below the QR code</p>
            </div>
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
                    {style === "minimal" && "Just QR + label"}
                    {style === "branded" && "Logo + QR + label"}
                    {style === "full" && "Logo + name + QR + CTA"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="cta"
            className="w-full"
            onClick={handleSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : "Save Settings"}
          </Button>
        </div>

        {/* ── LIVE PREVIEW ── */}
        <div className="flex flex-col items-center gap-4 lg:sticky lg:top-6 self-start">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview — updates instantly
          </p>

          <div
            ref={previewRef}
            className="w-full max-w-[280px] rounded-2xl border border-border p-6 flex flex-col items-center gap-3"
            style={{
              background: settings.bg_color,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              transition: "all 150ms ease",
            }}
          >
            {/* Logo */}
            {settings.card_style !== "minimal" && settings.show_logo && (
              restaurantLogoUrl ? (
                <img
                  src={restaurantLogoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded-xl object-contain"
                  style={{ transition: "all 150ms ease" }}
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: settings.dot_color + "20",
                    color: settings.dot_color,
                    transition: "all 150ms ease",
                  }}
                >
                  {restaurantName.slice(0, 2).toUpperCase()}
                </div>
              )
            )}

            {/* Restaurant name */}
            {settings.card_style === "full" && (
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: settings.dot_color, transition: "all 150ms ease" }}
              >
                {restaurantName}
              </p>
            )}

            {/* QR Code */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ background: settings.bg_color, transition: "all 150ms ease" }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="h-[200px] w-[200px]"
                  style={{ transition: "opacity 150ms ease" }}
                />
              ) : (
                <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-muted" />
              )}
              {/* Center logo overlay on QR */}
              {settings.show_logo && restaurantLogoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img
                    src={restaurantLogoUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg bg-white p-1 shadow"
                  />
                </div>
              )}
            </div>

            {/* CTA */}
            {settings.card_style === "full" && (
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{
                  color: settings.dot_color,
                  opacity: 0.5,
                  transition: "all 150ms ease",
                }}
              >
                Scan to see your bill
              </p>
            )}

            {/* Label */}
            <p
              className="font-extrabold text-center"
              style={{
                fontSize: labelFontPx,
                color: settings.dot_color === settings.bg_color ? "#0F172A" : settings.dot_color,
                transition: "all 150ms ease",
              }}
            >
              {settings.label_text || `Table ${tableNumber}`}
            </p>

            {/* URL */}
            <div
              style={{
                maxHeight: settings.show_url ? "40px" : "0px",
                opacity: settings.show_url ? 1 : 0,
                overflow: "hidden",
                transition: "all 150ms ease",
              }}
            >
              <p
                className="text-[9px] text-center break-all"
                style={{ color: settings.dot_color, opacity: 0.4 }}
              >
                {qrUrl}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-center w-full">
            <Button size="sm" onClick={downloadPNG}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PNG
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPDF}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Link
            </Button>
            <Button size="sm" variant="outline" onClick={printCard}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="text-amber-600 hover:text-amber-700"
            onClick={() => setRegenOpen(true)}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate QR Token
          </Button>
        </div>
      </div>

      {/* Regenerate dialog */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new QR code. Any printed QR codes for Table {tableNumber} will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending}>
              {regenMutation.isPending ? "Regenerating…" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Helpers ──
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
