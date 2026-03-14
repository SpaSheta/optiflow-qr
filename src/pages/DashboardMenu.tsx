import { useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DashboardMenu = () => {
  const { restaurant } = useRestaurant();
  const rid = restaurant?.id;
  const qc = useQueryClient();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCatId, setItemCatId] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories", rid],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").eq("restaurant_id", rid!).order("sort_order");
      return data ?? [];
    },
    enabled: !!rid,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", rid, selectedCat],
    queryFn: async () => {
      let q = supabase.from("menu_items").select("*").eq("restaurant_id", rid!).order("sort_order");
      if (selectedCat) q = q.eq("category_id", selectedCat);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!rid,
  });

  const addCatMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_categories").insert({
        restaurant_id: rid!,
        name: catName,
        sort_order: categories.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-categories", rid] });
      setCatDialogOpen(false);
      setCatName("");
      toast.success("Category added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-categories", rid] });
      if (selectedCat) setSelectedCat(null);
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openItemForm = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDesc(item.description ?? "");
      setItemPrice(String(item.price));
      setItemCatId(item.category_id ?? "");
      setItemAvailable(item.is_available ?? true);
    } else {
      setEditingItem(null);
      setItemName("");
      setItemDesc("");
      setItemPrice("");
      setItemCatId(selectedCat ?? "");
      setItemAvailable(true);
    }
    setItemImageFile(null);
    setItemSheetOpen(true);
  };

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = editingItem?.image_url ?? null;
      if (itemImageFile) {
        const ext = itemImageFile.name.split(".").pop();
        const path = `${rid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("menu-images").upload(path, itemImageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("menu-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const payload = {
        restaurant_id: rid!,
        name: itemName,
        description: itemDesc || null,
        price: parseInt(itemPrice),
        category_id: itemCatId || null,
        is_available: itemAvailable,
        image_url: imageUrl,
      };
      if (editingItem) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert({ ...payload, sort_order: items.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items", rid] });
      setItemSheetOpen(false);
      toast.success(editingItem ? "Item updated" : "Item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items", rid] });
      toast.success("Item deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_available: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items", rid] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
        Menu
      </h1>

      <div className="flex gap-6">
        {/* Categories panel */}
        <div className="w-48 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Categories</span>
            <button onClick={() => setCatDialogOpen(true)} className="rounded-md p-1 text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setSelectedCat(null)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !selectedCat ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-secondary"
            )}
          >
            All Items
          </button>
          {categories.map((c) => (
            <div key={c.id} className="group flex items-center">
              <button
                onClick={() => setSelectedCat(c.id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedCat === c.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-secondary"
                )}
              >
                {c.name}
              </button>
              <button
                onClick={() => deleteCatMutation.mutate(c.id)}
                className="hidden rounded p-1 text-destructive hover:bg-destructive/10 group-hover:block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Items panel */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {selectedCat ? categories.find((c) => c.id === selectedCat)?.name : "All Items"} ({items.length})
            </span>
            <Button size="sm" onClick={() => openItemForm()}>
              <Plus className="mr-1 h-4 w-4" />Add Item
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="mb-3 h-28 w-full rounded-lg object-cover" />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.price} {restaurant?.currency}</p>
                    </div>
                    <Switch
                      checked={item.is_available ?? true}
                      onCheckedChange={(val) => toggleAvailability.mutate({ id: item.id, val })}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openItemForm(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteItemMutation.mutate(item.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {items.length === 0 && (
            <p className="mt-8 text-center text-muted-foreground">No items yet. Add one to get started.</p>
          )}
        </div>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addCatMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={addCatMutation.isPending}>Add</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? "Edit Item" : "Add Item"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveItemMutation.mutate(); }} className="mt-6 space-y-4">
            <div><Label>Name *</Label><Input value={itemName} onChange={(e) => setItemName(e.target.value)} required /></div>
            <div><Label>Description</Label><Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} /></div>
            <div><Label>Price *</Label><Input type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required /></div>
            <div>
              <Label>Category</Label>
              <Select value={itemCatId} onValueChange={setItemCatId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setItemImageFile(e.target.files?.[0] ?? null)} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={itemAvailable} onCheckedChange={setItemAvailable} />
              <Label>Available</Label>
            </div>
            <Button type="submit" className="w-full" disabled={saveItemMutation.isPending}>
              {saveItemMutation.isPending ? "Saving…" : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardMenu;
