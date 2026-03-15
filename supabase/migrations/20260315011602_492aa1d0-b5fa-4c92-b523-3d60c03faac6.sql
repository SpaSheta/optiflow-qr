
CREATE TABLE public.bill_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  split_method text NOT NULL CHECK (split_method IN ('equal', 'by_item', 'custom')),
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  item_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;

-- Public can insert (customers don't need auth)
CREATE POLICY "public_insert_splits" ON public.bill_splits FOR INSERT WITH CHECK (true);
-- Public can read
CREATE POLICY "public_read_splits" ON public.bill_splits FOR SELECT USING (true);
-- Super admins full access
CREATE POLICY "super_admin_all_splits" ON public.bill_splits FOR ALL USING (is_super_admin());
-- Restaurant owners full access
CREATE POLICY "owner_all_splits" ON public.bill_splits FOR ALL
  USING (bill_id IN (SELECT id FROM public.bills WHERE restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid()))))
  WITH CHECK (bill_id IN (SELECT id FROM public.bills WHERE restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid()))));
