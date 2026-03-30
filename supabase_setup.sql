-- ============================================================
-- BUS BOOKING SYSTEM — Database Schema
-- Run this in the Supabase SQL Editor for project:
--   https://rdfdedgwhvngrdioyrjw.supabase.co
-- ============================================================

-- ── 1. USERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT,
    email         TEXT UNIQUE NOT NULL,
    phone         TEXT,
    age           TEXT,
    gender        TEXT,
    role          TEXT DEFAULT 'user',
    password      TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ADMINS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT,
    email         TEXT UNIQUE NOT NULL,
    phone         TEXT,
    password      TEXT,
    role          TEXT DEFAULT 'admin',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. DRIVERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drivers (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT,
    email         TEXT UNIQUE NOT NULL,
    phone         TEXT,
    license_no    TEXT,
    bus_number    TEXT,
    status        TEXT DEFAULT 'Active',
    role          TEXT DEFAULT 'driver',
    password      TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. SEATS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seats (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bus_number    TEXT NOT NULL,
    journey_date  TEXT NOT NULL,
    seat_number   TEXT NOT NULL,
    status        TEXT DEFAULT 'Booked',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bus_number, journey_date, seat_number)  -- prevents double-booking
);

-- ── 5. TICKETS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id         TEXT UNIQUE NOT NULL,
    booked_by_email   TEXT,
    booked_by_phone   TEXT,
    total_fare        NUMERIC DEFAULT 0,
    journey_date      TEXT,
    status            TEXT DEFAULT 'Confirmed',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. PASSENGERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.passengers (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id        TEXT REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
    name             TEXT,
    age              TEXT,
    gender           TEXT,
    seat_number      TEXT,
    pickup_location  TEXT,
    drop_location    TEXT,
    bus_number       TEXT,
    journey_date     TEXT,
    status           TEXT DEFAULT 'Booked',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_email   ON public.tickets(booked_by_email);
CREATE INDEX IF NOT EXISTS idx_tickets_phone   ON public.tickets(booked_by_phone);
CREATE INDEX IF NOT EXISTS idx_passengers_tid  ON public.passengers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_seats_bus_date  ON public.seats(bus_number, journey_date);
CREATE INDEX IF NOT EXISTS idx_users_email     ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_admins_email    ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_drivers_email   ON public.drivers(email);

-- ── 8. ROW LEVEL SECURITY (RLS) ──────────────────────────────
-- Enable RLS on all tables
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats       ENABLE ROW LEVEL SECURITY;

-- Allow ALL operations via publishable (anon) key for simplicity
CREATE POLICY "Allow all users"       ON public.users       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admins"      ON public.admins      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all drivers"     ON public.drivers     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tickets"     ON public.tickets     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all passengers"  ON public.passengers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all seats"       ON public.seats       FOR ALL USING (true) WITH CHECK (true);

-- ── 9. SEED DATA: Default Admin & Driver ─────────────────────
INSERT INTO public.admins (name, email, phone, password, role)
VALUES ('Super Admin', 'admin@busapp.com', '9999999999', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.drivers (name, email, phone, license_no, bus_number, status, role, password)
VALUES ('Ravi Kumar', 'driver@busapp.com', '8888888888', 'DL-1234567', 'TS09AB1001', 'Active', 'driver', 'driver123')
ON CONFLICT (email) DO NOTHING;
