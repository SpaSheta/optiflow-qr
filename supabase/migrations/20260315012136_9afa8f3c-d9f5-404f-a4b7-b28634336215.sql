
-- Ratings table
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_ratings" ON public.ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "super_admin_all_ratings" ON public.ratings FOR ALL USING (is_super_admin());
CREATE POLICY "owner_all_ratings" ON public.ratings FOR ALL
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- Add completed_at to payments if not present
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
