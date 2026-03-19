
-- Signup requests table
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  city text DEFAULT 'Erbil',
  num_tables int,
  message text,
  status text DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  restaurant_id uuid REFERENCES public.restaurants(id),
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON public.signup_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "public_insert" ON public.signup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_own" ON public.signup_requests
  FOR SELECT USING (true);

-- Enable realtime for signup_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.signup_requests;

-- Add notification columns to super_admins
ALTER TABLE public.super_admins
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notify_on_signup boolean DEFAULT true;
