import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Phone, Eye, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SignupRequest {
  id: string;
  restaurant_name: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string | null;
  num_tables: number | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  restaurant_id: string | null;
  user_id: string | null;
  created_at: string;
}

const STATUS_TABS = ["all", "pending", "reviewing", "approved", "rejected"] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending</Badge>;
    case "reviewing":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Reviewing</Badge>;
    case "approved":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-50 text-red-400 border-red-200">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const SuperAdminRequests = () => {
  const { user } = useRestaurant();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<SignupRequest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("signup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRequests(data as SignupRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("new-signups")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signup_requests" }, (payload) => {
        const r = payload.new as SignupRequest;
        setRequests((prev) => [r, ...prev]);
        toast("🔔 New signup request!", {
          description: `${r.restaurant_name} — ${r.city || "Unknown city"}`,
          action: {
            label: "View",
            onClick: () => { setSelected(r); setSheetOpen(true); },
          },
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "signup_requests" }, (payload) => {
        setRequests((prev) => prev.map((r) => (r.id === payload.new.id ? (payload.new as SignupRequest) : r)));
        if (selected?.id === payload.new.id) setSelected(payload.new as SignupRequest);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase
      .from("signup_requests")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id, ...extra })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const saveNotes = async () => {
    if (!selected) return;
    await supabase.from("signup_requests").update({ admin_notes: adminNotes }).eq("id", selected.id);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const slug = selected.restaurant_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data, error } = await supabase.functions.invoke("create-restaurant", {
        body: {
          restaurant_name: selected.restaurant_name,
          slug: slug + "-" + Date.now().toString(36),
          contact_name: selected.contact_name,
          contact_phone: selected.phone,
          contact_email: selected.email,
          address: selected.city || "",
          currency: "IQD",
          tax_rate: 0,
          plan: "starter",
          notes: selected.message || "",
          tables: selected.num_tables
            ? Array.from({ length: selected.num_tables }, (_, i) => ({
                table_number: String(i + 1),
                label: `Table ${i + 1}`,
                capacity: 4,
              }))
            : [],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await updateStatus(selected.id, "approved", {
        restaurant_id: data.restaurant.id,
        user_id: data.owner_user_id,
      });

      toast.success(`Account created! Password setup email sent to ${selected.email}`);
      setApproveOpen(false);
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    await updateStatus(selected.id, "rejected", { admin_notes: rejectReason || selected.admin_notes });
    toast.success("Request rejected.");
    setRejectOpen(false);
    setSheetOpen(false);
    setActionLoading(false);
  };

  const handleMarkReviewing = async (req: SignupRequest) => {
    await updateStatus(req.id, "reviewing");
    toast.success("Marked as reviewing.");
  };

  const openDetail = (req: SignupRequest) => {
    setSelected(req);
    setAdminNotes(req.admin_notes || "");
    setSheetOpen(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-foreground">Signup Requests</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} pending · {requests.length} total
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = tab === "all" ? requests.length : requests.filter((r) => r.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count > 0 && <span className="ml-1.5 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No requests found.</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Restaurant</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Tables</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{req.restaurant_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{req.contact_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <a href={`tel:${req.phone}`} className="text-primary hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {req.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{req.city || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{req.num_tables || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">{statusBadge(req.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(req)} className="gap-1">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {req.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkReviewing(req)} className="text-blue-600 gap-1">
                            <Clock className="h-3.5 w-3.5" /> Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-extrabold">{selected.restaurant_name}</SheetTitle>
                <div className="mt-1">{statusBadge(selected.status)}</div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Contact Name" value={selected.contact_name} />
                  <InfoField label="Email" value={selected.email} />
                  <InfoField label="Phone" value={<a href={`tel:${selected.phone}`} className="text-primary hover:underline">{selected.phone}</a>} />
                  <InfoField label="City" value={selected.city || "—"} />
                  <InfoField label="Tables" value={selected.num_tables?.toString() || "—"} />
                  <InfoField label="Submitted" value={new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                </div>

                {selected.message && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                    <p className="text-sm text-foreground bg-muted/30 rounded-xl p-3">{selected.message}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Internal Notes</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Internal notes (only you can see this)"
                    rows={3}
                  />
                </div>

                {(selected.status === "pending" || selected.status === "reviewing") && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    {selected.status === "pending" && (
                      <Button variant="outline" className="w-full text-blue-600 border-blue-200" onClick={() => handleMarkReviewing(selected)}>
                        <Clock className="h-4 w-4 mr-2" /> Mark as Reviewing
                      </Button>
                    )}
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setApproveOpen(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve & Create Account
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => { setRejectReason(""); setRejectOpen(true); }}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject Request
                    </Button>
                  </div>
                )}

                {selected.status === "approved" && selected.restaurant_id && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                    ✓ Account created. Restaurant ID: <span className="font-mono text-xs">{selected.restaurant_id}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account for {selected?.restaurant_name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground py-2">
            <p>This will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create an auth account for <strong className="text-foreground">{selected?.email}</strong></li>
              <li>Create their restaurant profile</li>
              <li>Send them a password setup email</li>
              {selected?.num_tables && <li>Create {selected.num_tables} tables automatically</li>}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? "Creating…" : "Create Account →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selected?.restaurant_name}?</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

export default SuperAdminRequests;
