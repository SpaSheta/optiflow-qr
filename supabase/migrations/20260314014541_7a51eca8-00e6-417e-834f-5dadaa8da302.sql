
-- Restaurants
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id),
  phone text,
  email text,
  address text,
  instagram text,
  facebook text,
  website text,
  currency text DEFAULT 'IQD',
  tax_rate numeric(5,4) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Themes
CREATE TABLE public.restaurant_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#F5A623',
  secondary_color text DEFAULT '#1E3A5F',
  background_color text DEFAULT '#F5F5F0',
  font_family text DEFAULT 'Inter',
  intro_video_url text,
  menu_layout text DEFAULT 'grid',
  UNIQUE(restaurant_id)
);

-- Tables
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  label text,
  capacity int DEFAULT 4,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- Menu categories
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int DEFAULT 0
);

-- Menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES menu_categories(id),
  name text NOT NULL,
  description text,
  price bigint NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Bills
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id),
  table_id uuid REFERENCES tables(id),
  status text DEFAULT 'open',
  subtotal bigint DEFAULT 0,
  tax_amount bigint DEFAULT 0,
  total bigint DEFAULT 0,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Bill items
CREATE TABLE public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id),
  menu_item_id uuid REFERENCES menu_items(id),
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price bigint NOT NULL,
  total_price bigint NOT NULL,
  notes text,
  voided boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Waiter requests
CREATE TABLE public.waiter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id),
  table_id uuid REFERENCES tables(id),
  bill_id uuid REFERENCES bills(id),
  type text NOT NULL,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_requests ENABLE ROW LEVEL SECURITY;

-- Owner access policies (using security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_restaurant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.restaurants WHERE owner_user_id = _user_id;
$$;

CREATE POLICY "owner_all" ON public.restaurants
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "owner_all" ON public.restaurant_themes
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

CREATE POLICY "owner_all" ON public.tables
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

CREATE POLICY "owner_all" ON public.menu_categories
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

CREATE POLICY "owner_all" ON public.menu_items
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

CREATE POLICY "owner_all" ON public.bills
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

CREATE POLICY "owner_all" ON public.bill_items
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

-- Public read policies for customer QR pages
CREATE POLICY "public_read" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.restaurant_themes FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.tables FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.bills FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.bill_items FOR SELECT USING (true);

-- Public insert for waiter requests (customers can request a waiter)
CREATE POLICY "public_insert" ON public.waiter_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "owner_all" ON public.waiter_requests
  FOR ALL USING (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT public.get_user_restaurant_ids(auth.uid())));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_requests;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
