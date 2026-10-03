# KrishiRakshak: SPEC.md
Website for early detection and management of crop diseases and pests (Smart India Hackathon 2026, SIH26131, Govt of Maharashtra). Users: Farmer, Agriculture Officer.

## 0. RULES FOR THE AI AGENT (read first)
1. Implement ONE step at a time from section 9. After each step: run the app, fix all errors, then summarize files changed. Do not start the next step until I say so.
2. Use plain JavaScript (JSX), not TypeScript. Keep code simple and readable.
3. Do not rewrite or delete working files. Make small, targeted edits.
4. Do not add libraries beyond section 2. Do not invent features not in this spec.
5. Never put API keys in frontend code. Secrets live only in Supabase edge function secrets and a .env file that is git-ignored. Provide .env.example.
6. Every external call (Gemini, weather, Supabase) must have try/catch and a friendly error message in the UI. Show loading states.
7. All UI text comes from src/i18n/{en,mr,hi}.js. No hardcoded visible strings.
8. Keep model names and URLs in env vars/constants so they are easy to change.

## 1. ARCHITECTURE
Browser (React SPA) -> Supabase (Auth, Postgres+RLS, Storage) and Supabase Edge Functions (Deno) -> Gemini API, OpenWeather API.
- Frontend never calls Gemini or OpenWeather directly.
- Edge functions: `analyze-leaf`, `weather-risk`, `assistant-chat`.
- Farmer flow: login -> pick language -> Home (weather risk, alerts, reminders) -> Scan -> Result -> Ask expert / reminder -> History.
- Officer flow: login -> Dashboard (map, charts, outbreaks, expert requests) -> reply to requests.

## 2. TECH (fixed)
Vite + React + react-router-dom, Tailwind CSS, @supabase/supabase-js, react-leaflet + leaflet, recharts, browser-image-compression. Browser APIs: geolocation, speechSynthesis, SpeechRecognition (optional).

## 3. FOLDER STRUCTURE
src/main.jsx, App.jsx (routes), supabaseClient.js
src/i18n/{en,mr,hi}.js, useT.js (hook returning t(key))
src/context/AuthContext.jsx, LangContext.jsx
src/components/ Navbar, SeverityBadge, ListenButton, ResultCard, Loader, ErrorBox
src/pages/ LanguageSelect, Login, Home, Scan, History, Crops, Roadmap, Assistant, TrapForm, OfficerDashboard
src/lib/ districts.js (3 district centers), riskRules.js
supabase/functions/analyze-leaf/index.ts, weather-risk/index.ts, assistant-chat/index.ts
supabase/migrations/001_schema.sql, 002_seed.sql

## 4. DATABASE (create in 001_schema.sql)
- profiles(id uuid pk = auth.users.id, name, role text check in ('farmer','officer'), district text, language text default 'en', lat float, lng float)
- scans(id uuid pk, user_id, image_url, crop, disease, confidence int, severity text, result_json jsonb, lat float, lng float, district text, created_at)
- expert_requests(id, scan_id, user_id, status text default 'pending' check in ('pending','confirmed','corrected'), officer_id, officer_reply text, corrected_disease text, created_at)
- pest_traps(id, user_id, pest_type, count int, village, district, image_url, created_at)
- crops(id, user_id, crop_name, sowing_date, district)
- crop_templates(id, crop_name, stage, week_start int, week_end int, tasks jsonb, diseases_to_watch jsonb)
- roadmap_tasks(id, crop_id, week int, task text, done bool default false)
- reminders(id, user_id, text, due_date, done bool default false)
- alerts(id, district, type, message, created_at)
- VIEW outbreaks: group scans by district, disease where created_at > now()-interval '7 days' having count(*) >= 5.
RLS: enable on all tables. Create SQL function is_officer() (security definer) that checks profiles.role='officer' to avoid recursive policies.
- Farmers: select/insert/update only rows where user_id = auth.uid().
- Officers: select all scans, pest_traps, expert_requests; update expert_requests.
- crop_templates and alerts: readable by all authenticated users.
Storage: bucket "scan-images" (public read for the demo; authenticated upload).
District helper: lib/districts.js has Pune, Nashik, Solapur centers; function nearestDistrict(lat,lng) is used when saving a scan, so no geocoding API is needed.

