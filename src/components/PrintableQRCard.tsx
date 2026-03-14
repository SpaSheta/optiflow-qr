import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

interface PrintableQRCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Array<{
    id: string;
    table_number: string;
    label?: string | null;
    qrDataUrl?: string;
  }>;
  restaurantName: string;
}

const PrintableQRCard = ({ open, onOpenChange, tables, restaurantName }: PrintableQRCardProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Cards - ${restaurantName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { background: white; }
            
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
              padding: 24px;
            }

            .card {
              border: 2px solid #e0e0e0;
              border-radius: 16px;
              padding: 28px 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
              page-break-inside: avoid;
              background: white;
            }

            .restaurant-name {
              font-family: 'Playfair Display', serif;
              font-size: 16px;
              font-weight: 700;
              color: #1a1a1a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .divider {
              width: 40px;
              height: 2px;
              background: #2bb5a0;
              border-radius: 1px;
            }

            .qr-wrapper {
              padding: 8px;
              border: 1px solid #eee;
              border-radius: 12px;
            }

            .qr-wrapper img {
              width: 160px;
              height: 160px;
              display: block;
            }

            .table-number {
              font-family: 'DM Sans', sans-serif;
              font-size: 28px;
              font-weight: 700;
              color: #1a1a1a;
            }

            .table-label {
              font-family: 'DM Sans', sans-serif;
              font-size: 12px;
              color: #888;
            }

            .scan-text {
              font-family: 'DM Sans', sans-serif;
              font-size: 11px;
              color: #aaa;
              letter-spacing: 0.5px;
            }

            @media print {
              .cards-grid { padding: 12px; gap: 16px; }
              .card { border: 1.5px solid #ccc; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tablesWithQR = tables.filter((t) => t.qrDataUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Printable QR Cards</span>
            <Button onClick={handlePrint} size="sm" className="gap-2">
              <Printer className="h-4 w-4" /> Print All
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", padding: "8px" }}>
            {tablesWithQR.map((t) => (
              <div
                key={t.id}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6"
              >
                <span
                  className="text-sm font-bold uppercase tracking-widest text-foreground"
                  style={{ fontFamily: "var(--restaurant-name)" }}
                >
                  {restaurantName}
                </span>
                <div className="h-0.5 w-10 rounded-full bg-primary" />
                <div className="rounded-xl border border-border bg-white p-2">
                  <img src={t.qrDataUrl} alt={`Table ${t.table_number}`} className="h-40 w-40" />
                </div>
                <span className="text-3xl font-bold text-foreground">{t.table_number}</span>
                {t.label && <span className="text-xs text-muted-foreground">{t.label}</span>}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Scan to view menu &amp; pay
                </span>
              </div>
            ))}
          </div>
        </div>

        {tablesWithQR.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No tables with QR codes found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintableQRCard;
