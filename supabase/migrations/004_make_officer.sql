insert into public.profiles (id, name, role, district, language)
select id, 'Soham Kulkarni', 'officer', 'Nashik', 'en'
from auth.users
where email = 'sohamkulkarni@gmail.com'
on conflict (id) do update set role = 'officer', name = excluded.name;