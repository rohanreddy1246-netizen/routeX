# RouteX Enhanced Database Schema

## 🚀 Overview

This enhanced database schema provides enterprise-grade features for the RouteX bus booking system, including proper relationships, Row Level Security (RLS), real-time seat booking, and comprehensive data validation.

## ✨ Key Features

### 1. ✅ Proper Database Relationships & Constraints
- **Foreign Keys**: All tables properly linked with referential integrity
- **Check Constraints**: Data validation at database level
- **Unique Constraints**: Prevent duplicate data
- **Not Null Constraints**: Ensure data completeness

### 2. ✅ Comprehensive Indexing
- **Performance Optimized**: Strategic indexes for fast queries
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Efficient filtering for specific conditions

### 3. ✅ Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Admin Access**: Administrators can manage all data
- **Public Access**: Controlled access to public information (routes, buses)
- **Secure Policies**: Granular permissions for each operation

### 4. ✅ Real-Time Seat Booking System
- **Seat Locking**: Prevent double booking with temporary locks
- **Automatic Cleanup**: Expired locks automatically released
- **Race Condition Prevention**: Database-level concurrency control
- **Real-Time Updates**: Live seat availability via Supabase Realtime

### 5. ✅ Audit Logging
- **Complete Trail**: All data changes logged
- **Compliance Ready**: GDPR and audit requirements
- **User Tracking**: Who made what changes when

### 6. ✅ Advanced Features
- **Automatic Calculations**: Fare calculation, seat counting
- **Data Validation**: Email, phone, date validations
- **Status Management**: Booking and payment status tracking
- **Scheduled Maintenance**: Automatic cleanup functions

## 📁 File Structure

```
routeX-main/
├── supabase_setup.sql          # Complete database schema
├── realtime-booking.js         # JavaScript integration library
├── database-test.js           # Database testing utilities
├── MIGRATION_GUIDE.md         # Migration instructions
└── README.md                  # This file
```

## 🛠 Installation

### Step 1: Database Setup
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project → **SQL Editor**
3. Copy the entire contents of `supabase_setup.sql`
4. Click **Run**

### Step 2: Enable Real-Time
1. Go to **Database** → **Replication**
2. Ensure these tables are enabled:
   - `seats`
   - `seat_locks`
   - `bookings`
   - `trips`

### Step 3: Update Application Code
```javascript
// Install the integration library
import RouteXBookingSystem from './realtime-booking.js';

// Initialize
const bookingSystem = new RouteXBookingSystem(supabase);

// Use the enhanced features
const seats = await bookingSystem.getAvailableSeats(tripId);
const lockResult = await bookingSystem.lockSeats([seatId], userId);
const booking = await bookingSystem.createBooking(bookingData, passengers);
```

## 🗄 Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | Authentication, roles, verification |
| `buses` | Bus information | Capacity, type, registration |
| `routes` | Travel routes | Distance, duration, pricing |
| `trips` | Scheduled journeys | Date, time, availability |
| `seats` | Seat inventory | Status, locking, pricing |
| `bookings` | Reservations | Multi-passenger, payment tracking |
| `passengers` | Traveler details | Personal info, seat assignment |
| `payments` | Transactions | Multiple methods, status tracking |
| `seat_locks` | Temporary locks | Prevent double booking |
| `audit_logs` | Change tracking | Compliance and debugging |

### Key Relationships

```
users (1) ──── (M) bookings (1) ──── (M) passengers
    │                       │
    │                       │
    └── (1) drivers          └── (1) payments
                                │
routes (1) ──── (M) trips (1) ──── (1) buses
                        │
                        │
                    (M) seats (M) ──── seat_locks
```

## 🔐 Security Features

### Row Level Security Policies

| Table | Public Access | User Access | Admin Access |
|-------|---------------|-------------|--------------|
| `users` | ❌ | Own profile | All users |
| `buses/routes` | ✅ Read active | ❌ | Full access |
| `trips/seats` | ✅ Read available | ❌ | Full access |
| `bookings` | ❌ | Own bookings | All bookings |
| `passengers` | ❌ | Own bookings | All passengers |
| `payments` | ❌ | Own payments | All payments |
| `audit_logs` | ❌ | ❌ | Read only |

### Data Validation

- **Email Format**: Proper email validation
- **Phone Numbers**: International format support
- **Dates**: Future date constraints
- **Amounts**: Positive value checks
- **Seat Numbers**: Format validation
- **Passwords**: Secure hashing required

## ⚡ Real-Time Features

### Seat Booking Flow
1. **Browse**: User sees available seats
2. **Lock**: Seats temporarily locked (10 min default)
3. **Book**: Booking created with locked seats
4. **Confirm**: Locks converted to confirmed booking
5. **Auto-cleanup**: Expired locks automatically released

