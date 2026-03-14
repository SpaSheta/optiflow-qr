import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SuperAdminRestaurants = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Suspend dialog
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string } | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { data: restaurants = [] } = useQuery({
    queryKey: ["sa-restaurants"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["sa-all-tables"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("id, restaurant_id");
      return data ?? [];
    },
  });

  const tablesPerRestaurant = new Map<string, number>();
  tables.forEach((t) => {
    if (t.restaurant_id) {
      tablesPerRestaurant.set(t.restaurant_id, (tablesPerRestaurant.get(t.restaurant_id) || 0) + 1);
    }
  });

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.contact_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (r.status ?? "active") === statusFilter;
    const matchPlan = planFilter === "all" || (r.plan ?? "starter") === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurants").update({ status: "suspended" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-restaurants"] });
      setSuspendTarget(null);
      toast.success("Restaurant suspended");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-restaurants"] });
      setDeleteTarget(null);
      setDeleteConfirmName("");
      toast.success("Restaurant deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const planBadge = (plan: string | null) => {
    const p = plan ?? "starter";
    const colors: Record<string, string> = {
      starter: "bg-muted text-muted-foreground hover:bg-muted",
      pro: "bg-blue-100 text-blue-700 hover:bg-blue-100",
      enterprise: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    };
    return <Badge className={colors[p] ?? colors.starter}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
  };

  const statusBadge = (status: string | null) => {
    const s = status ?? "active";
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      suspended: "bg-red-100 text-red-700 hover:bg-red-100",
      pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
      inactive: "bg-muted text-muted-foreground hover:bg-muted",
    };
    return <Badge className={colors[s] ?? colors.active}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Restaurants
        </h1>
        <Button onClick={() => navigate("/super-admin/restaurants/new")}>
          <Plus className="mr-2 h-4 w-4" /> Create Restaurant
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or contact..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tables</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {r.name}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.contact_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.contact_phone ?? "—"}</TableCell>
                <TableCell>{planBadge(r.plan)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-center">{tablesPerRestaurant.get(r.id) ?? 0}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at!).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}>
                      Manage
                    </Button>
                    {(r.status ?? "active") === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 hover:text-amber-700"
                        onClick={() => setSuspendTarget({ id: r.id, name: r.name })}
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: r.id, name: r.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No restaurants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Suspend Dialog */}
      <AlertDialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{suspendTarget?.name}</strong>? 
              Their dashboard will still be accessible but marked as suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => suspendTarget && suspendMutation.mutate(suspendTarget.id)}
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteConfirmName(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Type <strong>{deleteTarget?.name}</strong> to confirm deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={deleteTarget?.name}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteConfirmName !== deleteTarget?.name}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminRestaurants;
