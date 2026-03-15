
-- Add paid_amount column to bills
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_amount bigint DEFAULT 0;

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  bill_split_id uuid REFERENCES public.bill_splits(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  method text NOT NULL CHECK (method IN ('fib', 'cash', 'card')),
  status text NOT NULL DEFAULT 'pending',
  fib_qr_url text,
  fib_deep_link text,
  fib_transaction_id text,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Public can insert (customers don't need auth)
CREATE POLICY "public_insert_payments" ON public.payments FOR INSERT WITH CHECK (true);
-- Public can read
CREATE POLICY "public_read_payments" ON public.payments FOR SELECT USING (true);
-- Public can update status (for polling flow)
CREATE POLICY "public_update_payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);
-- Super admins full access
CREATE POLICY "super_admin_all_payments" ON public.payments FOR ALL USING (is_super_admin());
-- Restaurant owners full access
CREATE POLICY "owner_all_payments" ON public.payments FOR ALL
  USING (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids(auth.uid())));

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle payment completion side effects
CREATE OR REPLACE FUNCTION public.handle_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update bill_split status
    IF NEW.bill_split_id IS NOT NULL THEN
      UPDATE public.bill_splits SET status = 'paid' WHERE id = NEW.bill_split_id;
    END IF;

    -- Add to bill paid_amount
    UPDATE public.bills 
    SET paid_amount = COALESCE(paid_amount, 0) + NEW.amount
    WHERE id = NEW.bill_id;

    -- Check if fully paid
    UPDATE public.bills 
    SET status = 'paid', closed_at = now()
    WHERE id = NEW.bill_id 
      AND COALESCE(paid_amount, 0) >= total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_completed
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_completed();
