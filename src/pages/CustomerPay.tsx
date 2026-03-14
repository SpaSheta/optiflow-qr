import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CustomerPay = () => {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <h1 className="text-xl font-semibold text-foreground">Pay Now</h1>
      <p className="text-sm text-muted-foreground">Coming soon</p>
      <Button variant="outline" onClick={() => navigate(`/r/${slug}/t/${token}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bill
      </Button>
    </div>
  );
};

export default CustomerPay;
