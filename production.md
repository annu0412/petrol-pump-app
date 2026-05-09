# Production Deployment Checklist

## 1. Supabase — Auth URL Configuration
Go to **Supabase Dashboard → Authentication → URL Configuration** and add your production domain to **Redirect URLs**:
```
https://yourdomain.com/**
```

## 2. Environment Variables
Set these on your server (Vercel, VPS, etc.):
```
NEXT_PUBLIC_SUPABASE_URL=https://brhenrceeoyqbeavxevz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key from .env.local>
SUPABASE_SERVICE_ROLE_KEY=<service role key — Supabase Dashboard → Settings → API → service_role>
```
⚠️ `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix — it is server-only and never sent to the browser.

## 3. Build & Start
```bash
npm run build
npm run start
```
Or deploy to Vercel — it runs build and start automatically.

## Notes
- `allowedDevOrigins` in `next.config.ts` is ignored in production builds (dev-only feature).
- `--hostname 0.0.0.0` in the dev script only affects `npm run dev`, not `npm run start`.
- The `get_my_context` Supabase RPC (migration `007`) is already in the Supabase project and works for both dev and prod — no re-run needed.
- All database migrations in `supabase/migrations/` must be applied to the Supabase project before going live. Run them once in **Supabase Dashboard → SQL Editor**.
