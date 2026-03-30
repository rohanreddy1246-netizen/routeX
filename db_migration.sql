-- ============================================================
-- RouteX DB Migration: Seat Locking & Performance Indexes
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. UNIQUE CONSTRAINT: Prevents simultaneous double-booking of same seat
--    PostgreSQL doesn't support IF NOT EXISTS for ADD CONSTRAINT, so we use a DO block.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'seat_bookings_unique_seat'
    ) THEN
        ALTER TABLE seat_bookings
            ADD CONSTRAINT seat_bookings_unique_seat
            UNIQUE (bus_id, trip_date, seat_number);
    END IF;
END $$;

-- 2. INDEX: Speeds up seat availability queries (bus + date lookups)
CREATE INDEX IF NOT EXISTS idx_seat_bookings_bus_date
  ON seat_bookings (bus_id, trip_date);

-- 3. INDEX: Speeds up passenger manifest queries by journey date
CREATE INDEX IF NOT EXISTS idx_passengers_journey_date
  ON passengers (journey_date);

-- 4. INDEX: Speeds up ticket lookups by email/phone for "My Bookings"
CREATE INDEX IF NOT EXISTS idx_tickets_email
  ON tickets (booked_by_email);

CREATE INDEX IF NOT EXISTS idx_tickets_phone
  ON tickets (booked_by_phone);
