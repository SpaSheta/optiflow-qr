import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().optional(),
  currency: z.string().min(1),
  tax_rate: z.coerce.number().min(0).max(1),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Minimum 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

const DashboardSettings = () => {
  const { restaurant, refetch } = useRestaurant();
  const [confirmName, setConfirmName] = useState("");

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: restaurant
      ? {
          name: restaurant.name,
          slug: restaurant.slug,
          phone: restaurant.phone ?? "",
          email: restaurant.email ?? "",
          address: restaurant.address ?? "",
          instagram: restaurant.instagram ?? "",
          facebook: restaurant.facebook ?? "",
          website: restaurant.website ?? "",
          currency: restaurant.currency,
          tax_rate: restaurant.tax_rate,
        }
      : undefined,
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const { error } = await supabase
        .from("restaurants")
        .update(values)
        .eq("id", restaurant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Restaurant updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordForm) => {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("restaurants")
        .update({ is_active: false })
        .eq("id", restaurant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Restaurant deactivated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--restaurant-name)" }}>
        Settings
      </h1>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Restaurant Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  {...profileForm.register("name")}
                  onChange={(e) => {
                    profileForm.setValue("name", e.target.value);
                    profileForm.setValue("slug", generateSlug(e.target.value));
                  }}
                />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label>Slug *</Label>
                <Input {...profileForm.register("slug")} />
                {profileForm.formState.errors.slug && (
                  <p className="mt-1 text-xs text-destructive">{profileForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input {...profileForm.register("phone")} /></div>
              <div><Label>Email</Label><Input {...profileForm.register("email")} /></div>
            </div>

            <div><Label>Address</Label><Input {...profileForm.register("address")} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Instagram</Label><Input {...profileForm.register("instagram")} /></div>
              <div><Label>Facebook</Label><Input {...profileForm.register("facebook")} /></div>
            </div>

            <div><Label>Website</Label><Input {...profileForm.register("website")} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Currency</Label><Input {...profileForm.register("currency")} /></div>
              <div>
                <Label>Tax Rate (0-1)</Label>
                <Input type="number" step="0.0001" {...profileForm.register("tax_rate")} />
              </div>
            </div>

            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? "Saving…" : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deactivate your restaurant. Type <strong>{restaurant?.name}</strong> to confirm.
          </p>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={restaurant?.name}
          />
          <Button
            variant="destructive"
            disabled={confirmName !== restaurant?.name || deactivateMutation.isPending}
            onClick={() => deactivateMutation.mutate()}
          >
            Deactivate Restaurant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSettings;
