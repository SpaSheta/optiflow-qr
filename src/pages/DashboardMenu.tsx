import { useRestaurant } from "@/contexts/RestaurantContext";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DashboardMenu = () => {
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-5 pb-10 pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Menu</h1>
        </div>
        <p className="text-muted-foreground">Menu editor for {restaurant?.name}. Coming soon.</p>
      </div>
    </div>
  );
};

export default DashboardMenu;
