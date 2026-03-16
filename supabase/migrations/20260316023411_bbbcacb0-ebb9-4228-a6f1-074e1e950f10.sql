ALTER TABLE public.restaurant_themes 
  ADD COLUMN IF NOT EXISTS header_bg_color text default '#1E3A5F',
  ADD COLUMN IF NOT EXISTS header_text_color text default '#FFFFFF',
  ADD COLUMN IF NOT EXISTS tab_active_color text default '#0FBCB0',
  ADD COLUMN IF NOT EXISTS card_bg_color text default '#FFFFFF',
  ADD COLUMN IF NOT EXISTS body_text_color text default '#1F2937',
  ADD COLUMN IF NOT EXISTS price_color text default '#0FBCB0';