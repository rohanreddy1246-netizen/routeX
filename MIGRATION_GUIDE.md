# RouteX Database Migration Guide

## Overview
This guide helps you migrate from the basic database schema to the enhanced schema with proper relationships, RLS, and real-time seat booking.

## 🚨 Important Notes
- **Backup your data first!** This migration will restructure your database.
- Test on a development environment before production deployment.
- The migration is designed to be non-destructive where possible.

## Step 1: Database Backup
```sql
-- Create backup of existing data (run in Supabase SQL Editor)
CREATE TABLE backup_users AS SELECT * FROM users;
CREATE TABLE backup_bookings AS SELECT * FROM bookings;
CREATE TABLE backup_tickets AS SELECT * FROM tickets;
CREATE TABLE backup_passengers AS SELECT * FROM passengers;
CREATE TABLE backup_seats AS SELECT * FROM seats;
```

## Step 2: Run the New Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `supabase_setup.sql`
3. Click **Run**

This will create all new tables, functions, and policies.

## Step 3: Data Migration Scripts

### Migrate Users
```sql
-- Migrate existing users to new schema
INSERT INTO public.users (
    email, phone, password_hash, name, age, gender, role, is_active,
    email_verified, phone_verified, created_at, updated_at
)
SELECT
    email,
    phone,
    CASE WHEN password LIKE '$2b$%' THEN password ELSE '$2b$10$default.hash.needs.update' END,
    name,
    CASE WHEN age ~ '^[0-9]+$' THEN age::INTEGER ELSE NULL END,
    gender,
    CASE WHEN role IN ('user', 'admin', 'driver') THEN role::user_role ELSE 'user' END,
    true,
    false,
    false,
    created_at,
    created_at
FROM backup_users
ON CONFLICT (email) DO NOTHING;
```

### Migrate Routes (Create Sample Routes)
```sql
-- Insert sample routes (customize as needed)
INSERT INTO public.routes (route_code, origin, destination, distance_km, duration_hours, base_fare)
VALUES
    ('DEL-MUM', 'Delhi', 'Mumbai', 1425, 24.5, 1200.00),
    ('DEL-BLR', 'Delhi', 'Bangalore', 2150, 36.0, 1800.00),
    ('MUM-CHE', 'Mumbai', 'Chennai', 1340, 23.0, 1400.00);
```

### Migrate Buses (Create Sample Buses)
```sql
-- Insert sample buses (customize as needed)
INSERT INTO public.buses (bus_number, bus_type, operator_name, total_seats, registration_no, insurance_valid, permit_valid)
SELECT DISTINCT
    bus_number,
    COALESCE(bus_type, 'AC Seater'),
    'RouteX Travels',
    40,
    bus_number,
    '2025-12-31'::DATE,
    '2025-12-31'::DATE
FROM backup_bookings
WHERE bus_number IS NOT NULL;
```

### Migrate Trips (Create from existing bookings)
```sql
-- Create trips from existing booking data
INSERT INTO public.trips (bus_id, route_id, trip_date, departure_time, arrival_time, available_seats, status)
SELECT
    b.id,
    r.id,
    bb.journey_date::DATE,
    '22:00:00'::TIME,
    '22:00:00'::TIME + INTERVAL '24 hours',
    40, -- Default seats
    'completed'
FROM backup_bookings bb
CROSS JOIN public.buses b
CROSS JOIN public.routes r
WHERE b.bus_number = bb.bus_number
AND r.origin = bb.pickup
AND r.destination = bb.drop_location
ON CONFLICT (bus_id, trip_date, departure_time) DO NOTHING;
```

### Migrate Bookings
```sql
-- Migrate existing bookings
INSERT INTO public.bookings (
    booking_ref, user_id, trip_id, total_passengers, total_fare,
    booking_status, payment_status, booked_at
)
SELECT
    bb.ticket_id,
    u.id,
    t.id,
    1, -- Assume 1 passenger per booking
    bb.fare::DECIMAL,
    'confirmed'::booking_status,
    'completed'::payment_status,
    bb.created_at
FROM backup_bookings bb
JOIN public.users u ON u.email = bb.email
LEFT JOIN public.trips t ON t.trip_date = bb.journey_date::DATE
WHERE bb.ticket_id IS NOT NULL;
```

