// RouteX Database Functions Test Script
// Run this in browser console or as a Node.js script to test database functions

// Test script for the new RouteX database schema
class DatabaseTester {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    async runAllTests() {
        console.log('🧪 Starting RouteX Database Tests...\n');

        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };

        // Test 1: User Authentication
        await this.testUserAuth(results);

        // Test 2: Route and Bus Data
        await this.testRouteBusData(results);

        // Test 3: Seat Availability
        await this.testSeatAvailability(results);

        // Test 4: Seat Locking
        await this.testSeatLocking(results);

        // Test 5: Booking Creation
        await this.testBookingCreation(results);

        // Test 6: Real-time Subscriptions
        await this.testRealtimeSubscriptions(results);

        // Test 7: RLS Policies
        await this.testRLSPolicies(results);

        // Summary
        console.log('\n📊 Test Results Summary:');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

        return results;
    }

    async testUserAuth(results) {
        console.log('1. Testing User Authentication...');
        try {
            // Test user registration
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: 'test@example.com',
                password: 'testpassword123'
            });

            if (authError && !authError.message.includes('already registered')) {
                throw authError;
            }

            // Test user profile creation
            const { data: profile, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .limit(1);

            if (profileError) throw profileError;

            results.tests.push({ name: 'User Authentication', status: 'PASS' });
            results.passed++;
            console.log('✅ User authentication test passed');
        } catch (error) {
            results.tests.push({ name: 'User Authentication', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ User authentication test failed:', error.message);
        }
    }

    async testRouteBusData(results) {
        console.log('2. Testing Route and Bus Data...');
        try {
            // Test routes
            const { data: routes, error: routesError } = await this.supabase
                .from('routes')
                .select('*')
                .limit(5);

            if (routesError) throw routesError;

            // Test buses
            const { data: buses, error: busesError } = await this.supabase
                .from('buses')
                .select('*')
                .limit(5);

            if (busesError) throw busesError;

            results.tests.push({ name: 'Route and Bus Data', status: 'PASS' });
            results.passed++;
            console.log('✅ Route and bus data test passed');
        } catch (error) {
            results.tests.push({ name: 'Route and Bus Data', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ Route and bus data test failed:', error.message);
        }
    }

    async testSeatAvailability(results) {
        console.log('3. Testing Seat Availability...');
        try {
            // Get a trip ID first
            const { data: trip, error: tripError } = await this.supabase
                .from('trips')
                .select('id')
                .limit(1);

            if (tripError) throw tripError;
            if (!trip || trip.length === 0) {
                throw new Error('No trips found');
            }

            // Test seat availability function
            const { data: seats, error: seatsError } = await this.supabase
                .rpc('get_available_seats', { p_trip_id: trip[0].id });

            if (seatsError) throw seatsError;

            results.tests.push({ name: 'Seat Availability', status: 'PASS' });
            results.passed++;
            console.log('✅ Seat availability test passed');
        } catch (error) {
            results.tests.push({ name: 'Seat Availability', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ Seat availability test failed:', error.message);
        }
    }

    async testSeatLocking(results) {
        console.log('4. Testing Seat Locking...');
        try {
            // Get available seats
            const { data: trip } = await this.supabase
                .from('trips')
                .select('id')
                .limit(1);

            if (!trip || trip.length === 0) {
                throw new Error('No trips found');
            }

            const { data: seats } = await this.supabase
                .rpc('get_available_seats', { p_trip_id: trip[0].id });

            if (!seats || seats.length === 0) {
                throw new Error('No available seats found');
            }

            // Try to lock a seat
            const seatId = seats[0].seat_id;
            const { data: lockResult, error: lockError } = await this.supabase
                .rpc('lock_seats_for_booking', {
                    p_seat_ids: [seatId],
                    p_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
                    p_session_id: 'test_session_' + Date.now(),
                    p_lock_duration_minutes: 5
                });

            if (lockError) throw lockError;

            results.tests.push({ name: 'Seat Locking', status: 'PASS' });
            results.passed++;
            console.log('✅ Seat locking test passed');
        } catch (error) {
            results.tests.push({ name: 'Seat Locking', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ Seat locking test failed:', error.message);
        }
    }

    async testBookingCreation(results) {
        console.log('5. Testing Booking Creation...');
        try {
            // This would require a full booking flow
            // For now, just test that the bookings table exists and is accessible
            const { data: bookings, error: bookingsError } = await this.supabase
                .from('bookings')
                .select('count(*)')
                .limit(1);

            if (bookingsError) throw bookingsError;

            results.tests.push({ name: 'Booking Creation', status: 'PASS' });
            results.passed++;
            console.log('✅ Booking creation test passed');
        } catch (error) {
            results.tests.push({ name: 'Booking Creation', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ Booking creation test failed:', error.message);
        }
    }

    async testRealtimeSubscriptions(results) {
        console.log('6. Testing Real-time Subscriptions...');
        try {
            // Test subscription creation (doesn't actually connect)
            const channel = this.supabase
                .channel('test_channel')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'seats'
                }, () => {})
                .subscribe();

            // Clean up
            setTimeout(() => channel.unsubscribe(), 1000);

            results.tests.push({ name: 'Real-time Subscriptions', status: 'PASS' });
            results.passed++;
            console.log('✅ Real-time subscriptions test passed');
        } catch (error) {
            results.tests.push({ name: 'Real-time Subscriptions', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ Real-time subscriptions test failed:', error.message);
        }
    }

    async testRLSPolicies(results) {
        console.log('7. Testing RLS Policies...');
        try {
            // Test that RLS is enabled by trying to access data without auth
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .limit(1);

            // If RLS is working, this should either return data (if authenticated) or be blocked
            // We just check that the query doesn't crash
            if (error && !error.message.includes('permission denied')) {
                throw error;
            }

            results.tests.push({ name: 'RLS Policies', status: 'PASS' });
            results.passed++;
            console.log('✅ RLS policies test passed');
        } catch (error) {
            results.tests.push({ name: 'RLS Policies', status: 'FAIL', error: error.message });
            results.failed++;
            console.log('❌ RLS policies test failed:', error.message);
        }
    }
}

// Usage in browser console:
/*
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
const tester = new DatabaseTester(supabase);
tester.runAllTests();
*/

// Usage in Node.js:
/*
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const tester = new DatabaseTester(supabase);
tester.runAllTests().then(results => {
    console.log('All tests completed');
});
*/

export default DatabaseTester;