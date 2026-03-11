import { Receipt, MapPin, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import restaurantLogo from "@/assets/restaurant-logo.png";

const RESTAURANT = {
  name: "La Maison Dorée",
  tagline: "Fine dining, redefined.",
  description:
    "Welcome to our table. Enjoy handcrafted dishes made with locally sourced ingredients, paired with an exceptional wine selection.",
  address: "42 Rue de la Cuisine, Paris",
  hours: "Mon–Sat · 12pm – 11pm",
  phone: "+33 1 23 45 67 89",
};

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 pb-10 pt-12">
      {/* Logo */}
      <div className="mb-6 h-24 w-24 overflow-hidden rounded-2xl bg-card shadow-md">
        <img
          src={restaurantLogo}
          alt={`${RESTAURANT.name} logo`}
          className="h-full w-full object-contain p-2"
        />
      </div>

      {/* Name & tagline */}
      <h1
        className="mb-1 text-center text-3xl font-bold text-foreground"
        style={{ fontFamily: "var(--restaurant-name)" }}
      >
        {RESTAURANT.name}
      </h1>
      <p className="mb-8 text-center text-sm font-medium tracking-wide text-muted-foreground">
        {RESTAURANT.tagline}
      </p>

      {/* Intro card */}
      <div className="mb-8 w-full max-w-sm rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
        <p className="text-center text-sm leading-relaxed text-secondary-foreground">
          {RESTAURANT.description}
        </p>
      </div>

      {/* CTA */}
      <Button variant="cta" size="xl" className="mb-10 w-full max-w-sm">
        <Receipt className="mr-2 h-5 w-5" />
        View My Bill
      </Button>

      {/* Info pills */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <InfoRow icon={<MapPin className="h-4 w-4 text-primary" />} text={RESTAURANT.address} />
        <InfoRow icon={<Clock className="h-4 w-4 text-primary" />} text={RESTAURANT.hours} />
        <InfoRow icon={<Phone className="h-4 w-4 text-primary" />} text={RESTAURANT.phone} />
      </div>

      {/* Footer */}
      <p className="mt-auto pt-10 text-xs text-muted-foreground">
        Powered by QR Dine
      </p>
    </div>
  );
};

const InfoRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
    {icon}
    <span className="text-sm text-secondary-foreground">{text}</span>
  </div>
);

export default Index;