### Migrate Passengers
```sql
-- Migrate passenger data
INSERT INTO public.passengers (
    booking_id, seat_id, name, age, gender, phone,
    pickup_location, drop_location
)
SELECT
    b.id,
    s.id,
    bb.name,
    bb.age::INTEGER,
    bb.gender,
    bb.phone,
    bb.pickup,
    bb.drop_location
FROM backup_bookings bb
JOIN public.bookings b ON b.booking_ref = bb.ticket_id
LEFT JOIN public.seats s ON s.trip_id = b.trip_id AND s.seat_number = '1' -- Default seat
WHERE bb.name IS NOT NULL;
```

## Step 4: Update Application Code

### Update your JavaScript files to use the new schema:

1. **Replace old table names:**
   - `users` → `users` (same)
   - `bookings` → `bookings` (same)
   - `tickets` → `bookings` (merged)
   - `passengers` → `passengers` (same)
   - `seats` → `seats` (enhanced)

2. **Update column names:**
   - `ticket_id` → `booking_ref`
   - `journey_date` → `trip_date` (via trip relationship)
   - `total_fare` → `total_fare` (same)

3. **Add real-time functionality:**
   ```javascript
   // Add to your main app file
   import RouteXBookingSystem from './realtime-booking.js';
   const bookingSystem = new RouteXBookingSystem(supabase);

   // Subscribe to seat updates
   bookingSystem.subscribeToSeatUpdates(tripId, (update) => {
       // Update UI with real-time seat changes
       refreshSeatLayout();
   });
   ```

## Step 5: Test the Migration

### Test Basic Functionality
```javascript
// Test user authentication
const { data: user } = await supabase.auth.getUser();

// Test booking retrieval
const bookings = await bookingSystem.getUserBookings(user.id);

// Test seat availability
const seats = await bookingSystem.getAvailableSeats(tripId);
```

### Test Real-Time Features
```javascript
// Test seat locking
const lockResult = await bookingSystem.lockSeats([seatId], userId);
console.log('Lock result:', lockResult);

// Test booking creation
const booking = await bookingSystem.createBooking(bookingData, passengerData);
console.log('Created booking:', booking);
```

## Step 6: Enable Real-Time in Supabase

1. Go to Supabase Dashboard → Database → Replication
2. Ensure these tables are enabled for real-time:
   - `seats`
   - `seat_locks`
   - `bookings`
   - `trips`

## Step 7: Performance Optimization

### Add Additional Indexes (if needed)
```sql
-- Performance indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_date
ON public.bookings(user_id, booked_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_route_date
ON public.trips(route_id, trip_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seats_trip_status_locked
ON public.seats(trip_id, status, locked_until)
WHERE locked_until IS NOT NULL;
```

## Step 8: Cleanup

### Remove Old Tables (after verification)
```sql
-- Only run after confirming migration success
DROP TABLE IF EXISTS backup_users;
DROP TABLE IF EXISTS backup_bookings;
DROP TABLE IF EXISTS backup_tickets;
DROP TABLE IF EXISTS backup_passengers;
DROP TABLE IF EXISTS backup_seats;

-- Drop old tables if no longer needed
DROP TABLE IF EXISTS users; -- Old users table
DROP TABLE IF EXISTS bookings; -- Old bookings table
DROP TABLE IF EXISTS tickets; -- Old tickets table
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure user is authenticated before operations
   - Check RLS policies in Supabase Dashboard

2. **Seat Locking Failures**
   - Check that `seat_locks` table exists
   - Verify function permissions

3. **Real-time Not Working**
   - Confirm tables are in replication publication
   - Check browser network tab for WebSocket connections

4. **Foreign Key Constraint Errors**
   - Ensure referenced records exist before inserting
   - Check data types match between tables

### Rollback Plan
If migration fails, you can restore from backups:
```sql
-- Restore from backups
INSERT INTO users SELECT * FROM backup_users;
INSERT INTO bookings SELECT * FROM backup_bookings;
-- ... restore other tables
```

## Support
- Check Supabase logs in Dashboard → Logs
- Verify function execution in SQL Editor
- Test API calls with proper authentication

## Next Steps
1. Update your frontend code to use the new schema
2. Implement real-time seat selection UI
3. Add payment integration
4. Set up monitoring and alerts
5. Consider adding caching for performance