## 5. EDGE FUNCTION CONTRACTS
analyze-leaf: input {imageBase64, mimeType, language}. Calls Gemini generateContent (model from env GEMINI_MODEL, key from GEMINI_API_KEY) with the image as inline_data and generationConfig.responseMimeType "application/json". Prompt: "You are a plant pathologist assistant for Indian farmers. Return ONLY JSON with keys: is_plant_leaf (boolean), crop (string), disease_or_pest (string), confidence (0-100 integer), severity ('low'|'medium'|'high'), visible_symptoms (string array), ipm_organic_actions (string array), chemical_option_with_safe_use_note (string), prevention_tips (string array), when_to_contact_extension_officer (string). Write all text values in {language}; keep keys in English. If the image is not a plant leaf set is_plant_leaf=false and confidence=0. Do not invent a disease when unsure." Parse JSON safely (strip code fences); on any failure return {error:true}.
weather-risk: input {lat,lng}. Calls OpenWeather 5-day/3-hour forecast (env OPENWEATHER_KEY). Return per day: avg humidity, total rain, max temp, and risk via riskRules: humidity>80 or rain>2mm = HIGH fungal risk; humidity 65-80 = MEDIUM; temp>35 and humidity<40 = mite/aphid risk MEDIUM; else LOW. Include a one-line action text key.
assistant-chat: input {message, language, context:{crop,latestScan,weather}}. Gemini text call, short practical answers in the user's language, always add "confirm with an extension officer for serious cases".
If an edge function fails, the frontend shows a friendly error. For analyze-leaf specifically, show a saved SAMPLE_RESULT (tomato early blight) labelled "Demo result" so a live demo never breaks.

## 6. FEATURES
1) Auth + language: LanguageSelect is the first screen (English / मराठी / हिंदी), saved to profile/localStorage. Login: email+password plus two buttons "Demo Farmer" and "Demo Officer" that sign in with pre-seeded demo accounts (demo.farmer@krishi.test / demo.officer@krishi.test, password Demo@12345).
2) Scan: two big buttons "Take Photo" (input accept=image/* capture=environment) and "Upload from Gallery" (same input without capture). Preview, Retake, Analyze. Compress to <1MB. Get geolocation (fallback: district dropdown). Call analyze-leaf. If is_plant_leaf=false or confidence<60: show "Not sure, please retake" with photo tips. Else show ResultCard: crop, disease, confidence, SeverityBadge (green/amber/red), symptoms, organic/IPM actions first, chemical last, prevention, disclaimer "AI suggestion, not a final diagnosis. Follow the pesticide label and confirm with an extension officer." Buttons: Listen, Ask an expert (auto-created if confidence<70), Nearest extension office/lab (static contact card), Remind me to re-scan in 3 days (inserts reminder). Save scan + image to Supabase.
3) Weather risk on Home: call weather-risk, show 5-day risk cards and one action line (e.g. scan now / avoid spraying before rain). Show district outbreak alerts and due reminders.
4) Pest-trap form: pest type, count, village, optional photo. Saved to pest_traps.
5) Officer dashboard (sidebar layout): Leaflet map with circle markers colored by severity (and outbreak districts highlighted red), filters (district, crop, disease, severity); Recharts: top diseases this week, scans per day, severity pie, trap counts; Outbreaks list from view; Expert requests table: image, AI result, location, buttons Confirm / Correct (choose disease) + reply text (any language). Counter "AI confirmed correct: X of Y reviewed". Farmers see the officer reply under that scan in History.
6) Crop roadmap: farmer picks crop and sowing date; load crop_templates and create roadmap_tasks by week; timeline with checkboxes and "diseases to watch" per stage. No live AI generation.
7) Assistant: chat page; sends context (crop, latest scan, weather); voice input if SpeechRecognition exists.
8) Listen: ListenButton uses speechSynthesis with lang en-IN/hi-IN/mr-IN; if no matching voice is found, hide the button.

## 7. DESIGN
Green earthy theme (primary #2E7D32, background #F6FBF4, accent #F9A825, danger #C62828). Large buttons (min height 48px), big icons, high contrast, responsive (works on phones and laptops). Top navbar collapses to a menu on small screens. Friendly error and empty states.

## 8. DEMO SEED (002_seed.sql + seed script)
Create demo farmer and officer users via a one-time Node script using the Supabase service role key (never in frontend). Insert ~40 scans over the last 7 days across Pune, Nashik, Solapur, including 6+ tomato early blight scans in Nashik so an outbreak shows. Add 4 pending expert requests, 6 trap entries, 10 crop templates (wheat, rice, tomato, cotton, soybean, sugarcane, onion, potato, maize, grapes), 1 sample roadmap. Use placeholder image URLs.

## 9. BUILD STEPS (do one at a time; each has an acceptance test)
Step 1: Project setup, env, Supabase client, schema + RLS, i18n, language screen, auth, demo logins, navbar. TEST: both demo logins work and language changes all text.
Step 2: Scan page + analyze-leaf + ResultCard + save to DB + fallback. TEST: upload a leaf photo and a non-leaf photo; both behave correctly; scan appears in History.
Step 3: weather-risk + Home screen alerts/reminders. TEST: risk cards render; errors handled.
Step 4: Officer dashboard (map, charts, outbreaks, expert requests + replies). TEST: seeded outbreak appears; reply shows on the farmer's History.
Step 5: Pest-trap form, crop roadmap, reminders. TEST: roadmap created from template; tasks tick.
Step 6: Assistant chat. TEST: question in Marathi gets a Marathi answer.
Step 7: Polish, empty/error states, final seed, README with run instructions.