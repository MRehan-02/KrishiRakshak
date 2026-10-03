select (select count(*) from auth.users) as users,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.scans) as scans,
       (select count(*) from public.crop_templates) as templates;