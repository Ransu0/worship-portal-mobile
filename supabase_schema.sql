-- ====================================================================
-- COG WORSHIP TEAM WEB APP - SUPABASE DATABASE SCHEMA
-- Fully compatible with Next.js & Supabase Cloud
-- ====================================================================

-- 1. Reset existing tables to avoid type/foreign-key conflicts
DROP TABLE IF EXISTS public.worship_point_logs CASCADE;
DROP TABLE IF EXISTS public.worship_schedules CASCADE;
DROP TABLE IF EXISTS public.worship_users CASCADE;

-- 2. Worship Users / Members Table
CREATE TABLE public.worship_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'cogvet',
    role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
    capabilities TEXT[] NOT NULL DEFAULT ARRAY['backup'],
    instrument TEXT DEFAULT 'Lead Vocals',
    points INTEGER NOT NULL DEFAULT 0,
    absent_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sunday Schedules Table (Stores assignments & setlist lineup as JSONB)
CREATE TABLE public.worship_schedules (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    practice_date DATE NOT NULL,
    practice_time TEXT NOT NULL DEFAULT '4:00 PM',
    worship_time TEXT NOT NULL DEFAULT '8:30 AM',
    month TEXT NOT NULL, -- 'YYYY-MM'
    title TEXT,
    songleader_id TEXT NOT NULL,
    songleader_name TEXT NOT NULL,
    assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
    lineup JSONB,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Points & Absence Logs Table
CREATE TABLE public.worship_point_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    admin_name TEXT DEFAULT 'Admin',
    type TEXT DEFAULT 'attendance', -- 'attendance' | 'deduction' | 'bonus' | 'absence'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.worship_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_point_logs ENABLE ROW LEVEL SECURITY;

-- 6. Access Policies (Allow read & write via Supabase anon key)
CREATE POLICY "Allow all access to users" ON public.worship_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to schedules" ON public.worship_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to point_logs" ON public.worship_point_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert Initial Admin Account
INSERT INTO public.worship_users (
    id,
    username,
    full_name,
    password,
    role,
    capabilities,
    instrument,
    points,
    absent_count,
    active
) VALUES (
    'u-admin',
    'admin',
    'Admin (Worship Director)',
    'cogvet',
    'admin',
    ARRAY['songleader', 'backup', 'keys', 'guitar', 'bass', 'drums', 'media', 'tambourines'],
    'Worship Director',
    0,
    0,
    true
) ON CONFLICT (username) DO NOTHING;
