import { ArrowLeft, Users, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { BILL_ITEMS, TAX_RATE, getSubtotal, getTotal } from "@/data/mock-bill";
import { useBillSplit, type Bill, type BillItem } from "@/hooks/useBillSplit";

/** Convert mock data into the Bill shape the hook expects. */
function buildBill(): Bill {
  const items: BillItem[] = BILL_ITEMS.map((m) => ({
    id: String(m.id),
    name: m.name,
    quantity: m.qty,
    unitPrice: m.price,
    totalPrice: m.qty * m.price,
  }));
  const subtotal = getSubtotal(BILL_ITEMS);
  const taxAmount = subtotal * TAX_RATE;
  return { items, subtotal, taxRate: TAX_RATE, taxAmount, total: getTotal(BILL_ITEMS) };
}

const bill = buildBill();

const SplitBill = () => {
  const navigate = useNavigate();
  const split = useBillSplit(bill);

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
        <p className="text-2xl font-bold text-foreground">€{bill.total.toFixed(2)}</p>
      </div>

      <Tabs
        value={split.mode}
        onValueChange={(v) => split.setMode(v as "equal" | "byItem")}
        className="flex flex-1 flex-col"
      >
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="equal" className="flex-1 gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Equal
          </TabsTrigger>
          <TabsTrigger value="byItem" className="flex-1 gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" /> By Item
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equal">
          <EqualSplitView split={split} bill={bill} />
        </TabsContent>
        <TabsContent value="byItem">
          <ByItemSplitView split={split} bill={bill} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Equal Split View ─── */
function EqualSplitView({ split, bill }: { split: ReturnType<typeof useBillSplit>; bill: Bill }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          onClick={() => split.setNumPeople(split.numPeople - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground"
        >
          −
        </button>
        <div className="text-center">
          <span className="text-3xl font-bold text-foreground">{split.numPeople}</span>
          <p className="text-xs text-muted-foreground">people</p>
        </div>
        <button
          onClick={() => split.setNumPeople(split.numPeople + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {Array.from({ length: split.numPeople }).map((_, i) => {
          const isLast = i === split.numPeople - 1;
          const personTotal = isLast
            ? split.equalTotal + split.lastPersonTaxAdjustment
            : split.equalTotal;
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-border"
            >
              <span className="text-sm text-foreground">Person {i + 1}</span>
              <span className="text-sm font-semibold text-primary">
                €{personTotal.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-secondary/50 px-4 py-3 text-center text-xs text-muted-foreground">
        Tax included:{" "}
        <span className="font-semibold text-foreground">€{split.equalTaxShare.toFixed(2)}</span>{" "}
        per person
      </div>

      <Button variant="cta" size="xl" className="mt-auto pt-4 w-full">
        Confirm Split
      </Button>
    </div>
  );
}

/* ─── By Item Split View ─── */
function ByItemSplitView({ split, bill }: { split: ReturnType<typeof useBillSplit>; bill: Bill }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-xs text-muted-foreground">Select items you're paying for:</p>
      <div className="space-y-1.5">
        {bill.items.map((item) => {
          const sel = split.itemSelections.get(item.id);
          const isSelected = sel?.selected ?? false;
          const selectedQty = sel?.selectedQuantity ?? 1;
          const displayPrice = isSelected
            ? selectedQty * item.unitPrice
            : item.totalPrice;

          return (
            <div key={item.id}>
              <button
                onClick={() => split.toggleItem(item.id)}
                className={`flex w-full items-center rounded-xl px-4 py-3 ring-1 transition-all ${
                  isSelected ? "bg-primary/5 ring-primary" : "bg-card ring-border"
                }`}
              >
                <div
                  className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
                <span className="flex-1 text-left text-sm font-medium text-foreground">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">×{item.quantity}</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">€{displayPrice.toFixed(2)}</span>
              </button>

              {isSelected && item.quantity > 1 && (
                <div className="ml-12 mt-1 flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="shrink-0">How many did you have?</span>
                  <Slider
                    min={1}
                    max={item.quantity}
                    step={1}
                    value={[selectedQty]}
                    onValueChange={([v]) => split.setItemQuantity(item.id, v)}
                    className="flex-1"
                  />
                  <span className="w-4 text-center font-semibold text-foreground">
                    {selectedQty}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Items subtotal</span>
          <span>€{split.mySubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tax (proportional)</span>
          <span>€{split.myTaxShare.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-foreground">
          <span>Your total</span>
          <span>€{split.myTotal.toFixed(2)}</span>
        </div>
      </div>

      {split.overSelectionWarning && (
        <p className="mt-2 text-xs font-medium text-destructive">
          Warning: your selection exceeds the bill total.
        </p>
      )}

      <Button
        variant="cta"
        size="xl"
        className="mt-4 w-full"
        disabled={!split.canPay}
      >
        Pay My Share
      </Button>
    </div>
  );
}

export default SplitBill;
