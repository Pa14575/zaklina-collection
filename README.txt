ZAKLINA COLLECTION - DATABASE + ADMIN VERSION

1. Create a Supabase project.
2. In Supabase SQL Editor, run supabase.sql.
3. In Supabase Authentication > Users, create the owner's admin user (email + password).
4. Copy the Supabase Project URL and anon/publishable key into config.js.
5. Upload the ENTIRE project folder to Netlify, not only index.html.
6. The public shop is index.html. The visible Admin link opens admin.html, which requires the Supabase admin login.
7. Owner contact is prefilled as 0559891283. Customers can tap Call Zaklina and their phone dialer opens with this number.

IMPORTANT: Never put a Supabase service_role/secret key in this website. Use only the anon/publishable key.

Until config.js contains real Supabase values, the site uses browser local storage as a fallback. The shared public database works only after the Supabase project is connected.