### Real-Time Updates
```javascript
// Subscribe to seat changes
const subscription = bookingSystem.subscribeToSeatUpdates(tripId, (update) => {
    if (update.eventType === 'UPDATE') {
        // Refresh seat layout
        updateSeatUI(update.new);
    }
});

// Subscribe to booking updates
const bookingSub = bookingSystem.subscribeToBookingUpdates(userId, (update) => {
    // Update booking status
    refreshBookingStatus(update.new);
});
```

## 🧪 Testing

### Run Database Tests
```javascript
import DatabaseTester from './database-test.js';
const tester = new DatabaseTester(supabase);
const results = await tester.runAllTests();
console.log(results);
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Route and bus browsing
- [ ] Seat selection and locking
- [ ] Booking creation
- [ ] Payment processing
- [ ] Real-time seat updates
- [ ] Admin panel access
- [ ] RLS policy enforcement

## 📊 Performance Optimizations

### Indexes Created
- **Primary Keys**: All tables have efficient primary keys
- **Foreign Keys**: Automatic indexes on FK columns
- **Composite**: Multi-column indexes for complex queries
- **Partial**: Conditional indexes for filtered queries
- **Unique**: Prevent duplicate data efficiently

### Query Performance
```sql
-- Fast seat availability lookup
SELECT * FROM seats WHERE trip_id = ? AND status = 'available';

-- Fast booking lookup by user
SELECT * FROM bookings WHERE user_id = ? ORDER BY booked_at DESC;

-- Fast route search
SELECT * FROM routes WHERE origin = ? AND destination = ?;
```

## 🔄 Migration

If upgrading from the old schema, follow the [Migration Guide](MIGRATION_GUIDE.md).

## 🐛 Troubleshooting

### Common Issues

1. **RLS Blocking Queries**
   - Ensure user is authenticated
   - Check policy definitions in Supabase Dashboard

2. **Seat Locking Failures**
   - Verify `seat_locks` table exists
   - Check function permissions

3. **Real-Time Not Working**
   - Confirm tables in replication publication
   - Check WebSocket connection in browser dev tools

4. **Foreign Key Errors**
   - Ensure referenced records exist
   - Check data type compatibility

### Debug Queries
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Check active locks
SELECT * FROM seat_locks WHERE expires_at > NOW();

-- Check seat availability
SELECT trip_id, status, COUNT(*) FROM seats GROUP BY trip_id, status;

-- Check booking status
SELECT booking_status, COUNT(*) FROM bookings GROUP BY booking_status;
```

## 🚀 Advanced Features

### Custom Functions
- `lock_seats_for_booking()`: Atomic seat locking
- `confirm_seat_booking()`: Convert locks to bookings
- `calculate_booking_fare()`: Dynamic pricing
- `cleanup_expired_seat_locks()`: Maintenance

### Triggers
- **Auto-update**: `updated_at` timestamps
- **Seat counting**: Automatic availability updates
- **Audit logging**: All data changes tracked

### Scheduled Tasks
- **Lock cleanup**: Remove expired locks every 5 minutes
- **Booking expiration**: Cancel pending bookings after 30 minutes
- **Maintenance**: General system cleanup

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Booking conversion rates
- Seat lock success rates
- Average booking time
- Real-time connection health
- RLS policy violations

### Audit Reports
```sql
-- Recent bookings
SELECT COUNT(*) as bookings_today
FROM bookings
WHERE booked_at >= CURRENT_DATE;

-- Seat utilization
SELECT
    trip_id,
    COUNT(*) as total_seats,
    COUNT(*) FILTER (WHERE status = 'booked') as booked_seats
FROM seats
GROUP BY trip_id;

-- Lock performance
SELECT
    AVG(EXTRACT(EPOCH FROM (expires_at - locked_at))/60) as avg_lock_duration
FROM seat_locks
WHERE expires_at > NOW();
```

## 🤝 Contributing

1. Test all changes with the database test suite
2. Update documentation for schema changes
3. Ensure RLS policies are properly tested
4. Verify real-time functionality works
5. Update migration guide for breaking changes

## 📞 Support

- **Documentation**: Check this README and inline comments
- **Logs**: Supabase Dashboard → Logs for debugging
- **Testing**: Use the provided test scripts
- **Migration**: Follow the migration guide carefully

## 🔮 Future Enhancements

- [ ] Multi-currency support
- [ ] Dynamic pricing algorithms
- [ ] Loyalty program integration
- [ ] Mobile app API endpoints
- [ ] Advanced analytics dashboard
- [ ] Third-party integrations (payment gateways, SMS)

---

**Built with ❤️ for reliable bus booking systems**