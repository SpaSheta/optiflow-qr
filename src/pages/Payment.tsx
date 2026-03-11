import { useState } from "react";
import { ArrowLeft, QrCode, CreditCard, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getTotal, BILL_ITEMS } from "@/data/mock-bill";

const total = getTotal(BILL_ITEMS);

type Method = "fib" | "card" | "cash" | null;

const Payment = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Method>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-6 pt-5">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
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
          Payment
        </h1>
      </div>

      {/* Amount */}
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground">Amount Due</p>
        <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          €{total.toFixed(2)}
        </p>
      </div>

      {selected === "fib" ? (
        <FibPayView onBack={() => setSelected(null)} />
      ) : (
        <>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Choose payment method
          </p>
          <div className="space-y-3">
            <MethodCard
              icon={<QrCode className="h-6 w-6 text-primary" />}
              title="FIB Pay"
              desc="Scan QR code to pay instantly"
              onClick={() => setSelected("fib")}
            />
            <MethodCard
              icon={<CreditCard className="h-6 w-6 text-primary" />}
              title="Card Payment"
              desc="Pay with credit or debit card"
              onClick={() => setSelected("card")}
            />
            <MethodCard
              icon={<Banknote className="h-6 w-6 text-primary" />}
              title="Request Cash"
              desc="A waiter will come to your table"
              onClick={() => setSelected("cash")}
            />
          </div>
        </>
      )}
    </div>
  );
};

const MethodCard = ({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left ring-1 ring-border transition-all hover:ring-primary active:scale-[0.98]"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
  </button>
);

const FibPayView = ({ onBack }: { onBack: () => void }) => (
  <div className="flex flex-1 flex-col items-center">
    {/* QR Placeholder */}
    <div className="mb-6 flex h-52 w-52 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`h-8 w-8 rounded-md ${
              [0, 2, 3, 5, 6, 8].includes(i) ? "bg-foreground" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>

    <p className="mb-2 text-sm font-medium text-foreground">Scan with FIB app</p>

    <div className="mb-8 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Waiting for payment...</span>
    </div>

    <Button variant="outline" size="lg" onClick={onBack} className="w-full max-w-xs">
      Choose another method
    </Button>
  </div>
);

export default Payment;
