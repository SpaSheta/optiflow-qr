import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const DashboardBills = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-5 pb-10 pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard/tables")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Bills — Table {tableId}</h1>
        </div>
        <p className="text-muted-foreground">Bill management coming soon.</p>
      </div>
    </div>
  );
};

export default DashboardBills;
