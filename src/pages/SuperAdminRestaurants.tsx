import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

const SuperAdminRestaurants = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: restaurants = [] } = useQuery({
    queryKey: ["sa-restaurants"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.contact_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
          Restaurants
        </h1>
        <Button onClick={() => navigate("/super-admin/restaurants/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Restaurant
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurants..."
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.slug}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.plan ?? "starter"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "active" || !r.status ? "default" : "destructive"}>
                    {r.status ?? "active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.contact_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/super-admin/restaurants/${r.id}`)}>
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No restaurants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SuperAdminRestaurants;
