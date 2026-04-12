// RouteX Real-Time Seat Booking System
// Integration example with the new database schema

class RouteXBookingSystem {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentLocks = new Set();
        this.sessionId = this.generateSessionId();
    }

    // Generate unique session ID for seat locking
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get available seats for a trip with real-time updates
    async getAvailableSeats(tripId) {
        try {
            const { data, error } = await this.supabase
                .rpc('get_available_seats', { p_trip_id: tripId });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching available seats:', error);
            throw error;
        }
    }

    // Lock seats for booking process
    async lockSeats(seatIds, userId, lockDurationMinutes = 10) {
        try {
            const { data, error } = await this.supabase
                .rpc('lock_seats_for_booking', {
                    p_seat_ids: seatIds,
                    p_user_id: userId,
                    p_session_id: this.sessionId,
                    p_lock_duration_minutes: lockDurationMinutes
                });

            if (error) throw error;

            // Track successfully locked seats
            data.forEach(result => {
                if (result.success) {
                    this.currentLocks.add(result.seat_id);
                }
            });

            return data;
        } catch (error) {
            console.error('Error locking seats:', error);
            throw error;
        }
    }

    // Create booking with locked seats
    async createBooking(bookingData, passengerData) {
        const { userId, tripId, totalPassengers, paymentMethod } = bookingData;

        try {
            // Start transaction
            const { data: booking, error: bookingError } = await this.supabase
                .from('bookings')
                .insert({
                    user_id: userId,
                    trip_id: tripId,
                    total_passengers: totalPassengers,
                    total_fare: 0, // Will be calculated by trigger
                    payment_status: 'pending',
                    booking_status: 'pending'
                })
                .select()
                .single();

            if (bookingError) throw bookingError;

            // Add passengers
            const passengersToInsert = passengerData.map(passenger => ({
                booking_id: booking.id,
                seat_id: passenger.seatId,
                name: passenger.name,
                age: passenger.age,
                gender: passenger.gender,
                phone: passenger.phone,
                pickup_location: passenger.pickupLocation,
                drop_location: passenger.dropLocation,
                id_proof_type: passenger.idProofType,
                id_proof_number: passenger.idProofNumber
            }));

            const { error: passengerError } = await this.supabase
                .from('passengers')
                .insert(passengersToInsert);

            if (passengerError) throw passengerError;

            // Calculate total fare
            const { data: fareData, error: fareError } = await this.supabase
                .rpc('calculate_booking_fare', { p_booking_id: booking.id });

            if (fareError) throw fareError;

            // Update booking with calculated fare
            await this.supabase
                .from('bookings')
                .update({ total_fare: fareData })
                .eq('id', booking.id);

            // Confirm the booking (convert locks to bookings)
            const { data: confirmed, error: confirmError } = await this.supabase
                .rpc('confirm_seat_booking', {
                    p_booking_id: booking.id,
                    p_session_id: this.sessionId
                });

            if (confirmError || !confirmed) {
                throw new Error('Failed to confirm booking');
            }

            // Clear locks tracking
            this.currentLocks.clear();

            return booking;
        } catch (error) {
            console.error('Error creating booking:', error);
            // Release any remaining locks on error
            await this.releaseLocks();
            throw error;
        }
    }

    // Release all current locks
    async releaseLocks() {
        if (this.currentLocks.size === 0) return;

        try {
            const { error } = await this.supabase
                .rpc('release_seat_locks', {
                    p_session_id: this.sessionId
                });

            if (error) {
                console.error('Error releasing locks:', error);
            } else {
                this.currentLocks.clear();
            }
        } catch (error) {
            console.error('Error releasing locks:', error);
        }
    }

    // Subscribe to real-time seat updates
    subscribeToSeatUpdates(tripId, callback) {
        const channel = this.supabase
            .channel(`seats_${tripId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'seats',
                filter: `trip_id=eq.${tripId}`
            }, callback)
            .subscribe();

        return channel;
    }

    // Subscribe to booking updates
    subscribeToBookingUpdates(userId, callback) {
        const channel = this.supabase
            .channel(`bookings_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe();

        return channel;
    }

    // Get user's bookings
    async getUserBookings(userId, status = null) {
        try {
            let query = this.supabase
                .from('bookings')
                .select(`
                    *,
                    trip:trips(
                        *,
                        route:routes(*),
                        bus:buses(*)
                    ),
                    passengers(*)
                `)
                .eq('user_id', userId)
                .order('booked_at', { ascending: false });

            if (status) {
                query = query.eq('booking_status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            throw error;
        }
    }

    // Cancel booking
    async cancelBooking(bookingId, reason = 'User cancelled') {
        try {
            const { error } = await this.supabase
                .from('bookings')
                .update({
                    booking_status: 'cancelled',
                    cancellation_reason: reason
                })
                .eq('id', bookingId);

            if (error) throw error;

            // Seats will be automatically released by triggers
            return true;
        } catch (error) {
            console.error('Error cancelling booking:', error);
            throw error;
        }
    }

    // Process payment
    async processPayment(bookingId, paymentData) {
        try {
            // Create payment record
            const { data: payment, error: paymentError } = await this.supabase
                .from('payments')
                .insert({
                    booking_id: bookingId,
                    amount: paymentData.amount,
                    payment_method: paymentData.method,
                    transaction_id: paymentData.transactionId,
                    status: 'completed'
                })
                .select()
                .single();

            if (paymentError) throw paymentError;

            // Update booking payment status
            const { error: bookingError } = await this.supabase
                .from('bookings')
                .update({
                    payment_status: 'completed',
                    booking_status: 'confirmed',
                    confirmed_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (bookingError) throw bookingError;

            return payment;
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    // Cleanup on page unload
    cleanup() {
        this.releaseLocks();
    }
}

// Usage Example:
/*
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const bookingSystem = new RouteXBookingSystem(supabase);

// Get available seats
const seats = await bookingSystem.getAvailableSeats(tripId);

// Lock seats for 10 minutes
const lockResult = await bookingSystem.lockSeats([seatId1, seatId2], userId);

// Create booking
const booking = await bookingSystem.createBooking({
    userId,
    tripId,
    totalPassengers: 2,
    paymentMethod: 'card'
}, passengerData);

// Subscribe to real-time updates
const seatSubscription = bookingSystem.subscribeToSeatUpdates(tripId, (payload) => {
    console.log('Seat updated:', payload);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    bookingSystem.cleanup();
});
*/

export default RouteXBookingSystem;