-- KrishiRakshak Seed Data (SIH 2026)
-- Migration: 002_seed.sql

-- 1. SEED PROFILES (Assuming auth users exist or for local mock usage)
-- Fixed UUIDs for predictable demo accounts
-- Demo Farmer: Ramesh Patil (Pune)
insert into public.profiles (id, name, role, district, language, lat, lng)
values (
  'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001',
  'Ramesh Patil',
  'farmer',
  'Pune',
  'mr',
  18.5204,
  73.8567
) on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  district = excluded.district,
  language = excluded.language;

-- Demo Officer: Dr. Sunita Deshmukh (Nashik)
insert into public.profiles (id, name, role, district, language, lat, lng)
values (
  'e2f887b2-0e24-4f05-87d2-7cfa8e1b3002',
  'Dr. Sunita Deshmukh',
  'officer',
  'Nashik',
  'en',
  19.9975,
  73.7898
) on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  district = excluded.district,
  language = excluded.language;

-- 2. SEED CROP TEMPLATES (10 crops: wheat, rice, tomato, cotton, soybean, sugarcane, onion, potato, maize, grapes)
insert into public.crop_templates (crop_name, stage, week_start, week_end, tasks, diseases_to_watch)
values
  ('Tomato', 'Vegetative & Flowering', 1, 4, 
   '["Apply balanced NPK 19:19:19", "Inspect leaf undersides for aphid colonies", "Install yellow sticky traps"]'::jsonb,
   '["Early Blight", "Leaf Curl Virus", "Aphids"]'::jsonb),
  ('Tomato', 'Fruiting & Ripening', 5, 8,
   '["Spray copper oxychloride 0.25% if rain forecasted", "Support heavy fruiting branches", "Monitor soil moisture"]'::jsonb,
   '["Early Blight", "Late Blight", "Fruit Borer"]'::jsonb),
  ('Wheat', 'Crown Root & Tillering', 1, 4,
   '["First irrigation at CRI stage (21 days)", "Weed control with 2,4-D amine", "Inspect for yellow rust pustules"]'::jsonb,
   '["Yellow Rust", "Loose Smut", "Termites"]'::jsonb),
  ('Wheat', 'Heading & Grain Filling', 5, 8,
   '["Foliar spray of 2% urea at boot stage", "Monitor for brown rust lesions", "Protect against grain aphid"]'::jsonb,
   '["Brown Rust", "Powdery Mildew", "Aphids"]'::jsonb),
  ('Rice', 'Nursery & Tillering', 1, 4,
   '["Maintain 2-3 cm shallow water layer", "Apply zinc sulfate @ 25 kg/ha", "Check for stem borer dead hearts"]'::jsonb,
   '["Blast", "Brown Spot", "Stem Borer"]'::jsonb),
  ('Cotton', 'Square Formation & Boll Development', 1, 6,
   '["Erect pheromone traps for pink bollworm", "Maintain clean bunds to deter whiteflies", "Apply neem oil 1500ppm"]'::jsonb,
   '["Pink Bollworm", "Whitefly", "Bacterial Blight"]'::jsonb),
  ('Soybean', 'Vegetative & Pod Formation', 1, 5,
   '["Seed treatment check with Trichoderma", "Monitor for girdle beetle and spodoptera", "Spray chlorantraniliprole if needed"]'::jsonb,
   '["Rust", "Yellow Mosaic", "Spodoptera"]'::jsonb),
  ('Sugarcane', 'Formative & Grand Growth', 1, 10,
   '["Trash mulching for moisture preservation", "Interculture operation at 45 days", "Check for early shoot borer"]'::jsonb,
   '["Red Rot", "Smut", "Early Shoot Borer"]'::jsonb),
  ('Onion', 'Bulb Initiation & Development', 1, 6,
   '["Keep field weed-free during early stage", "Fungicide spray for purple blotch (Mancozeb)", "Monitor thrips population"]'::jsonb,
   '["Purple Blotch", "Thrips", "Stemphylium Blight"]'::jsonb),
  ('Potato', 'Tuber Initiation & Bulking', 1, 6,
   '["Earthing up at 30 days after planting", "Preventive spray against late blight with metalaxyl", "Inspect tuber moth damage"]'::jsonb,
   '["Late Blight", "Early Blight", "Potato Tuber Moth"]'::jsonb),
  ('Maize', 'Knee-high to Tasseling', 1, 5,
   '["Scout whorls for Fall Armyworm egg masses", "Apply bio-pesticide Beauveria bassiana", "Top dress urea @ 50 kg/ha"]'::jsonb,
   '["Fall Armyworm", "Turcicum Leaf Blight", "Downy Mildew"]'::jsonb),
  ('Grapes', 'Shoot Growth & Berry Development', 1, 8,
   '["Canopy thinning for sunlight penetration", "Preventive spray for downy mildew with Bordeaux mixture", "Inspect mealybug hotspots"]'::jsonb,
   '["Downy Mildew", "Powdery Mildew", "Mealybug"]'::jsonb)
on conflict do nothing;

-- 3. SEED ALERTS (District outbreaks and advisories)
insert into public.alerts (district, type, message, created_at)
values
  ('Nashik', 'outbreak', 'Tomato Early Blight outbreak alert in Niphad & Dindori talukas. High humidity observed.', now() - interval '2 hours'),
  ('Pune', 'weather_risk', 'Unseasonal rainfall forecast in Junnar and Khed. Spray systemic fungicide immediately.', now() - interval '6 hours'),
  ('Solapur', 'pest_risk', 'Fall Armyworm trap counts crossing ETL threshold in Barshi cluster maize fields.', now() - interval '1 day')
on conflict do nothing;

