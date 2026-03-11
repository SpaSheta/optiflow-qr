import { ArrowLeft, Split, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const BILL_ITEMS = [
  { id: 1, name: "Truffle Risotto", qty: 1, price: 28.0 },
  { id: 2, name: "Grilled Salmon", qty: 1, price: 34.0 },
  { id: 3, name: "Caesar Salad", qty: 2, price: 14.0 },
  { id: 4, name: "Sparkling Water", qty: 3, price: 6.5 },
  { id: 5, name: "Tiramisu", qty: 2, price: 12.0 },
  { id: 6, name: "Espresso", qty: 2, price: 4.5 },
];

const TAX_RATE = 0.1;

const Bill = () => {
  const navigate = useNavigate();

  const subtotal = BILL_ITEMS.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-6 pt-5">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--restaurant-name)" }}
          >
            Your Bill
          </h1>
          <p className="text-xs text-muted-foreground">Table 7 · 3 guests</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-primary" />
          Live
        </span>
      </div>

      {/* Items */}
      <div className="mb-4 flex-1 space-y-1">
        {/* Column headers */}
        <div className="flex items-center px-4 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="flex-1">Item</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-20 text-right">Price</span>
        </div>

        {BILL_ITEMS.map((item, i) => (
          <div
            key={item.id}
            className="animate-fade-in flex items-center rounded-xl bg-card px-4 py-3.5 ring-1 ring-border"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground">{item.name}</span>
            </div>
            <span className="w-10 text-center text-sm text-muted-foreground">
              {item.qty}
            </span>
            <span className="w-20 text-right text-sm font-semibold text-foreground">
              €{(item.qty * item.price).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mb-6 rounded-2xl bg-card p-5 ring-1 ring-border">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
          <span>Tax (10%)</span>
          <span>€{tax.toFixed(2)}</span>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between text-lg font-bold text-foreground">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="xl" className="flex-1">
          <Split className="mr-2 h-4 w-4" />
          Split Bill
        </Button>
        <Button variant="cta" size="xl" className="flex-[1.4]">
          <CreditCard className="mr-2 h-5 w-5" />
          Pay Now
        </Button>
      </div>
    </div>
  );
};

export default Bill;
