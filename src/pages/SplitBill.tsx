import { useState, useMemo } from "react";
import { ArrowLeft, Users, ListChecks, PencilLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { BILL_ITEMS, TAX_RATE, getSubtotal, getTotal } from "@/data/mock-bill";

const total = getTotal(BILL_ITEMS);
const subtotal = getSubtotal(BILL_ITEMS);
const tax = subtotal * TAX_RATE;

const SplitBill = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-6 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate("/bill")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "var(--restaurant-name)" }}
        >
          Split Bill
        </h1>
      </div>

      <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-xs text-muted-foreground">Total to split</p>
        <p className="text-2xl font-bold text-foreground">€{total.toFixed(2)}</p>
      </div>

      <Tabs defaultValue="item" className="flex flex-1 flex-col">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="equal" className="flex-1 gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Equal
          </TabsTrigger>
          <TabsTrigger value="item" className="flex-1 gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" /> By Item
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 gap-1.5 text-xs">
            <PencilLine className="h-3.5 w-3.5" /> Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equal"><EqualSplit /></TabsContent>
        <TabsContent value="item"><ByItemSplit /></TabsContent>
        <TabsContent value="custom"><CustomSplit /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Equal Split ─── */
const EqualSplit = () => {
  const [people, setPeople] = useState(2);
  const perPerson = total / people;
  const taxPerPerson = tax / people;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          onClick={() => setPeople(Math.max(1, people - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground"
        >
          −
        </button>
        <div className="text-center">
          <span className="text-3xl font-bold text-foreground">{people}</span>
          <p className="text-xs text-muted-foreground">people</p>
        </div>
        <button
          onClick={() => setPeople(people + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {Array.from({ length: people }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-border"
          >
            <span className="text-sm text-foreground">Person {i + 1}</span>
            <span className="text-sm font-semibold text-primary">€{perPerson.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-secondary/50 px-4 py-3 text-center text-xs text-muted-foreground">
        Tax included: <span className="font-semibold text-foreground">€{taxPerPerson.toFixed(2)}</span> per person
      </div>

      <Button variant="cta" size="xl" className="mt-auto pt-4 w-full">
        Confirm Split
      </Button>
    </div>
  );
};

/* ─── By Item Split ─── */
const ByItemSplit = () => {
  // Track selected items and their chosen quantities
  const [selections, setSelections] = useState<Record<number, number>>({});

  const toggleItem = (id: number) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const updateQty = (id: number, qty: number) => {
    setSelections((prev) => ({ ...prev, [id]: qty }));
  };

  const mySubtotal = BILL_ITEMS.filter((i) => i.id in selections).reduce(
    (s, i) => s + (selections[i.id] ?? 1) * i.price,
    0
  );
  const myTotal = mySubtotal + mySubtotal * TAX_RATE;

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-xs text-muted-foreground">Select items you're paying for:</p>
      <div className="space-y-1.5">
        {BILL_ITEMS.map((item) => {
          const isSelected = item.id in selections;
          const selectedQty = selections[item.id] ?? 1;
          const displayPrice = isSelected ? selectedQty * item.price : item.qty * item.price;

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleItem(item.id)}
                className={`flex w-full items-center rounded-xl px-4 py-3 ring-1 transition-all ${
                  isSelected ? "bg-primary/5 ring-primary" : "bg-card ring-border"
                }`}
              >
                {/* Radio circle */}
                <div
                  className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className="flex-1 text-left text-sm font-medium text-foreground">
                  {item.name}
                  {item.qty > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">×{item.qty}</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  €{displayPrice.toFixed(2)}
                </span>
              </button>

              {/* Quantity dropdown for multi-qty items */}
              {isSelected && item.qty > 1 && (
                <div className="ml-12 mt-1 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>How many did you have?</span>
                  <div className="relative">
                    <select
                      value={selectedQty}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                      className="appearance-none rounded-md bg-card py-1 pl-2 pr-6 text-xs font-semibold text-foreground ring-1 ring-border focus:outline-none focus:ring-primary"
                    >
                      {Array.from({ length: item.qty }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />
      <div className="flex justify-between text-lg font-bold text-foreground">
        <span>Your total</span>
        <span>€{myTotal.toFixed(2)}</span>
      </div>

      <Button
        variant="cta"
        size="xl"
        className="mt-4 w-full"
        disabled={Object.keys(selections).length === 0}
      >
        Pay My Share
      </Button>
    </div>
  );
};

/* ─── Custom Split ─── */
const CustomSplit = () => {
  const [amount, setAmount] = useState("");
  const myAmount = parseFloat(amount) || 0;
  const remaining = total - myAmount;

  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-xl bg-card px-4 py-4 ring-1 ring-border">
        <label className="mb-2 block text-xs text-muted-foreground">Enter your amount</label>
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold text-muted-foreground">€</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      <Separator className="my-4" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Bill total</span>
        <span>€{total.toFixed(2)}</span>
      </div>
      <div className={`mt-2 flex justify-between text-sm font-semibold ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>
        <span>Remaining for others</span>
        <span>€{remaining.toFixed(2)}</span>
      </div>

      <Button
        variant="cta"
        size="xl"
        className="mt-auto pt-4 w-full"
        disabled={myAmount <= 0 || myAmount > total}
      >
        Pay €{myAmount.toFixed(2)}
      </Button>
    </div>
  );
};

export default SplitBill;
