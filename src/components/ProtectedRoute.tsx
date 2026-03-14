import { Navigate } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <h1 className="text-2xl font-bold text-foreground">Setup Required</h1>
        <p className="text-center text-muted-foreground">
          No restaurant found for your account. Please contact support or complete onboarding.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
