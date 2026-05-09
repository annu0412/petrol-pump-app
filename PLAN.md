#issues to fix

1. ~~in master table when we fill form the opening reading of all machine should come from closing reading of last day.~~ ✅
2. ~~when i select date in master it should load whatever saved in DB~~ ✅

---

# Rupali HP Sales — Project Plan

## TODO

### Supabase Setup (run in SQL Editor)
- [ ] Run Section 1: Schema (001_schema.sql)
- [ ] Run Section 2: RLS Policies (002_rls.sql)
- [ ] Run Section 3: Registration RLS (003)
- [ ] Run Section 4: register_org RPC function (004)
- [ ] Run Section 5: Tighten INSERT policies (005)
- [ ] Run Section 6: Extra policy — "users can read own membership"
- [ ] Turn OFF "Confirm email" in Auth > Providers > Email
- [ ] Delete test users / orphan rows from failed attempts

### Test Registration Flow
- [ ] /register — Step 1: Create account (email + password)
- [ ] /register — Step 2: Pump details (calls register_org RPC)
- [ ] /register — Step 3: Add machines
- [ ] /register — Step 4: Add employees
- [ ] /register — Step 5: Add customers
- [ ] /register — Step 6: Done → redirects to dashboard

### Test Auth Flow
- [ ] Dashboard loads at / with org name in header
- [ ] Logout → redirected to /login
- [ ] Login → redirected to /
- [ ] Unauthenticated user visiting / → redirected to /login

### App Pages to Verify
- [ ] /master — Daily meter entry form loads, saves correctly
- [ ] /expense — Add/delete expenses works
- [ ] /credit — Credit sale + payment entry works
- [ ] /history — 60-day summary table loads
- [ ] /settings/org — Edit org details saves
- [ ] /settings/machines — CRUD machines
- [ ] /settings/employees — CRUD employees
- [ ] /settings/customers — CRUD customers

---

## DONE
- [x] Move .env.local to project root
- [x] Fix Tailwind v4 syntax (@import "tailwindcss")
- [x] Fix @apply of custom classes (inline btn/badge/card styles)
- [x] Split supabase.ts into browser + server clients
- [x] Update server imports to supabase-server.ts (3 files)
- [x] Delete default Next.js boilerplate page.tsx
- [x] Create SVG PWA icon + update manifest.json
- [x] Fix middleware redirect loop (allow /register for auth users)
- [x] Create register_org RPC migration (004)
- [x] Create tightened RLS migration (005)
- [x] Add error handling to getUserContext()
- [x] Delete duplicate supabase/migrations/.env.local
- [x] Create SUPABASE_SQL_README.md with all SQL
- [x] Fix hydration bug — createClient() called at module level, broke all event handlers (10 files)
- [x] Master entry: auto-fill opening reading from previous day's closing reading
- [x] Master entry: load saved DB data when date is changed

---

## Notes
- Migrations don't auto-apply — must run manually in Supabase SQL Editor
- All SQL is consolidated in `supabase/SUPABASE_SQL_README.md`
- App uses Tailwind v4 — no tailwind.config file, use @import "tailwindcss"
- Next.js 16.2.2 with App Router, route groups: (auth) and (app)
- Supabase client must be initialized with useState(() => createClient()) in all client components
