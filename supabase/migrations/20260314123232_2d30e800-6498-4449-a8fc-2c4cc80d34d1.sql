
-- Create storage buckets for menu images and restaurant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-logos', 'restaurant-logos', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to menu-images
CREATE POLICY "auth_upload_menu_images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');
CREATE POLICY "public_read_menu_images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "auth_update_menu_images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'menu-images');
CREATE POLICY "auth_delete_menu_images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'menu-images');

-- Allow authenticated users to upload to restaurant-logos
CREATE POLICY "auth_upload_restaurant_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant-logos');
CREATE POLICY "public_read_restaurant_logos" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-logos');
CREATE POLICY "auth_update_restaurant_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'restaurant-logos');
CREATE POLICY "auth_delete_restaurant_logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'restaurant-logos');
