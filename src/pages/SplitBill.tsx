import { useState, useMemo } from "react";
import { ArrowLeft, Users, ListChecks, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { BILL_ITEMS, TAX_RATE, getTotal } from "@/data/mock-bill";

const total = getTotal(BILL_ITEMS);

const SplitBill = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-6 pt-5">
      {/* Header */}
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

      <Tabs defaultValue="equal" className="flex flex-1 flex-col">
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

      <Button variant="cta" size="xl" className="mt-auto pt-4 w-full">
        Confirm Split
      </Button>
    </div>
  );
};

/* ─── By Item Split ─── */
const ByItemSplit = () => {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const mySubtotal = BILL_ITEMS.filter((i) => selected.has(i.id)).reduce(
    (s, i) => s + i.qty * i.price,
    0
  );
  const myTotal = mySubtotal + mySubtotal * TAX_RATE;

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-xs text-muted-foreground">Select items you're paying for:</p>
      <div className="space-y-1.5">
        {BILL_ITEMS.map((item) => {
          const checked = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`flex w-full items-center rounded-xl px-4 py-3 ring-1 transition-all ${
                checked
                  ? "bg-primary/5 ring-primary"
                  : "bg-card ring-border"
              }`}
            >
              <div
                className={`mr-3 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                  checked ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}
              >
                {checked && (
                  <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-left text-sm font-medium text-foreground">{item.name}</span>
              <span className="text-sm text-muted-foreground">€{(item.qty * item.price).toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      <Separator className="my-4" />
      <div className="flex justify-between text-lg font-bold text-foreground">
        <span>Your total</span>
        <span>€{myTotal.toFixed(2)}</span>
      </div>

      <Button variant="cta" size="xl" className="mt-4 w-full" disabled={selected.size === 0}>
        Pay My Share
      </Button>
    </div>
  );
};

/* ─── Custom Split ─── */
const CustomSplit = () => {
  const [amounts, setAmounts] = useState<Record<string, string>>({ "Person 1": "", "Person 2": "" });
  const people = Object.keys(amounts);

  const addPerson = () => {
    setAmounts((prev) => ({ ...prev, [`Person ${people.length + 1}`]: "" }));
  };

  const updateAmount = (name: string, val: string) => {
    setAmounts((prev) => ({ ...prev, [name]: val }));
  };

  const assigned = Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remaining = total - assigned;

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2">
        {people.map((name) => (
          <div key={name} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
            <span className="flex-1 text-sm text-foreground">{name}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amounts[name]}
                onChange={(e) => updateAmount(name, e.target.value)}
                placeholder="0.00"
                className="w-20 bg-transparent text-right text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addPerson}
        className="mt-3 text-sm font-medium text-primary hover:underline"
      >
        + Add person
      </button>

      <Separator className="my-4" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Assigned</span>
        <span>€{assigned.toFixed(2)}</span>
      </div>
      <div className={`mt-1 flex justify-between text-sm font-semibold ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>
        <span>Remaining</span>
        <span>€{remaining.toFixed(2)}</span>
      </div>

      <Button variant="cta" size="xl" className="mt-4 w-full" disabled={Math.abs(remaining) > 0.01}>
        Confirm Split
      </Button>
    </div>
  );
};

export default SplitBill;
