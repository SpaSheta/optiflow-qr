
-- Super admin table
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_self" ON public.super_admins
  FOR SELECT USING (user_id = auth.uid());

-- Add columns to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS created_by_super_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Table QR tokens
CREATE TABLE public.table_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.tables(id) ON DELETE CASCADE UNIQUE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  qr_url text,
  created_at timestamptz DEFAULT now(),
  regenerated_at timestamptz
);

ALTER TABLE public.table_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_qr_tokens" ON public.table_qr_tokens
  FOR SELECT USING (true);

CREATE POLICY "owner_manage_qr_tokens" ON public.table_qr_tokens
  FOR ALL USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
  ));

-- Trigger to auto-create QR token on table insert
CREATE OR REPLACE FUNCTION public.create_table_qr_token()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.table_qr_tokens (table_id, restaurant_id, token)
  VALUES (NEW.id, NEW.restaurant_id, gen_random_uuid()::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_table_created
  AFTER INSERT ON public.tables
  FOR EACH ROW EXECUTE PROCEDURE public.create_table_qr_token();

-- is_super_admin helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Super admin policies on existing tables
CREATE POLICY "super_admin_all_restaurants" ON public.restaurants
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_tables" ON public.tables
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_qr_tokens" ON public.table_qr_tokens
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_bills" ON public.bills
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_bill_items" ON public.bill_items
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_menu_items" ON public.menu_items
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_menu_categories" ON public.menu_categories
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_themes" ON public.restaurant_themes
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_waiter_requests" ON public.waiter_requests
  FOR ALL USING (public.is_super_admin());