-- 4. SEED SAMPLE SCANS (Including 6+ Tomato Early Blight in Nashik to trigger the OUTBREAK VIEW)
insert into public.scans (id, user_id, image_url, crop, disease, confidence, severity, result_json, lat, lng, district, created_at)
values
  ('a1000000-0000-0000-0000-000000000001', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 92, 'high', '{"visible_symptoms":["Concentric dark rings on lower leaves","Yellow halo surrounding spots"]}'::jsonb, 19.9975, 73.7898, 'Nashik', now() - interval '1 day'),
  ('a1000000-0000-0000-0000-000000000002', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 88, 'high', '{"visible_symptoms":["Severe defoliation in lower canopy","Collar rot lesions on stems"]}'::jsonb, 19.9800, 73.8000, 'Nashik', now() - interval '2 days'),
  ('a1000000-0000-0000-0000-000000000003', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 94, 'high', '{"visible_symptoms":["Target-board pattern spots on older leaves"]}'::jsonb, 20.0100, 73.7500, 'Nashik', now() - interval '2 days'),
  ('a1000000-0000-0000-0000-000000000004', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 86, 'medium', '{"visible_symptoms":["Sparse brown spots with chlorotic edges"]}'::jsonb, 19.9500, 73.7900, 'Nashik', now() - interval '3 days'),
  ('a1000000-0000-0000-0000-000000000005', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 91, 'high', '{"visible_symptoms":["Rapid blight progression after morning dew"]}'::jsonb, 20.0200, 73.8100, 'Nashik', now() - interval '3 days'),
  ('a1000000-0000-0000-0000-000000000006', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 89, 'high', '{"visible_symptoms":["Lower leaf withering and stem lesions"]}'::jsonb, 19.9700, 73.7700, 'Nashik', now() - interval '4 days'),
  ('a1000000-0000-0000-0000-000000000007', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Tomato', 'Early Blight', 95, 'high', '{"visible_symptoms":["Severe necrosis across entire leaf blade"]}'::jsonb, 20.0050, 73.7820, 'Nashik', now() - interval '5 days'),
  -- Pune Scans
  ('a1000000-0000-0000-0000-000000000008', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop', 'Wheat', 'Yellow Rust', 90, 'medium', '{"visible_symptoms":["Yellow-orange powdery stripes parallel to leaf veins"]}'::jsonb, 18.5204, 73.8567, 'Pune', now() - interval '2 days'),
  ('a1000000-0000-0000-0000-000000000009', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop', 'Cotton', 'Whitefly Infestation', 78, 'medium', '{"visible_symptoms":["Honeydew secretion and sooty mould on upper leaves"]}'::jsonb, 18.5500, 73.8700, 'Pune', now() - interval '4 days'),
  -- Solapur Scans
  ('a1000000-0000-0000-0000-000000000010', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop', 'Maize', 'Fall Armyworm', 93, 'high', '{"visible_symptoms":["Shot-hole pattern and ragged leaves in plant whorl"]}'::jsonb, 17.6599, 75.9064, 'Solapur', now() - interval '1 day')
on conflict (id) do nothing;

-- 5. SEED EXPERT REQUESTS (4 pending expert requests)
insert into public.expert_requests (id, scan_id, user_id, status, officer_id, officer_reply, corrected_disease, created_at)
values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'pending', null, null, null, now() - interval '1 day'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'pending', null, null, null, now() - interval '2 days'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'pending', null, null, null, now() - interval '3 days'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000010', 'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'pending', null, null, null, now() - interval '4 days')
on conflict (id) do nothing;

-- 6. SEED PEST TRAPS (6 trap entries)
insert into public.pest_traps (user_id, pest_type, count, village, district, created_at)
values
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Yellow Sticky Trap (Whitefly)', 28, 'Ozar', 'Nashik', now() - interval '1 day'),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Pheromone Trap (Fall Armyworm)', 42, 'Barshi', 'Solapur', now() - interval '2 days'),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Pheromone Trap (Pink Bollworm)', 14, 'Narayangaon', 'Pune', now() - interval '3 days'),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Blue Sticky Trap (Thrips)', 65, 'Niphad', 'Nashik', now() - interval '3 days'),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Light Trap (Stem Borer)', 9, 'Shirur', 'Pune', now() - interval '4 days'),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Fruit Fly Trap (Bactrocera)', 18, 'Pandharpur', 'Solapur', now() - interval '5 days')
on conflict do nothing;

-- 7. SEED REMINDERS & SAMPLE CROP
insert into public.crops (id, user_id, crop_name, sowing_date, district)
values (
  'c1000000-0000-0000-0000-000000000001',
  'e1f887b2-0e24-4f05-87d2-7cfa8e1b3001',
  'Tomato',
  current_date - 20,
  'Pune'
) on conflict (id) do nothing;

insert into public.roadmap_tasks (crop_id, week, task, done)
values
  ('c1000000-0000-0000-0000-000000000001', 1, 'Apply balanced NPK 19:19:19 to seedlings', true),
  ('c1000000-0000-0000-0000-000000000001', 2, 'Inspect leaf undersides for aphid colonies', true),
  ('c1000000-0000-0000-0000-000000000001', 3, 'Install yellow sticky traps across rows', false),
  ('c1000000-0000-0000-0000-000000000001', 4, 'Preventive copper fungicide spray if rain is predicted', false)
on conflict do nothing;

insert into public.reminders (user_id, text, due_date, done)
values
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Inspect tomato plot for early blight symptoms', current_date + 1, false),
  ('e1f887b2-0e24-4f05-87d2-7cfa8e1b3001', 'Check yellow sticky trap count in field B', current_date + 3, false)
on conflict do nothing;
