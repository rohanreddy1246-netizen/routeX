/**
 * RouteX — Bus Ticketing System | Production Frontend
 */
const DEBUG_MODE = false;
const log = (...args) => DEBUG_MODE && console.log(...args);
let isSubmittingBooking = false; // Guard against double-submission

/** Safely encode user input before inserting into HTML — prevents XSS */
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
}
const PICKUP_LOCATIONS = [
    // Route 1
    'LB Nagar', 'Nalgonda', 'Miryalguda', 'Nagarjunasagar', 'Guntur', 'Vijayawada', 'Tenali', 'Chirala', 'Ongole', 'Kavali', 'Nellore', 'Gudur', 'Puttur', 'Tirupati Bus Stand',
    // Route 2
    'MGBS Hyderabad', 'Uppal', 'Ghatkesar', 'Bhongir', 'Aler', 'Jangaon', 'Station Ghanpur', 'Warangal',
    // Route 3
    'Kempegowda Bus Stand', 'Jayanagar', 'Kengeri', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Srirangapatna', 'Mysuru',
    // Route 4
    'Chennai CMBT', 'Tambaram', 'Chengalpattu', 'Mahabalipuram', 'Chinglepet', 'Tindivanam', 'Villupuram', 'Pondicherry',
    // Route 5
    'Dadar Mumbai', 'Thane', 'Bhiwandi', 'Shahapur', 'Khardi', 'Igatpuri', 'Ghoti', 'Nashik CBS',
    // Route 6 
    'Kashmere Gate Delhi', 'NH-48 Gurgaon', 'Manesar', 'Dharuhera', 'Rewari', 'Kotputli', 'Shahpura', 'Jaipur Sindhi Camp',
    // Others
    'Visakhapatnam', 'Kolkata', 'Varanasi', 'Pune', 'Aurangabad', 'Nanded', 'Nizamabad', 'Adilabad', 'Kurnool', 'Anantapur'
].sort();

const DROP_LOCATIONS = [...PICKUP_LOCATIONS];

const BUS_TYPES = ['AC Sleeper', 'Non-AC', 'AC Seater', 'Semi-Sleeper', 'Deluxe AC'];

// =============================================
// SUPABASE DATABASE LAYER
// =============================================
const LocalDB = {
    isReady: () => {
        if (!window.supabaseClient) {
            console.error('❌ Supabase client not initialized');
            return false;
        }
        return true;
    },

    // ---- USERS ----
    getAllUsers: async () => {
        if (!LocalDB.isReady()) return [];
        const { data } = await window.supabaseClient.from('users').select('*');
        return data || [];
    },

    addUser: async (user) => {
        if (!LocalDB.isReady()) return { error: new Error('DB not ready'), data: null };
        const { id, ...userData } = user;
        let tableName = 'users';
        if (userData.role === 'admin') tableName = 'admins';
        else if (userData.role === 'driver') tableName = 'drivers';
        try {
            const { data, error } = await window.supabaseClient.from(tableName).insert([userData]).select();
            if (error) return { error, data: null };
            return { error: null, data: data ? data[0] : null };
        } catch (err) {
            return { error: err, data: null };
        }
    },

    findUserByEmail: async (email) => {
        if (!LocalDB.isReady()) return null;
        let { data } = await window.supabaseClient.from('users').select('*').eq('email', email).maybeSingle();
        if (data) return data;
        ({ data } = await window.supabaseClient.from('drivers').select('*').eq('email', email).maybeSingle());
        if (data) return data;
        ({ data } = await window.supabaseClient.from('admins').select('*').eq('email', email).maybeSingle());
        return data;
    },

    findUserByPhone: async (phone) => {
        if (!LocalDB.isReady()) return null;
        let { data } = await window.supabaseClient.from('users').select('*').eq('phone', phone).maybeSingle();
        if (data) return data;
        ({ data } = await window.supabaseClient.from('drivers').select('*').eq('phone', phone).maybeSingle());
        if (data) return data;
        ({ data } = await window.supabaseClient.from('admins').select('*').eq('phone', phone).maybeSingle());
        return data;
    },

    // ---- BOOKINGS ----
    getUserBookings: async (email, phone) => {
        if (!LocalDB.isReady()) return [];
        email = email || ''; phone = phone || '';
        let query = window.supabaseClient.from('tickets').select(`
            id, ticket_id, booked_by_email, booked_by_phone, total_fare, journey_date, created_at, status,
            passengers ( name, age, gender, seat_number, pickup_location, drop_location, bus_number, status )
        `);
        if (email && phone) query = query.or(`booked_by_email.eq.${email},booked_by_phone.eq.${phone}`);
        else if (email) query = query.eq('booked_by_email', email);
        else if (phone) query = query.eq('booked_by_phone', phone);
        else return [];
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error || !data) return [];
        return data.map(t => {
            const p = t.passengers && t.passengers.length > 0 ? t.passengers[0] : {};
            return {
                id: t.id, ticketId: t.ticket_id, name: p.name || 'Unknown',
                phone: t.booked_by_phone, email: t.booked_by_email,
                pickup: p.pickup_location, drop: p.drop_location, busNumber: p.bus_number,
                date: t.journey_date, seats: t.passengers ? t.passengers.map(px => px.seat_number) : [],
                fare: t.total_fare, age: p.age, gender: p.gender,
                created_at: t.created_at, status: t.status
            };
        });
    },

    addBooking: async (booking) => {
        if (!LocalDB.isReady()) return { error: new Error('DB not ready'), data: null };
        const seatsArray = Array.isArray(booking.seats) ? booking.seats
            : (booking.seats ? String(booking.seats).split(',').map(s => s.trim()) : []);
        const fare = Number(booking.fare) || 500;
        try {
            // ── STEP 1: Lock seats in seat_bookings (UNIQUE constraint stops races) ──
            if (seatsArray.length > 0) {
                const seatRows = seatsArray.map(seat => ({
                    bus_id:          booking.busId, // Must use BUS-1002 string to match queries
                    trip_date:       booking.date,
                    route_from:      booking.pickup,
                    route_to:        booking.drop,
                    seat_number:     seat,
                    passenger_name:  booking.name,
                    booking_status:  'Booked'
                }));
                const { error: seatError } = await window.supabaseClient
                    .from('seat_bookings').insert(seatRows);
                if (seatError) {
                    console.error('Seat conflict:', seatError);
                    // Detect Postgres unique constraint violation (23505 = duplicate key)
                    const isConflict = seatError.code === '23505';
                    const msg = isConflict
                        ? '⚡ Seat conflict! Someone just booked that seat simultaneously. Please go back and choose a different seat.'
                        : `Booking failed: ${seatError.message}`;
                    return { error: new Error(msg), data: null };
                }
                // Also mirror into legacy seats table
                await window.supabaseClient.from('seats').insert(
                    seatsArray.map(seat => ({
                        bus_number:   booking.busNumber,
                        journey_date: booking.date,
                        seat_number:  seat,
                        status:       'Booked'
                    }))
                );
            }
            // ── STEP 2: Insert ticket ──
            const { error: ticketError } = await window.supabaseClient.from('tickets').insert([{
                ticket_id:        booking.ticketId,
                booked_by_email:  booking.email,
                booked_by_phone:  String(booking.phone || ''),
                total_fare:       fare,
                journey_date:     booking.date,
                status:           'Confirmed'
            }]);
            if (ticketError) throw ticketError;
            // ── STEP 3: Insert passengers ──
            if (seatsArray.length > 0) {
                const { error: paxError } = await window.supabaseClient.from('passengers').insert(
                    seatsArray.map(seat => ({
                        ticket_id:       booking.ticketId,
                        name:            booking.name,
                        age:             booking.age ? String(booking.age) : null,
                        gender:          booking.gender || null,
                        seat_number:     seat,
                        pickup_location: booking.pickup,
                        drop_location:   booking.drop,
                        bus_number:      booking.busNumber,
                        journey_date:    booking.date,
                        status:          'Booked'
                    }))
                );
                if (paxError) throw paxError;
            }
            return { error: null, data: booking };
        } catch (err) {
            console.error('❌ Booking insert error:', err);
            return { error: err, data: null };
        }
    },

    getAllBookings: async () => {
        if (!LocalDB.isReady()) return [];
        const { data, error } = await window.supabaseClient.from('tickets').select(`
            id, ticket_id, booked_by_email, booked_by_phone, total_fare, journey_date, created_at, status,
            passengers ( name, age, gender, seat_number, pickup_location, drop_location, bus_number, status )
        `);
        if (error || !data) return [];
        return data.map(t => {
            const p = t.passengers && t.passengers.length > 0 ? t.passengers[0] : {};
            return {
                id: t.id, ticketId: t.ticket_id, name: p.name || 'Unknown',
                phone: t.booked_by_phone, email: t.booked_by_email,
                pickup: p.pickup_location, drop: p.drop_location, busNumber: p.bus_number,
                date: t.journey_date, seats: t.passengers.map(px => px.seat_number),
                fare: t.total_fare, age: p.age, gender: p.gender,
                created_at: t.created_at, status: p.status || t.status
            };
        });
    },

    cancelBooking: async (ticketId) => {
        if (!LocalDB.isReady()) return;
        // Get seat info before cancelling
        const { data: paxData } = await window.supabaseClient.from('passengers')
            .select('bus_number, journey_date, seat_number').eq('ticket_id', ticketId);
        // Cancel ticket & passengers
        await window.supabaseClient.from('tickets').update({ status: 'Cancelled' }).eq('ticket_id', ticketId);
        await window.supabaseClient.from('passengers').update({ status: 'Cancelled' }).eq('ticket_id', ticketId);
        // Remove from seat_bookings (frees the seat for others)
        if (paxData && paxData.length > 0) {
            for (const pax of paxData) {
                await window.supabaseClient.from('seat_bookings').delete().match({
                    bus_id: pax.bus_number, trip_date: pax.journey_date, seat_number: pax.seat_number
                });
                await window.supabaseClient.from('seats').delete().match({
                    bus_number: pax.bus_number, journey_date: pax.journey_date, seat_number: pax.seat_number
                });
            }
        }
    },

    // ── PRIMARY: Query seat_bookings (route-aware) ──
    getBookedSeats: async (busId, date, reqFrom, reqTo) => {
        if (!LocalDB.isReady()) return [];
        const { data } = await window.supabaseClient
            .from('seat_bookings')
            .select('seat_number, route_from, route_to')
            .eq('bus_id', busId)
            .eq('trip_date', date)
            .eq('booking_status', 'Booked');
            
        if (!data || !reqFrom || !reqTo) return data ? data.map(r => r.seat_number) : [];

        // Find the bus's ordered stops
        const busData = REAL_BUSES.find(rb => rb.number === busId || rb.id === busId);
        if (!busData) return data.map(r => r.seat_number);

        const stopsLower = busData.stops.map(s => s.toLowerCase());
        const reqFromIdx = stopsLower.findIndex(s => s === reqFrom.toLowerCase() || s.includes(reqFrom.toLowerCase()));
        const reqToIdx = stopsLower.findIndex(s => s === reqTo.toLowerCase() || s.includes(reqTo.toLowerCase()));

        // If we can't map the user's request to indices, block all booked seats to be safe
        if (reqFromIdx === -1 || reqToIdx === -1) return data.map(r => r.seat_number);

        // Filter out seats where the booked segment does NOT overlap with the requested segment
        const overlappingSeats = data.filter(booking => {
            const bFromIdx = stopsLower.findIndex(s => s === (booking.route_from || '').toLowerCase() || s.includes((booking.route_from || '').toLowerCase()));
            const bToIdx = stopsLower.findIndex(s => s === (booking.route_to || '').toLowerCase() || s.includes((booking.route_to || '').toLowerCase()));
            
            // If we can't map the booking to indices, assume it overlaps to be safe
            if (bFromIdx === -1 || bToIdx === -1) return true;

            // Requested segment (A to B) overlaps with Booked segment (C to D) if:
            // ReqStart < BookEnd AND ReqEnd > BookStart
            // Also need to handle cases where start and end overlap on the exact same stop index.
            return reqFromIdx < bToIdx && reqToIdx > bFromIdx;
        });

        console.log(`[getBookedSeats] Requesting ${reqFrom} -> ${reqTo}`);
        console.log(`[getBookedSeats] Found ${data.length} total bookings, ${overlappingSeats.length} overlap.`);
        
        return overlappingSeats.map(r => r.seat_number);
    },

    // ── Route-aware query (bus_id + date + from + to) ──
    getRouteBookedSeats: async (busId, date, routeFrom, routeTo) => {
        if (!LocalDB.isReady()) return [];
        const { data } = await window.supabaseClient
            .from('seat_bookings')
            .select('seat_number, passenger_name')
            .eq('bus_id', busId)
            .eq('trip_date', date)
            .eq('booking_status', 'Booked');
        return data ? data.map(r => r.seat_number) : [];
    },

    // ── Real-time check before final booking (anti-double-booking) ──
    checkSeatConflict: async (busId, date, seats, reqFrom, reqTo) => {
        if (!LocalDB.isReady()) return [];
        // Run the same route-aware overlap check
        const overlapping = await LocalDB.getBookedSeats(busId, date, reqFrom, reqTo);
        // Only return conflicts if the user selected a seat that is in the overlapping list
        return seats.filter(s => overlapping.includes(s));
    },
};

// =============================================
// STATE & CONFIG
// =============================================
let currentUser = null;
let currentBusData = null;
let selectedSeats = [];
let userBookingsCache = [];
let chatbotInitialized = false;

// Define the 20 real buses with their exact stops globally so all modules can resolve routes from busNumbers
const REAL_BUSES = [
    { id: 'BUS-1001', number: 'TS09AB1001', type: 'AC Sleeper',   stops: ['LB Nagar', 'Nalgonda', 'Miryalguda', 'Nagarjunasagar', 'Guntur', 'Vijayawada', 'Tenali', 'Chirala', 'Ongole', 'Kavali', 'Nellore', 'Gudur', 'Puttur', 'Tirupati'] },
    { id: 'BUS-1002', number: 'TS09AB1002', type: 'Non-AC',       stops: ['Hyderabad', 'Uppal', 'Ghatkesar', 'Bhongir', 'Aler', 'Jangaon', 'Station Ghanpur', 'Warangal'] },
    { id: 'BUS-1003', number: 'TS09AB1003', type: 'AC Seater',    stops: ['Bengaluru', 'Jayanagar', 'Kengeri', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Srirangapatna', 'Mysuru'] },
    { id: 'BUS-1004', number: 'TS09AB1004', type: 'Semi-Sleeper', stops: ['Chennai', 'Tambaram', 'Chengalpattu', 'Mahabalipuram', 'Chinglepet', 'Tindivanam', 'Villupuram', 'Pondicherry'] },
    { id: 'BUS-1005', number: 'TS09AB1005', type: 'Deluxe AC',    stops: ['Mumbai', 'Thane', 'Bhiwandi', 'Shahapur', 'Khardi', 'Igatpuri', 'Ghoti', 'Nashik'] },
    { id: 'BUS-1006', number: 'TS09AB1006', type: 'AC Sleeper',   stops: ['Delhi', 'Gurgaon', 'Manesar', 'Dharuhera', 'Rewari', 'Kotputli', 'Shahpura', 'Jaipur'] },
    // Generic 2-stop buses matching admin definitions
    { id: 'BUS-1007', number: 'TS09AB1007', type: 'Non-AC',       stops: ['Hyderabad', 'Pune'] },
    { id: 'BUS-1008', number: 'TS09AB1008', type: 'AC Seater',    stops: ['Hyderabad', 'Nagpur'] },
    { id: 'BUS-1009', number: 'TS09AB1009', type: 'Semi-Sleeper', stops: ['Bengaluru', 'Chennai'] },
    { id: 'BUS-1010', number: 'TS09AB1010', type: 'Deluxe AC',    stops: ['Bengaluru', 'Mumbai'] },
    { id: 'BUS-1011', number: 'TS09AB1011', type: 'AC Sleeper',   stops: ['Vijayawada', 'Visakhapatnam'] },
    { id: 'BUS-1012', number: 'TS09AB1012', type: 'Non-AC',       stops: ['Visakhapatnam', 'Kolkata'] },
    { id: 'BUS-1013', number: 'TS09AB1013', type: 'AC Seater',    stops: ['Chennai', 'Tirupati'] },
    { id: 'BUS-1014', number: 'TS09AB1014', type: 'Semi-Sleeper', stops: ['Mumbai', 'Pune'] },
    { id: 'BUS-1015', number: 'TS09AB1015', type: 'Deluxe AC',    stops: ['Delhi', 'Varanasi'] },
    { id: 'BUS-1016', number: 'TS09AB1016', type: 'AC Sleeper',   stops: ['Pune', 'Aurangabad'] },
    { id: 'BUS-1017', number: 'TS09AB1017', type: 'Non-AC',       stops: ['Nagpur', 'Nanded'] },
    { id: 'BUS-1018', number: 'TS09AB1018', type: 'AC Seater',    stops: ['Hyderabad', 'Nizamabad'] },
    { id: 'BUS-1019', number: 'TS09AB1019', type: 'Semi-Sleeper', stops: ['Hyderabad', 'Adilabad'] },
    { id: 'BUS-1020', number: 'TS09AB1020', type: 'Deluxe AC',    stops: ['Hyderabad', 'Kurnool'] }
];

async function fetchUserBookings() {
    // Moved to line 681 to consolidate logic
}

// =============================================
// INITIALIZE DEFAULT USERS (FOR TESTING)
// =============================================
function initializeDefaultUsers() {
    // Deprecated for Supabase implementation
}

// =============================================
// DOM READY
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application starting...');
    
    // Test Supabase connection
    if (!window.supabaseClient) {
        console.error('❌ CRITICAL: Supabase client NOT initialized!');
        console.error('❌ Check: 1) Supabase CDN loaded? 2) config.js loaded? 3) API key valid?');
        alert('❌ Database connection failed! Please refresh the page or check console.');
    } else {
        console.log('📊 Supabase client ready: YES ✅');
        console.log('📡 Connection URL:', SUPABASE_URL);
    }
    
    // Initialize default users if none exist
    initializeDefaultUsers();

    setMinTravelDate();
    setupLoginForm();
    setupRegistrationForm();
    setupUserLogout();
    setupUserMenu();
    setupFindBuses();
    setupBackButtons();
    setupPaymentForm();
    setupNewBookingBtn();

    // Restore session
    const sessionUser = JSON.parse(sessionStorage.getItem('userSession') || 'null');
    if (sessionUser) {
        console.log('✅ Restoring user session:', sessionUser.email, 'Role:', sessionUser.role);
        currentUser = sessionUser;
        showUserDashboard(); // This now handles fetchBookings and initChatbot
    } else {
        console.log('ℹ️ No existing session found - showing login screen');
    }
});

// =============================================
// LOGIN TAB SWITCHING
// =============================================
function toggleAuthMode(mode) {
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    const loginBtn = document.getElementById('login-tab-btn');
    const registerBtn = document.getElementById('register-tab-btn');

    if (mode === 'login') {
        if (loginPanel) loginPanel.classList.remove('d-none');
        if (registerPanel) registerPanel.classList.add('d-none');
        if (loginBtn) loginBtn.classList.add('active');
        if (registerBtn) registerBtn.classList.remove('active');
    } else {
        if (loginPanel) loginPanel.classList.add('d-none');
        if (registerPanel) registerPanel.classList.remove('d-none');
        if (loginBtn) loginBtn.classList.remove('active');
        if (registerBtn) registerBtn.classList.add('active');
    }
}

// =============================================
// DRIVER PORTAL NAVIGATION
// =============================================
function goToDriver() {
    window.location.href = 'driver.html';
}

// =============================================
// USER LOGIN
// =============================================
function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const credential = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');

        // Clear previous errors
        if (errEl) errEl.textContent = '';

        // Validation
        if (!credential || !password) {
            if (errEl) errEl.textContent = '❌ Please enter email/phone and password';
            return;
        }

        console.log('🔐 Login attempt with credential:', credential);

        try {
            // Check if Supabase is ready
            if (!LocalDB.isReady()) {
                throw new Error('Database connection failed - Supabase client not available');
            }

            // Try to find user by email first
            console.log('📊 Querying database for user by email...');
            let user = await LocalDB.findUserByEmail(credential);
            
            // If not found by email, try phone
            if (!user) {
                console.log('📊 Email not found, trying phone number...');
                user = await LocalDB.findUserByPhone(credential);
            }
            
            if (user) {
                console.log('✅ User found in database:', user.email, 'Role:', user.role);
            } else {
                console.log('❌ User not found in database');
            }

            // Check if user exists and password matches
            let match = user && user.password === password ? user : null;

            // ── FALLBACK: Check admin sample driver list ──
            // Drivers login with: phone = username, license = password
            if (!match) {
                const adminDrivers = JSON.parse(localStorage.getItem('admin-drivers')) || [
                    { id:1,  name:'Rajesh Kumar',  license:'TG-DL-001', phone:'9876543210', busId:1 },
                    { id:2,  name:'Arjun Singh',   license:'TG-DL-002', phone:'9876543211', busId:2 },
                    { id:3,  name:'Suresh Reddy',  license:'TG-DL-003', phone:'9876543212', busId:3 },
                    { id:4,  name:'Vikram Das',    license:'TG-DL-004', phone:'9876543213', busId:4 },
                    { id:5,  name:'Ramesh Patel',  license:'TG-DL-005', phone:'9876543214', busId:5 },
                    { id:6,  name:'Prakash Rao',   license:'TG-DL-006', phone:'9876543215', busId:6 },
                    { id:7,  name:'Kiran Sharma',  license:'TG-DL-007', phone:'9876543216', busId:7 },
                    { id:8,  name:'Abdul Khan',    license:'TG-DL-008', phone:'9876543217', busId:8 },
                    { id:9,  name:'Venkat Sai',    license:'TG-DL-009', phone:'9876543218', busId:9 },
                    { id:10, name:'Karthik N',     license:'TG-DL-010', phone:'9876543219', busId:10 },
                    { id:11, name:'Manoj Tiwari',  license:'TG-DL-011', phone:'9876543220', busId:11 },
                    { id:12, name:'Santosh G',     license:'TG-DL-012', phone:'9876543221', busId:12 },
                    { id:13, name:'Deepak Raj',    license:'TG-DL-013', phone:'9876543222', busId:13 },
                    { id:14, name:'Ravi Teja',     license:'TG-DL-014', phone:'9876543223', busId:14 },
                    { id:15, name:'Ajay Varma',    license:'TG-DL-015', phone:'9876543224', busId:15 },
                    { id:16, name:'Pawan Kalyan',  license:'TG-DL-016', phone:'9876543225', busId:16 },
                    { id:17, name:'Mohan Babu',    license:'TG-DL-017', phone:'9876543226', busId:17 },
                    { id:18, name:'Sunil Kumar',   license:'TG-DL-018', phone:'9876543227', busId:18 },
                    { id:19, name:'Anil Yadav',    license:'TG-DL-019', phone:'9876543228', busId:19 },
                    { id:20, name:'Bhaskar Reddy', license:'TG-DL-020', phone:'9876543229', busId:20 },
                ];
                const adminDriver = adminDrivers.find(d =>
                    (d.phone === credential || d.name.toLowerCase() === credential.toLowerCase()) &&
                    d.license.toUpperCase() === password.toUpperCase()
                );
                if (adminDriver) {
                    match = {
                        name: adminDriver.name,
                        phone: adminDriver.phone,
                        license_no: adminDriver.license,
                        busId: adminDriver.busId,
                        role: 'driver',
                        email: adminDriver.phone + '@routex.driver'
                    };
                    console.log('✅ Driver authenticated from admin list:', match.name);
                }
            }

            if (match) {
                console.log('✅ Password match successful! User:', match.email);
                console.log('👤 User role:', match.role);
                currentUser = match;
                sessionStorage.setItem('userSession', JSON.stringify(match));
                if (errEl) errEl.textContent = '';

                if (match.role === 'admin') {
                    console.log('🔐 Admin login successful - redirecting to admin portal...');
                    window.location.href = 'admin.html';
                } else if (match.role === 'driver') {
                    console.log('🚗 Driver login successful - redirecting to driver portal...');
                    window.location.href = 'driver.html';
                } else {
                    console.log('👤 User login successful - showing user dashboard...');
                    await fetchUserBookings();
                    showUserDashboard();
                    initChatbot();
                    form.reset();
                }
            } else {
                console.warn('❌ Login failed: Invalid credentials');
                if (errEl) errEl.textContent = '❌ Invalid credentials. Drivers: use Phone + License No.';
            }
        } catch (err) {
            console.error('❌ Login error:', err);
            if (errEl) errEl.textContent = `❌ Login failed: ${err.message || 'Unknown error'}`;
        }
    });
}

function selectRegistrationRole(role) {
    document.querySelectorAll('[data-role]').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('data-selected-role');
    });

    const selectedBtn = document.querySelector(`[data-role="${role}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
        selectedBtn.setAttribute('data-selected-role', role);
    }

    const roleMap = {
        'user': 'Passenger 👤',
        'driver': 'Bus Driver 🚗',
        'admin': 'System Admin 🔐'
    };
    const displayEl = document.getElementById('selected-role');
    if (displayEl) {
        displayEl.textContent = `Selected: ${roleMap[role]}`;
    }

    const driverFields = document.getElementById('driver-fields');
    if (driverFields) {
        driverFields.style.display = role === 'driver' ? 'block' : 'none';
        
        const licenseInput = document.getElementById('license-number');
        const accessCodeInput = document.getElementById('driver-access-code');
        
        if (licenseInput) {
            licenseInput.required = role === 'driver';
        }
        if (accessCodeInput) {
            accessCodeInput.required = role === 'driver';
        }
    }
}

// =============================================
// REGISTRATION FORM
// =============================================
function setupRegistrationForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('reg-name')?.value.trim();
        const email = document.getElementById('reg-email')?.value.trim();
        const phone = document.getElementById('reg-phone')?.value.trim();
        const password = document.getElementById('reg-password')?.value;
        const passwordConfirm = document.getElementById('reg-password-confirm')?.value;
        const licenseNumber = document.getElementById('license-number')?.value.trim();
        const errEl = document.getElementById('register-error');
        const successEl = document.getElementById('register-success-message');

        // Validation
        if (!name || !email || !phone || !password || !passwordConfirm) {
            if (errEl) errEl.textContent = '❌ Please fill all fields';
            return;
        }

        if (password !== passwordConfirm) {
            if (errEl) errEl.textContent = '❌ Passwords do not match';
            return;
        }

        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
            if (errEl) errEl.textContent = '❌ Phone must be 10 digits';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (errEl) errEl.textContent = '❌ Invalid email format';
            return;
        }

        if (password.length < 6) {
            if (errEl) errEl.textContent = '❌ Password must be at least 6 characters';
            return;
        }

        // FIX: Properly get the selected role - look for button that has data-selected-role attribute set
        const selectedBtn = document.querySelector('[data-selected-role]');
        const selectedRole = selectedBtn?.getAttribute('data-selected-role') || null;
        
        // Validate that a role was selected
        if (!selectedRole) {
            if (errEl) errEl.textContent = '❌ Please select a role (User, Driver, or Admin)';
            return;
        }

        // Validate driver license if driver role is selected
        if (selectedRole === 'driver') {
            const accessCode = document.getElementById('driver-access-code')?.value.trim();
            if (accessCode !== 'ROUTEX-DRIVER-2026') {
                if (errEl) errEl.textContent = '❌ Invalid Driver Access Code. Contact admin for authorization.';
                return;
            }
            if (!licenseNumber) {
                if (errEl) errEl.textContent = '❌ Please enter your driving license number';
                return;
            }
        }

        try {
            const newUser = {
                // Let Supabase auto-generate the UUID id
                email,
                phone,
                password,
                name,
                role: selectedRole
            };

            // Add role-specific data
            if (selectedRole === 'driver') {
                newUser.license_no = licenseNumber;
            }

            console.log('📝 Starting registration process...');
            console.log('📋 User data:', { name, email, phone, role: selectedRole, license: selectedRole === 'driver' ? licenseNumber : 'N/A' });
            console.log('🔐 Verifying Supabase connection...');

            if (!LocalDB.isReady()) {
                throw new Error('Supabase database not initialized');
            }

            // Check if user already exists
            console.log('🔍 Checking if email already exists in database...');
            const existingUserByEmail = await LocalDB.findUserByEmail(email);
            console.log('📊 Email lookup result:', existingUserByEmail ? 'EXISTS ⚠️' : 'NEW ✅');
            
            const existingUserByPhone = await LocalDB.findUserByPhone(phone);
            console.log('📊 Phone lookup result:', existingUserByPhone ? 'EXISTS ⚠️' : 'NEW ✅');
            
            if (existingUserByEmail) {
                console.error('❌ Registration error: Email already exists');
                throw new Error('Email already registered');
            }
            if (existingUserByPhone) {
                console.error('❌ Registration error: Phone already exists');
                throw new Error('Phone already registered');
            }

            // Add user to Supabase
            console.log('💾 Saving user to Supabase database...');
            console.log('📤 Sending data:', newUser);
            const { error, data: savedData } = await LocalDB.addUser(newUser);
            
            if (error) {
                console.error('❌ DATABASE ERROR:', error);
                console.error('❌ Error code:', error.code);
                console.error('❌ Error message:', error.message);
                console.error('❌ Error details:', error);
                
                // Better error messages
                if (error.code === 'PGRST116') {
                    throw new Error('Table "users" not found in database. Please contact admin.');
                } else if (error.code === '23505') {
                    throw new Error('Email or phone already registered');
                } else if (error.message?.includes('permission')) {
                    throw new Error('Permission denied. Check Supabase security rules.');
                } else {
                    throw error;
                }
            }

            console.log('✅ User successfully saved to database!');
            console.log('📊 Saved record:', savedData);
            console.log('📊 Registration complete for:', email);
            console.log('💾 Full saved data:', newUser);

            // Success - Show popup modal
            if (errEl) errEl.textContent = '';
            
            const regModal = new bootstrap.Modal(document.getElementById('regSuccessModal'));
            regModal.show();

            // Disable form inputs during redirect
            if (form) {
                form.querySelectorAll('input, button[type="submit"]').forEach(el => el.disabled = true);
            }

            // Auto authenticate and redirect after showing success
            setTimeout(async () => {
                regModal.hide();
                currentUser = newUser;
                sessionStorage.setItem('userSession', JSON.stringify(newUser));
                console.log('✅ User session created and stored');
                console.log('👤 Current user:', currentUser.email, 'Role:', currentUser.role);

                if (newUser.role === 'admin') {
                    console.log('🔐 Admin registered successfully - redirecting...');
                    window.location.href = 'admin.html';
                } else if (newUser.role === 'driver') {
                    console.log('🚗 Driver registered successfully - redirecting...');
                    window.location.href = 'driver.html';
                } else {
                    console.log('👤 User registered successfully - showing dashboard...');
                    
                    // Critical: Update profile before showing dashboard
                    userBookingsCache = []; 
                    populateProfilePage(); 
                    
                    await fetchUserBookings();
                    showUserDashboard();
                    initChatbot(); // Initialize chatbot on first login
                    
                    // Reset form and UI
                    if (form) {
                        form.reset();
                        form.querySelectorAll('input, button[type="submit"]').forEach(el => el.disabled = false);
                    }
                    if (successEl) successEl.classList.add('d-none');
                    document.querySelectorAll('[data-role]').forEach(btn => {
                        btn.classList.remove('active');
                        btn.removeAttribute('data-selected-role');
                    });
                    const driverFields = document.getElementById('driver-fields');
                    if (driverFields) driverFields.style.display = 'none';
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Registration failed:', error);
            if (errEl) {
                let errorMsg = error.message || 'Unknown error';
                // Handle specific error types
                if (error.code === '23505') {
                    errorMsg = 'Email or phone already registered';
                }
                errEl.textContent = `❌ Registration failed: ${errorMsg}`;
            }
        }
    });
}

function showUserDashboard() {
    window.hideAllSections = hideAllSections;
    window.showPage = showPage;
    window.showBookingStep = showBookingStep;
    window.handleFindBuses = handleFindBuses;

    hideAllSections();
    document.getElementById('user-section').classList.remove('d-none');
    
    // UI Greeting
    const greetEl = document.getElementById('user-greeting');
    if (greetEl) greetEl.textContent = `Welcome, ${currentUser?.name || 'User'}!`;
    const nameEl = document.getElementById('user-menu-name');
    if (nameEl) nameEl.textContent = currentUser?.name || 'My Account';
    
    // Core Init
    fetchUserBookings(); 
    initChatbot();
    
    showPage('booking');
}


        // =============================================
        // FETCH USER BOOKINGS
        // =============================================
        async function fetchUserBookings() {
            if (!currentUser) return;
            try {
                const bookings = await LocalDB.getUserBookings(currentUser.email, currentUser.phone);
                userBookingsCache = bookings || [];
                console.log(`✅ Loaded ${userBookingsCache.length} bookings for user.`);
                populateProfilePage();
                populateMyBookings();
            } catch (err) {
                console.error('Failed to fetch user bookings:', err);
            }
        }

        // =============================================
        // USER LOGOUT
        // =============================================
        function setupUserLogout() {
            document.addEventListener('click', e => {
                if (e.target?.id === 'logout') {
                    currentUser = null;
                    selectedSeats = [];
                    currentBusData = null;
                    userBookingsCache = [];
                    sessionStorage.removeItem('userSession');
                    hideAllSections();
                    
                    // Cleanup Chatbot
                    const cb = document.getElementById('chatbot-container');
                    if (cb) cb.classList.add('d-none');
                    document.getElementById('chatbot-window')?.classList.add('hidden');
                    
                    document.getElementById('login-section').classList.remove('d-none');
                }
            });
        }

        // =============================================
        // USER MENU (DROPDOWN)
        // =============================================
        function setupUserMenu() {
            document.addEventListener('click', e => {
                const dropdown = document.getElementById('user-menu-dropdown');
                const btn = document.getElementById('user-menu-btn');
                if (!dropdown) return;
                if (btn && btn.contains(e.target)) return;
                // Click outside → close
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.add('d-none');
                }
            });
        }

        function toggleUserMenu() {
            const dd = document.getElementById('user-menu-dropdown');
            if (dd) dd.classList.toggle('d-none');
        }

        // =============================================
        // PAGE NAVIGATION (within user section)
        // =============================================
        function showPage(page) {
            // Close menu dropdown
            const dd = document.getElementById('user-menu-dropdown');
            if (dd) dd.classList.add('d-none');

            const pages = ['page-booking', 'page-profile', 'page-my-bookings'];
            pages.forEach(p => {
                const el = document.getElementById(p);
                if (el) el.classList.add('d-none');
            });

            const target = document.getElementById(`page-${page}`);
            if (target) target.classList.remove('d-none');

            if (page === 'profile') populateProfilePage();
            if (page === 'my-bookings') populateMyBookings();
        }

        // =============================================
        // PROFILE PAGE
        // =============================================
        function populateProfilePage() {
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
            
            // Check if we have recent booking data
            const bookings = userBookingsCache;
            const latest = bookings && bookings.length > 0 ? bookings[0] : null;

            // Source of truth priorities: 
            // 1. Latest booking details (often has most complete display info)
            // 2. currentUser session (fallback for new accounts)
            
            const name = latest?.name || currentUser?.name || '—';
            const email = latest?.email || currentUser?.email || '—';
            const phone = latest?.phone || currentUser?.phone || '—';
            const age = latest?.age ? `${latest.age} years` : (currentUser?.age ? `${currentUser.age} years` : '—');
            const gender = latest?.gender || currentUser?.gender || '—';

            // Top Header Info
            setEl('profile-display-name', name);
            setEl('profile-display-email', email);
            
            // Details Card
            setEl('prof-name', name);
            setEl('prof-age', age);
            setEl('prof-gender', gender);
            setEl('prof-phone', phone);
            setEl('prof-email', email);
            
            // Update dropdown menu as well
            const menuNameEl = document.getElementById('user-menu-name');
            if (menuNameEl) menuNameEl.textContent = name;
        }

        // =============================================
        // MY BOOKINGS PAGE
        // =============================================
        function populateMyBookings() {
            const container = document.getElementById('my-bookings-list');
            if (!container) return;

            const bookings = userBookingsCache;

            if (bookings.length === 0) {
                container.innerHTML = `
            <div class="empty-bookings">
                <div style="font-size:3rem;margin-bottom:12px;">🎫</div>
                <p>No bookings yet. <a href="#" onclick="showPage('booking');return false;">Book your first ticket!</a></p>
            </div>`;
                return;
            }

            container.innerHTML = [...bookings].reverse().map(b => {
                const busData = REAL_BUSES.find(rb => rb.number === b.busNumber);
                const busOrigin = busData ? busData.stops[0] : b.pickup;
                const busDest = busData ? busData.stops[busData.stops.length - 1] : b.drop;

                return `
        <div class="my-booking-card" id="my-booking-card-${b.ticketId}">
            <div class="my-booking-header">
                <div>
                    <span class="my-booking-id">${b.ticketId || 'TKT-???'}</span>
                    <span class="my-booking-badge ${b.status === 'Boarded' ? 'badge-boarded' : b.status === 'Dropped' ? 'badge-dropped' : ''}">
                        ${b.status === 'Boarded' ? '✅ Boarded' : b.status === 'Dropped' ? '🏁 Dropped' : '✅ Confirmed'}
                    </span>
                </div>
                <span class="my-booking-fare">₹${b.fare || 500}</span>
            </div>
            
            <div class="my-booking-route" style="border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; color: #666; display: block; margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">🚌 Full Bus Route</span>
                <span>📍 ${busOrigin}</span>
                <span class="route-arrow" style="color:#009fb7">→</span>
                <span>🏁 ${busDest}</span>
            </div>

            <div class="my-booking-route">
                <span style="font-size: 0.75rem; color: #666; display: block; margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">🧑 Your Journey</span>
                <span>📍 ${b.pickup || '—'}</span>
                <span class="route-arrow">→</span>
                <span>🏁 ${b.drop || '—'}</span>
            </div>

            <div class="my-booking-meta" style="margin-top: 10px;">
                <span>🚌 ${b.busNumber || '—'}</span>
                <span>💺 Seats: ${(b.seats || []).join(', ')}</span>
                <span>📅 ${b.date || '—'}</span>
            </div>
            <div class="my-booking-meta" style="margin-top:4px; margin-bottom: 12px;">
                <span>👤 <span id="name-display-${b.ticketId}">${b.name || '—'}</span></span>
                <span>📞 <span id="phone-display-${b.ticketId}">${b.phone || '—'}</span></span>
            </div>

            <!-- QR Code Section -->
            <div class="booking-qr-section" id="qr-section-${b.ticketId}" style="display:none; text-align:center; padding: 12px 0 8px; border-top: 1px solid rgba(0,0,0,0.08);">
                <p style="font-size:0.78rem; color:#696773; margin-bottom:8px;">📱 Show this QR to the driver for boarding</p>
                <div id="qr-canvas-${b.ticketId}" style="display:inline-block; background:#fff; padding:8px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1);"></div>
                <p style="font-size:0.7rem; color:#009fb7; margin-top:8px; font-weight:600; letter-spacing:1px;">${b.ticketId}</p>
            </div>

            <div class="my-booking-actions border-top pt-2 d-flex justify-content-end gap-2 flex-wrap">
                <button class="btn btn-sm" style="background:var(--primary,#009fb7);color:#fff;" onclick="toggleBookingQR('${b.ticketId}')">📷 Show QR Code</button>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditBooking('${b.ticketId}')">✏️ Edit Details</button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelUserBooking('${b.ticketId}')">❌ Cancel</button>
            </div>
        </div>
    `}).join('');
        }

        function toggleBookingQR(ticketId) {
            const section = document.getElementById(`qr-section-${ticketId}`);
            const canvas  = document.getElementById(`qr-canvas-${ticketId}`);
            if (!section) return;

            const isVisible = section.style.display !== 'none';
            section.style.display = isVisible ? 'none' : 'block';

            // Generate QR only once (check if canvas already has content)
            if (!isVisible && canvas && canvas.children.length === 0) {
                const b = (userBookingsCache || []).find(x => x.ticketId === ticketId);
                if (!b) { canvas.textContent = ticketId; return; }

                const qrText = `TKT:${b.ticketId}\nName:${b.name}\nRt:${b.pickup}->${b.drop}\nDate:${b.date}\nBus:${b.busNumber}\nSeats:${(b.seats||[]).join(',')}\nFare:Rs.${b.fare}`;

                try {
                    if (typeof QRCode !== 'undefined') {
                        new QRCode(canvas, {
                            text: qrText,
                            width: 180, height: 180,
                            colorDark: '#272727',
                            colorLight: '#ffffff',
                            correctLevel: QRCode.CorrectLevel.L
                        });
                    } else {
                        canvas.innerHTML = `<pre style="font-size:0.65rem;text-align:left;">${qrText}</pre>`;
                    }
                } catch(e) {
                    canvas.innerHTML = `<pre style="font-size:0.65rem;text-align:left;">${qrText}</pre>`;
                }
            }

        }

        async function cancelUserBooking(ticketId) {
            if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
            await LocalDB.cancelBooking(ticketId);
            alert('Booking cancelled successfully.');
            await fetchUserBookings();
            populateMyBookings();
        }

        async function openEditBooking(ticketId) {
            const bookings = userBookingsCache;
            const b = bookings.find(x => x.ticketId === ticketId);
            if (!b) return;

            const newName = prompt('Enter new passenger name:', b.name);
            if (newName === null) return;
            const newPhone = prompt('Enter new phone number (10 digits):', b.phone);
            if (newPhone === null) return;

            if (newName.trim() === '') { alert('Name cannot be empty.'); return; }
            if (!/^\d{10}$/.test(newPhone.replace(/\D/g, ''))) { alert('Phone must be 10 digits.'); return; }

            b.name  = newName.trim();
            b.phone = newPhone.replace(/\D/g, '');

            // Save updates to Supabase
            if (window.supabaseClient) {
                await window.supabaseClient.from('passengers').update({ name: b.name }).eq('ticket_id', ticketId);
                await window.supabaseClient.from('tickets').update({ booked_by_phone: b.phone }).eq('ticket_id', ticketId);
            }

            alert('Booking updated.');
            populateMyBookings();
        }

        function getAllUserBookings() {
            let raw = JSON.parse(localStorage.getItem('bookings') || '[]');
            // Filter out placeholder/invalid bookings with no ticket ID or no route
            let valid = raw.filter(b => b && b.ticketId && b.name && b.pickup && b.drop);
            if (valid.length !== raw.length) {
                localStorage.setItem('bookings', JSON.stringify(valid));
            }
            return valid;
        }

        // =============================================
        // SECTION HELPERS & MODALS
        // =============================================
        function hideAllSections() {
            ['login-section', 'user-section', 'ticket-section', 'processing-section'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('d-none');
            });
        }

        function showErrorModal(title, message) {
            const tempModal = document.getElementById('errorModal');
            if (tempModal) {
                document.getElementById('errorModalTitle').textContent = title;
                document.getElementById('errorModalMessage').textContent = message;
                const modal = new bootstrap.Modal(tempModal);
                modal.show();
            } else {
                alert(`❌ ${title}\n${message}`);
            }
        }

        // =============================================
        // TRAVEL DATE MIN
        // =============================================
        function setMinTravelDate() {
            const dateInput = document.getElementById('travelDate');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.setAttribute('min', today);
                dateInput.value = today;
            }
        }

        // =============================================
        // STEP NAVIGATION
        // =============================================
        function showBookingStep(step) {
            if (step !== 3 && typeof stopSeatPolling === 'function') {
                stopSeatPolling();
            }

            ['step-passenger', 'step-bus-selection', 'step-seat-selection'].forEach(id => {
                document.getElementById(id)?.classList.add('d-none');
            });

            const stepMap = { 1: 'step-passenger', 2: 'step-bus-selection', 3: 'step-seat-selection' };
            document.getElementById(stepMap[step])?.classList.remove('d-none');

            // Pre-fill user details on Step 1 if logged in
            if (step === 1 && currentUser) {
                const nameInp = document.getElementById('fullName');
                const phoneInp = document.getElementById('phone');
                const emailInp = document.getElementById('email');
                
                // Only fill if empty to avoid overwriting intentional changes
                if (nameInp && !nameInp.value) nameInp.value = currentUser.name || '';
                if (phoneInp && !phoneInp.value) phoneInp.value = currentUser.phone || '';
                if (emailInp && !emailInp.value) emailInp.value = currentUser.email || '';
            }

            document.querySelectorAll('.booking-step-indicator').forEach(el => {
                const s = parseInt(el.dataset.step);
                el.classList.toggle('active', s === step);
                el.classList.toggle('completed', s < step);
            });
        }

        // =============================================
        // VALIDATION HELPERS
        // =============================================
        function showFieldError(field, msg) {
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
            let fb = field.nextElementSibling;
            if (!fb || !fb.classList.contains('invalid-feedback')) {
                fb = document.createElement('div');
                fb.className = 'invalid-feedback';
                field.parentNode.insertBefore(fb, field.nextSibling);
            }
            fb.textContent = msg;
        }

        function clearFieldError(field) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            const fb = field.nextElementSibling;
            if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = '';
        }

        function clearAllFieldStates(form) {
            form.querySelectorAll('.form-control, .form-select, select').forEach(el => {
                el.classList.remove('is-invalid', 'is-valid');
            });
            form.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        }

        // =============================================
        // STEP 1: FIND BUSES
        // =============================================
        function setupFindBuses() {
            const btn = document.getElementById('find-buses');
            if (!btn) return;
            btn.addEventListener('click', handleFindBuses);
        }

        function handleFindBuses() {
            const form = document.getElementById('booking-form');
            clearAllFieldStates(form);

            const fields = {
                fullName: { el: document.getElementById('fullName'), label: 'Full name' },
                age: { el: document.getElementById('age'), label: 'Age' },
                gender: { el: document.getElementById('gender'), label: 'Gender' },
                phone: { el: document.getElementById('phone'), label: 'Phone' },
                email: { el: document.getElementById('email'), label: 'Email' },
                pickup: { el: document.getElementById('pickup'), label: 'Pickup location' },
                drop: { el: document.getElementById('drop'), label: 'Drop location' },
                travelDate: { el: document.getElementById('travelDate'), label: 'Travel date' },
            };

            let valid = true;

            // Full name
            if (!fields.fullName.el.value.trim()) { showFieldError(fields.fullName.el, 'Please enter your full name.'); valid = false; }
            else clearFieldError(fields.fullName.el);

            // Age
            const age = parseInt(fields.age.el.value);
            if (!fields.age.el.value || isNaN(age) || age < 1 || age > 120) { showFieldError(fields.age.el, 'Enter a valid age (1–120).'); valid = false; }
            else clearFieldError(fields.age.el);

            // Gender
            if (!fields.gender.el.value) { showFieldError(fields.gender.el, 'Please select your gender.'); valid = false; }
            else clearFieldError(fields.gender.el);

            // Phone: exactly 10 digits
            const phone = fields.phone.el.value.replace(/\D/g, '');
            if (phone.length !== 10) { showFieldError(fields.phone.el, 'Phone must be exactly 10 digits — numbers only.'); valid = false; }
            else clearFieldError(fields.phone.el);

            // Email
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(fields.email.el.value.trim())) { showFieldError(fields.email.el, 'Enter a valid email (e.g. name@domain.com).'); valid = false; }
            else clearFieldError(fields.email.el);

            // Pickup
            if (!fields.pickup.el.value) { showFieldError(fields.pickup.el, 'Please select a pickup location.'); valid = false; }
            else clearFieldError(fields.pickup.el);

            // Drop
            if (!fields.drop.el.value) { showFieldError(fields.drop.el, 'Please select a drop location.'); valid = false; }
            else clearFieldError(fields.drop.el);

            // Drop ≠ Pickup
            if (fields.pickup.el.value && fields.drop.el.value && fields.pickup.el.value === fields.drop.el.value) {
                showFieldError(fields.drop.el, 'Destination must differ from origin.'); valid = false;
            }

            // Date
            if (!fields.travelDate.el.value) { showFieldError(fields.travelDate.el, 'Please select a travel date.'); valid = false; }
            else clearFieldError(fields.travelDate.el);

            if (!valid) return;

            const pickupCity = fields.pickup.el.value;
            const dropCity = fields.drop.el.value;

            showBookingStep(2);
            document.getElementById('bus-selection-subtitle').textContent =
                `Available buses from ${pickupCity} → ${dropCity} on ${formatDate(fields.travelDate.el.value)}`;
            populateBusSelection(pickupCity, dropCity, fields.travelDate.el.value);
        }

        // =============================================
        // STEP 2: BUS SELECTION — Dynamic routes
        // =============================================
        function generateBusPool(from, to) {
            const types = BUS_TYPES;
            const times = ['05:00', '06:30', '08:00', '10:00', '12:00', '14:00', '16:00', '18:30', '20:00', '22:00'];
            
            // REAL_BUSES is now defined globally at the top of the file so that tickets can use it too.

            const fareMap = {
                'Mumbai': 900, 'Delhi': 1200, 'Kolkata': 1300, 'Varanasi': 1100, 'Pune': 850,
                'Nagpur': 700, 'Bengaluru': 680, 'Chennai': 780, 'Aurangabad': 720, 'Nanded': 580,
                'Vijayawada': 480, 'Visakhapatnam': 650, 'Tirupati': 560, 'Kurnool': 420,
                'Anantapur': 490, 'Guntur': 350, 'Nellore': 540,
                'Warangal': 260, 'Karimnagar': 290, 'Nizamabad': 310, 'Adilabad': 380,
                'Mahabubnagar': 250, 'Khammam': 300, 'Nalgonda': 220,
                'LB Nagar': 380, 'Mysuru': 200, 'Pondicherry': 180, 'Nashik': 250, 'Jaipur': 350,
            };

            const baseFare = fareMap[to] || 450;
            const buses = [];
            const usedRoutes = new Set();
            usedRoutes.add(`${from}-${to}`);

            // 1. FIRST check if this segment matches any REAL bus route
            const CITY_STOPS_MAP = {
                'hyderabad': ['hyderabad', 'lb nagar', 'mgbs hyderabad', 'uppal', 'dilsukhnagar', 'mehdipatnam', 'paradise circle', 'kukatpally', 'secunderabad', 'miyapur', 'jubilee central', 'ghatkesar'],
                'delhi': ['delhi', 'kashmere gate delhi'],
                'mumbai': ['mumbai', 'dadar mumbai'],
                'bengaluru': ['bengaluru', 'kempegowda bus stand'],
                'chennai': ['chennai', 'chennai cmbt'],
                'tirupati': ['tirupati', 'tirupati bus stand'],
                'jaipur': ['jaipur', 'jaipur sindhi camp']
            };

            const searchFrom = from.toLowerCase();
            const searchTo = to.toLowerCase();
            const fromStops = CITY_STOPS_MAP[searchFrom] || [searchFrom];
            const toStops = CITY_STOPS_MAP[searchTo] || [searchTo];

            REAL_BUSES.forEach(bus => {
                const stopsLower = bus.stops.map(s => s.toLowerCase());
                
                // Find matching exact stop by checking if any mapped city stop exists in the route
                let fromIdx = -1;
                let exactFrom = from;
                for (let i = 0; i < stopsLower.length; i++) {
                    if (fromStops.some(fs => stopsLower[i].includes(fs) || fs.includes(stopsLower[i]))) {
                        fromIdx = i;
                        exactFrom = bus.stops[i];
                        break;
                    }
                }
                
                let toIdx = -1;
                let exactTo = to;
                for (let i = stopsLower.length - 1; i >= 0; i--) {
                    if (toStops.some(fs => stopsLower[i].includes(fs) || fs.includes(stopsLower[i]))) {
                        toIdx = i;
                        exactTo = bus.stops[i];
                        break;
                    }
                }

                if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
                    // Distance-based fare calculation: Base Price * Number of Stops Travelled
                    const stopsTravelled = toIdx - fromIdx;
                    const calculatedBaseFare = stopsTravelled * 100;
                    
                    const mult = bus.type === 'AC Sleeper' ? 1.4 : bus.type === 'AC Seater' ? 1.2 : 1.0;
                    buses.push({
                        id: bus.id,
                        number: bus.number, // The crucial link to driver.js
                        from: exactFrom, 
                        to: exactTo, 
                        type: bus.type,
                        departure: times[buses.length % times.length],
                        fare: Math.round((calculatedBaseFare * mult) / 10) * 10,
                        available: 10 + Math.floor(Math.random() * 20),
                    });
                }
            });

            // 2. If no real buses found (or fewer than 3), inject some generic ones so UI isn't empty
            for (let i = buses.length; i < Math.max(3, buses.length); i++) {
                const type = types[i % types.length];
                const mult = type === 'AC Sleeper' ? 1.4 : type === 'AC Seater' ? 1.2 : 1.0;
                buses.push({
                    id: `BUS-${String(1001 + buses.length + 50).padStart(4, '0')}`,
                    number: `TS09XX${Math.floor(1000 + Math.random() * 9000)}`, // Unassigned bus
                    from, to, type,
                    departure: times[i % times.length],
                    fare: Math.round((baseFare * mult) / 10) * 10,
                    available: 10 + Math.floor(Math.random() * 20),
                });
            }

            // 3. Generate random generic routes for filler
            const origins = [...PICKUP_LOCATIONS].sort(() => 0.5 - Math.random());
            const dests = [...DROP_LOCATIONS].sort(() => 0.5 - Math.random());
            let oIdx = 0, dIdx = 0;

            while (buses.length < 15 && oIdx < origins.length && dIdx < dests.length) {
                const rFrom = origins[oIdx];
                const rTo = dests[dIdx];

                if (rFrom !== rTo && !usedRoutes.has(`${rFrom}-${rTo}`)) {
                    usedRoutes.add(`${rFrom}-${rTo}`);
                    const type = types[buses.length % types.length];
                    const rFare = fareMap[rTo] || 400;
                    const mult = type === 'AC Sleeper' ? 1.4 : type === 'AC Seater' ? 1.2 : 1.0;

                    buses.push({
                        id: `BUS-${String(1001 + buses.length + 50).padStart(4, '0')}`,
                        number: `TS09XX${Math.floor(1000 + Math.random() * 9000)}`,
                        from: rFrom, to: rTo, type,
                        departure: times[buses.length % times.length],
                        fare: Math.round((rFare * mult) / 10) * 10,
                        available: 5 + Math.floor(Math.random() * 30),
                    });
                }
                oIdx++;
                if (oIdx >= origins.length) { oIdx = 0; dIdx++; }
            }

            return buses;
        }

        function populateBusSelection(from, to, date) {
            const container = document.getElementById('bus-cards-container');
            if (!container) return;

            const buses = generateBusPool(from, to);

            container.innerHTML = buses.map((bus, i) => `
        <div class="bus-card" id="bus-card-${i}" onclick="selectBus(${i})">
            <div class="bus-card-header">
                <span class="bus-id-badge">${bus.id}</span>
                <span class="bus-type-badge">${bus.type}</span>
            </div>
            <div class="bus-route">
                📍 ${bus.from}
                <span class="route-arrow-inline">→</span>
                🏁 ${bus.to}
            </div>
            <div class="bus-details-row">
                <span>🕐 ${bus.departure}</span>
                <span>💺 ${bus.available} seats left</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span class="bus-fare">₹${bus.fare}</span>
                <button class="btn-select-bus">Select →</button>
            </div>
        </div>
    `).join('');

            // Store for later use
            container.dataset.buses = JSON.stringify(buses);
            container.dataset.date = date;
        }

        async function selectBus(index) {
            const container = document.getElementById('bus-cards-container');
            const buses = JSON.parse(container.dataset.buses);
            const bus = buses[index];
            const date = container.dataset.date;

            currentBusData = { ...bus, date };

            // Highlight selection
            container.querySelectorAll('.bus-card').forEach((c, i) => c.classList.toggle('selected', i === index));

            // Move to step 3
            showBookingStep(3);
            document.getElementById('selected-bus-info').textContent =
                `${bus.id} | ${bus.type} | ${bus.from} → ${bus.to} | Departs ${bus.departure} | ₹${bus.fare}/seat`;
            document.getElementById('ticket-price-display').textContent = `₹0`; // Initialize to 0

            selectedSeats = [];
            await generateSeats(bus.id);
            updatePayButton();
        }

        // =============================================
        // STEP 3: SEAT LAYOUT (ABHI BUS STYLE - 32 SEATS)
        // =============================================
        async function generateSeats(busId) {
            const layout = document.getElementById('seat-layout');
            if (!layout) return;

            const perBusBooked = await getBookedSeatsForBus(busId);

            layout.innerHTML = `
        <div class="bus-interior">
            <!-- Driver Area Indicator -->
            <div class="bus-front-indicator">
                <div class="driver-wheel">🛞 Driver</div>
                <div class="front-window"></div>
            </div>

            <!-- Seat Rows -->
            <div class="seats-section">
                ${generateSeatRows(perBusBooked, currentBusData.type)}
            </div>
        </div>

        <!-- Seat Legend -->
        <div class="seat-legend-modern">
            <div class="legend-item">
                <div class="legend-seat available"></div>
                <span>Available</span>
            </div>
            <div class="legend-item">
                <div class="legend-seat selected"></div>
                <span>Selected</span>
            </div>
            <div class="legend-item">
                <div class="legend-seat booked"></div>
                <span>Booked</span>
            </div>
        </div>`;

            // Add click handlers for seats
            document.querySelectorAll('.seat-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const seatId = this.dataset.seat;
                    toggleSeat(seatId);
                });
            });

            // Start polling for real-time seat locking updates
            if (typeof startSeatPolling === 'function') {
                startSeatPolling(currentBusData.id, currentBusData.date);
            }
        }

        function generateSeatRows(bookedSeats, busType) {
            console.log(`[generateSeatRows] Drawing grid with booked seats:`, bookedSeats);
            let html = '';
            
            // Reverted to old format: just 8 rows of 4 seats (32 seats total).
            for (let row = 1; row <= 8; row++) {
                html += `
                    <div class="seat-row">
                        <div class="row-number">${row}</div>
                        <div class="seats-in-row">
                            <!-- Left Window -->
                            <div class="seat-wrapper">
                                <button class="seat-btn seater-chair ${bookedSeats.includes(`${row}A`) ? 'booked' : 'available'}"
                                        data-seat="${row}A"
                                        ${bookedSeats.includes(`${row}A`) ? 'disabled' : ''}>
                                    <span class="seat-number">${row}A</span>
                                    <span class="seat-type">Seat</span>
                                    ${bookedSeats.includes(`${row}A`) ? '<span class="booked-overlay">X</span>' : ''}
                                </button>
                            </div>

                            <!-- Left Aisle -->
                            <div class="seat-wrapper">
                                <button class="seat-btn seater-chair ${bookedSeats.includes(`${row}B`) ? 'booked' : 'available'}"
                                        data-seat="${row}B"
                                        ${bookedSeats.includes(`${row}B`) ? 'disabled' : ''}>
                                    <span class="seat-number">${row}B</span>
                                    <span class="seat-type">Seat</span>
                                    ${bookedSeats.includes(`${row}B`) ? '<span class="booked-overlay">X</span>' : ''}
                                </button>
                            </div>

                            <!-- Aisle Gap -->
                            <div class="aisle-gap"></div>

                            <!-- Right Aisle -->
                            <div class="seat-wrapper">
                                <button class="seat-btn seater-chair ${bookedSeats.includes(`${row}C`) ? 'booked' : 'available'}"
                                        data-seat="${row}C"
                                        ${bookedSeats.includes(`${row}C`) ? 'disabled' : ''}>
                                    <span class="seat-number">${row}C</span>
                                    <span class="seat-type">Seat</span>
                                    ${bookedSeats.includes(`${row}C`) ? '<span class="booked-overlay">X</span>' : ''}
                                </button>
                            </div>
                            
                            <!-- Right Window -->
                            <div class="seat-wrapper">
                                <button class="seat-btn seater-chair ${bookedSeats.includes(`${row}D`) ? 'booked' : 'available'}"
                                        data-seat="${row}D"
                                        ${bookedSeats.includes(`${row}D`) ? 'disabled' : ''}>
                                    <span class="seat-number">${row}D</span>
                                    <span class="seat-type">Seat</span>
                                    ${bookedSeats.includes(`${row}D`) ? '<span class="booked-overlay">X</span>' : ''}
                                </button>
                            </div>
                        </div>
                    </div>`;
            }
            return html;
        }
        async function getBookedSeatsForBus(busId) {
            if (!currentBusData || !currentBusData.date) return [];
            // We pass the exact from/to from the user's search to see which booked seats overlap with their journey
            return await LocalDB.getBookedSeats(busId, currentBusData.date, currentBusData.from, currentBusData.to);
        }

        let seatPollingInterval = null;
        let seatRealtimeChannel = null;
        let isProcessingBooking = false; // Flag to designate checkout phase

        function applySeatUpdates(bookedList) {
            bookedList.forEach(seatNo => {
                // Ignore updates for seats the current user is actively booking during the checkout phase
                if (isProcessingBooking && selectedSeats.includes(seatNo)) {
                    return; 
                }
                
                const btn = document.querySelector(`[data-seat="${seatNo}"]`);
                if (btn && !btn.classList.contains('booked')) {
                    btn.classList.remove('available', 'selected');
                    btn.classList.add('booked');
                    btn.disabled = true;
                    if (!btn.querySelector('.booked-overlay')) {
                        btn.insertAdjacentHTML('beforeend', '<span class="booked-overlay">✕</span>');
                    }
                    // REMOVED: Intrusive 'Seat Snatched' logic that unselects seats and shows modals erroneously.
                }
            });
        }

        function startSeatPolling(busId, date) {
            stopSeatPolling();

            // ── Supabase Realtime: instant push when another user books ──
            if (window.supabaseClient) {
                seatRealtimeChannel = window.supabaseClient
                    .channel(`seat_bookings:${busId}:${date}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'seat_bookings',
                        filter: `bus_id=eq.${busId}`
                    }, async (payload) => {
                        if (!currentBusData || currentBusData.id !== busId) return;
                        if (payload.new && payload.new.trip_date === date) {
                            applySeatUpdates([payload.new.seat_number]);
                        }
                    })
                    .subscribe();
            }

            // ── Fallback: poll every 4s to catch any missed events ──
            seatPollingInterval = setInterval(async () => {
                if (!currentBusData || currentBusData.id !== busId) { stopSeatPolling(); return; }
                const booked = await LocalDB.getBookedSeats(busId, date);
                applySeatUpdates(booked);
            }, 4000);
        }

        function stopSeatPolling() {
            if (seatPollingInterval) { clearInterval(seatPollingInterval); seatPollingInterval = null; }
            if (seatRealtimeChannel && window.supabaseClient) {
                window.supabaseClient.removeChannel(seatRealtimeChannel);
                seatRealtimeChannel = null;
            }
        }

        function toggleSeat(seatId) {
            // Find the button by data-seat attribute instead of id
            const btn = document.querySelector(`[data-seat="${seatId}"]`);
            if (!btn || btn.disabled) return;

            if (selectedSeats.includes(seatId)) {
                selectedSeats = selectedSeats.filter(s => s !== seatId);
                btn.classList.remove('selected');
                btn.classList.add('available');
            } else {
                if (selectedSeats.length >= 6) {
                    alert('Maximum 6 seats per booking.');
                    return;
                }
                selectedSeats.push(seatId);
                btn.classList.remove('available');
                btn.classList.add('selected');
            }

            const textEl = document.getElementById('selected-seats-text');
            if (textEl) textEl.textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None';

            updatePayButton();
        }

        function updatePayButton() {
            const btn = document.getElementById('proceed-to-payment');
            const priceDisplay = document.getElementById('ticket-price-display');
            if (!btn) return;
            
            const baseFare = currentBusData?.fare || 0;
            const totalFare = baseFare * selectedSeats.length;
            
            if (priceDisplay) {
                priceDisplay.textContent = `₹${totalFare}`;
            }
            
            if (selectedSeats.length > 0) {
                btn.disabled = false;
                btn.className = 'btn btn-success btn-lg btn-glow';
                btn.textContent = `✅ Pay ₹${totalFare} & Book (${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''})`;
            } else {
                btn.disabled = true;
                btn.className = 'btn btn-secondary btn-lg';
                btn.textContent = '💳 Proceed to Payment';
            }
        }

        // =============================================
        // BACK BUTTONS
        // =============================================
        function setupBackButtons() {
            document.getElementById('back-to-passenger')?.addEventListener('click', () => showBookingStep(1));
            document.getElementById('back-to-bus-selection')?.addEventListener('click', () => showBookingStep(2));

            const proceedBtn = document.getElementById('proceed-to-payment');
            if (proceedBtn) {
                // Remove existing listeners by cloning
                const newBtn = proceedBtn.cloneNode(true);
                proceedBtn.parentNode.replaceChild(newBtn, proceedBtn);
                
                newBtn.addEventListener('click', async () => {
                    if (selectedSeats.length === 0) return;
                    
                    // Verify seats aren't taken right before payment
                    if (currentBusData?.id && currentBusData?.date) {
                        newBtn.disabled = true;
                        const originalText = newBtn.textContent;
                        newBtn.textContent = 'Verifying Seats...';
                        
                        const conflicts = await LocalDB.checkSeatConflict(currentBusData.id, currentBusData.date, selectedSeats, currentBusData.from, currentBusData.to);
                        
                        newBtn.disabled = false;
                        newBtn.textContent = originalText;
                        
                        if (conflicts && conflicts.length > 0) {
                            showErrorModal('⚠️ Seats Snatched', `Sorry, seat(s) ${conflicts.join(', ')} were just booked by someone else!`);
                            applySeatUpdates(conflicts);
                            return;
                        }
                    }
                    
                    const modal = new bootstrap.Modal(document.getElementById('payment-modal'));
                    
                    // Update actual modal price text
                    const baseFare = currentBusData?.fare || 0;
                    const totalFare = baseFare * selectedSeats.length;
                    const modalAmount = document.getElementById('ticket-price-display'); // Correct ID from HTML
                    if (modalAmount) modalAmount.textContent = `₹${totalFare}`;
                    
                    modal.show();
                });
            }
        }

        // =============================================
        // PAYMENT FORM — Validation & Processing
        // =============================================
        function setupPaymentForm() {
            const cardInput = document.getElementById('cardNumber');
            const expiryInput = document.getElementById('expiry');
            const cvvInput = document.getElementById('cvv');

            // Auto-format card number
            cardInput?.addEventListener('input', e => {
                let v = e.target.value.replace(/\D/g, '').substring(0, 16);
                e.target.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
            });

            // Auto-format expiry
            expiryInput?.addEventListener('input', e => {
                let v = e.target.value.replace(/\D/g, '').substring(0, 4);
                if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
                e.target.value = v;
            });

            // CVV: numeric only
            cvvInput?.addEventListener('input', e => {
                const isAmex = isAmexCard();
                const max = isAmex ? 4 : 3;
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, max);
                const helpEl = document.getElementById('cvv-help');
                if (helpEl) helpEl.textContent = isAmex ? 'CVV: 4 digits (Amex)' : 'CVV: 3 digits (Visa/MC)';
            });

            // Blur validation
            cardInput?.addEventListener('blur', validateCardField);
            expiryInput?.addEventListener('blur', validateExpiryField);
            cvvInput?.addEventListener('blur', validateCVVField);

            const form = document.getElementById('payment-form');
            form?.addEventListener('submit', e => {
                e.preventDefault();
                const errEl = document.getElementById('payment-errors');
                if (errEl) errEl.innerHTML = '';

                const cardValid = validateCardField();
                const expiryValid = validateExpiryField();
                const cvvValid = validateCVVField();

                if (!cardValid || !expiryValid || !cvvValid) return;

                // ✅ All valid — close modal and show processing
                const modal = bootstrap.Modal.getInstance(document.getElementById('payment-modal'));
                if (modal) modal.hide();

                showProcessingPage();
            });
        }

        function isAmexCard() {
            const v = (document.getElementById('cardNumber')?.value || '').replace(/\s/g, '');
            return v.startsWith('34') || v.startsWith('37');
        }

        function validateCardField() {
            const field = document.getElementById('cardNumber');
            if (!field) return true;
            const digits = field.value.replace(/\D/g, '');
            if (digits.length !== 16) { showFieldError(field, 'Card number must be exactly 16 digits.'); return false; }
            clearFieldError(field); return true;
        }

        function validateExpiryField() {
            const field = document.getElementById('expiry');
            if (!field) return true;
            const val = field.value;
            if (!/^\d{2}\/\d{2}$/.test(val)) { showFieldError(field, 'Expiry must be MM/YY format.'); return false; }
            const [mm, yy] = val.split('/').map(Number);
            if (mm < 1 || mm > 12) { showFieldError(field, 'Month must be between 01 and 12.'); return false; }
            const now = new Date();
            const expDate = new Date(2000 + yy, mm - 1, 1);
            if (expDate <= new Date(now.getFullYear(), now.getMonth(), 1)) {
                showFieldError(field, 'Card has expired. Please use a valid card.'); return false;
            }
            clearFieldError(field); return true;
        }

        function validateCVVField() {
            const field = document.getElementById('cvv');
            if (!field) return true;
            const digits = field.value.replace(/\D/g, '');
            const expectedLen = isAmexCard() ? 4 : 3;
            if (digits.length !== expectedLen) {
                showFieldError(field, `CVV must be ${expectedLen} digits${isAmexCard() ? ' (Amex)' : ''}.`); return false;
            }
            clearFieldError(field); return true;
        }

        // =============================================
        // PAYMENT PROCESSING PAGE
        // =============================================
        function showProcessingPage() {
            hideAllSections();
            document.getElementById('processing-section').classList.remove('d-none');

            const steps = ['proc-step-1', 'proc-step-2', 'proc-step-3', 'proc-step-4'];
            const msgs = ['Encrypting your transaction…', 'Charging your card…', 'Generating ticket…', 'All done!'];

            steps.forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.classList.remove('proc-done', 'proc-active'); }
            });

            let current = 0;
            const statusEl = document.getElementById('processing-status-text');

            function activateStep(i) {
                if (i >= steps.length) {
                    // Done — create booking and show ticket
                    setTimeout(() => {
                        document.getElementById('processing-section').classList.add('d-none');
                        finalizeBooking();
                    }, 600);
                    return;
                }
                const el = document.getElementById(steps[i]);
                if (el) {
                    el.classList.add('proc-active');
                    if (statusEl) statusEl.textContent = msgs[i];
                }
                // Mark previous as done
                if (i > 0) {
                    const prev = document.getElementById(steps[i - 1]);
                    if (prev) { prev.classList.remove('proc-active'); prev.classList.add('proc-done'); }
                }
                
                // Once we start processing the actual payment (step 1), we suspend polling alerts
                if (i === 1) isProcessingBooking = true;
                
                setTimeout(() => activateStep(i + 1), 900);
            }

            activateStep(0);
        }

        async function finalizeBooking() {
            if (isSubmittingBooking) return; // Prevent double-submission
            isSubmittingBooking = true;
            const form = document.getElementById('booking-form');
            // Collision-resistant: timestamp (base36) + random suffix
            const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`;
            const now = new Date();

            const numSeats = selectedSeats.length;
            const baseFare = currentBusData?.fare || 0;
            const totalFare = baseFare * numSeats;

            const booking = {
                ticketId,
                name: document.getElementById('fullName')?.value.trim(),
                age: document.getElementById('age')?.value,
                gender: document.getElementById('gender')?.value,
                phone: document.getElementById('phone')?.value.replace(/\D/g, ''),
                email: document.getElementById('email')?.value.trim(),
                pickup: document.getElementById('pickup')?.value,
                drop: document.getElementById('drop')?.value,
                date: document.getElementById('travelDate')?.value,
                seats: [...selectedSeats],
                busId: currentBusData?.id,
                busNumber: currentBusData?.number || currentBusData?.id,
                busType: currentBusData?.type,
                fare: totalFare,
                boardingTime: currentBusData?.departure || '06:00',
                bookingDate: now.toLocaleDateString('en-IN'),
                createdAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                status: 'Confirmed',
            };

            // Save to Supabase
            log('💾 Saving booking...');
            const { error, data: savedBooking } = await LocalDB.addBooking(booking);
            if (error) {
                isSubmittingBooking = false;
                // Show the specific error message (includes seat conflict detection)
                showErrorModal('Booking Failed', error.message || 'One or more seats have already been booked. Please select different seats.');
                
                // Return user to seat layout to pick a new seat
                document.getElementById('processing-section').classList.add('d-none');
                showBookingStep(3);
                selectedSeats = [];
                const seatsTextEl = document.getElementById('selected-seats-text');
                if (seatsTextEl) seatsTextEl.textContent = 'None';
                updatePayButton();
                
                // Shake the bus layout to indicate error
                const layout = document.getElementById('seat-layout');
                if (layout) {
                    layout.classList.add('shake-animation');
                    setTimeout(() => layout.classList.remove('shake-animation'), 600);
                }
                
                isProcessingBooking = false;
                await generateSeats(currentBusData.id);
                return;
            } else {
                log('✅ Booking saved! Ticket ID:', booking.ticketId);
                if (savedBooking) {
                    booking.createdAt = new Date(savedBooking.created_at)
                        .toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                }
                isProcessingBooking = false; 
                applySeatUpdates([...selectedSeats]);
            }

            // Ticket success screen
            fetchUserBookings();
            isProcessingBooking = false;
            isSubmittingBooking = false;
            
            showTicketConfirmation(booking);
        }

        // =============================================
        // TICKET CONFIRMATION + QR CODE
        // =============================================
        function showTicketConfirmation(booking) {
            hideAllSections();
            document.getElementById('ticket-section').classList.remove('d-none');

            const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || '—'; };

            setEl('ticket-id', booking.ticketId);
            setEl('ticket-name', booking.name);
            setEl('ticket-age-gender', `${booking.age || '?'} yrs / ${booking.gender || '?'}`);
            setEl('ticket-phone', booking.phone);
            setEl('ticket-email', booking.email);
            setEl('ticket-bus', `${booking.busNumber} (${booking.busType})`);
            setEl('ticket-seats', (booking.seats || []).join(', '));
            setEl('ticket-route', `${booking.pickup} → ${booking.drop}`);
            setEl('ticket-date', formatDate(booking.date));
            setEl('ticket-boarding-time', booking.boardingTime);
            setEl('ticket-fare', `₹${booking.fare}`);
            setEl('ticket-booked-on', booking.createdAt || booking.bookingDate || '—');

            // Generate QR code with unique booking data
            generateBookingQR(booking);

            // ── Auto-generate the PDF and wire the Download button ──
            if (typeof generateTicketPDF === 'function') {
                generateTicketPDF(booking);
            }
        }

        function generateBookingQR(booking) {
            const container = document.getElementById('qr-code');
            if (!container) return;
            container.innerHTML = '';

            // Use only the Ticket ID so hardware barcode scanners input it cleanly into the Driver portal
            const qrData = booking.ticketId || 'UNKNOWN';

            try {
                if (typeof QRCode !== 'undefined') {
                    new QRCode(container, {
                        text: qrData,
                        width: 180,
                        height: 180,
                        colorDark: '#1a1a2e',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.L,
                    });
                } else {
                    throw new Error('QRCode library not loaded');
                }
            } catch (err) {
                console.warn('QR generation failed, using fallback:', err);
                container.innerHTML = `<pre class="qr-fallback">${qrData}</pre>`;
            }
        }

        // =============================================
        // NEW BOOKING & PDF DOWNLOAD
        // =============================================
        function setupNewBookingBtn() {
            document.getElementById('new-booking-btn')?.addEventListener('click', () => {
                selectedSeats = [];
                currentBusData = null;
                document.getElementById('booking-form')?.reset();
                setMinTravelDate();
                clearAllFieldStates(document.getElementById('booking-form'));
                hideAllSections();
                document.getElementById('user-section').classList.remove('d-none');
                showPage('booking');
                showBookingStep(1);
            });
        }

        // =============================================
        // UTILS
        // =============================================
        function formatDate(dateStr) {
            if (!dateStr) return '—';
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // =============================================
        // AI CHATBOT HELP DESK
        // =============================================
        function initChatbot() {
            if (chatbotInitialized) {
                const container = document.getElementById('chatbot-container');
                if (container) container.classList.remove('d-none');
                return;
            }
            
            const container = document.getElementById('chatbot-container');
            if (container) container.classList.remove('d-none');

            const toggle = document.getElementById('chatbot-toggle');
            const windowEl = document.getElementById('chatbot-window');
            const close = document.getElementById('chatbot-close');
            const sendBtn = document.getElementById('chatbot-send');
            const input = document.getElementById('chatbot-input');

            if (!toggle || !windowEl || !close || !sendBtn || !input) return;

            chatbotInitialized = true;

            toggle.onclick = () => {
                windowEl.classList.toggle('hidden');
                if (!windowEl.classList.contains('hidden')) {
                    input.focus();
                }
            };
            
            close.onclick = () => windowEl.classList.add('hidden');

        const sendMessage = async (overrideText = null) => {
            const text = overrideText || input.value.trim();
            if (!text) return;

            appendChatMessage('user', text);
            if (!overrideText) input.value = '';

            const typingId = appendTypingIndicator();
            const responseObj = await processChatQuery(text);
            
            setTimeout(() => {
                removeTypingIndicator(typingId);
                
                if (typeof responseObj === 'string') {
                    appendChatMessage('bot', responseObj);
                } else {
                    appendChatMessage('bot', responseObj.text, responseObj.actions);
                }
            }, 200); // Reduced delay for ultra-fast response
        };

        // Expose to window so onclick handlers in HTML can call it
        window.sendBotMessage = sendMessage;

        sendBtn.onclick = () => sendMessage();
        input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }

    function appendChatMessage(role, text, actions = []) {
        const msgContainer = document.getElementById('chatbot-messages');
        if (!msgContainer) return;

        const div = document.createElement('div');
        div.className = `chat-message ${role}`;
        div.innerHTML = text;
        
        if (actions && actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions mt-2 d-flex flex-wrap gap-2';
            actions.forEach(act => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-primary';
                btn.textContent = act.label;
                btn.onclick = () => {
                    if (act.action === 'send') {
                        window.sendBotMessage(act.payload);
                    } else if (act.action === 'nav') {
                        // Switch section
                        if (window.hideAllSections) window.hideAllSections();
                        document.getElementById('user-section').classList.remove('d-none');
                        if (window.showPage) window.showPage(act.payload);
                    } else if (act.action === 'search') {
                         if (window.showPage) window.showPage('booking');
                         if (window.showBookingStep) window.showBookingStep(1);
                         
                         const p = document.getElementById('pickup');
                         const d = document.getElementById('drop');
                         if(p && d) {
                             p.value = act.from;
                             d.value = act.to;
                             const dateEl = document.getElementById('travelDate');
                             if(dateEl && !dateEl.value) {
                                 dateEl.value = new Date().toISOString().split('T')[0];
                             }
                             // Auto trigger search
                             if (window.handleFindBuses) setTimeout(window.handleFindBuses, 500);
                         }
                    }
                };
                actionsDiv.appendChild(btn);
            });
            div.appendChild(actionsDiv);
        }
        
        msgContainer.appendChild(div);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    function appendTypingIndicator() {
        const msgContainer = document.getElementById('chatbot-messages');
        if (!msgContainer) return null;
        
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'chat-message bot';
        div.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        msgContainer.appendChild(div);
        msgContainer.scrollTop = msgContainer.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        if (id) document.getElementById(id)?.remove();
    }

    async function processChatQuery(query) {
        const q = query.toLowerCase();
        
        // 1. Dynamic Routing - Try to parse "buses from X to Y"
        if (q.includes('from') && q.includes('to')) {
            const match = q.match(/from\s+([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/);
            if (match && match[1] && match[2]) {
                const from = match[1];
                const to = match[2];
                return {
                    text: `I can help you look for buses from <b>${from}</b> to <b>${to}</b>! Shall I search the routes for you?`,
                    actions: [
                        { label: 'Yes, search now', action: 'search', from: from, to: to },
                        { label: 'No, thanks', action: 'send', payload: 'Nevermind' }
                    ]
                };
            }
        }
        
        // 2. Available Buses / Checking real routes
        if (q.includes('available') || q.includes('bus') || q.includes('route')) {
            const adminBuses = JSON.parse(localStorage.getItem('admin-buses')) || window.ADMIN_BUSES || [];
            if (adminBuses.length > 0) {
                const routes = new Set();
                adminBuses.forEach(b => routes.add(`${b.from} to ${b.to}`));
                const routeList = Array.from(routes).slice(0, 3).join(', ');
                return {
                    text: `We currently have active routes including: <b>${routeList}</b> and more. Use the <b>"Find Buses"</b> section to check specific availability!`,
                    actions: [
                        { label: 'Go to Find Buses', action: 'nav', payload: 'booking' }
                    ]
                };
            }
            return {
                text: `We have regular departures from major cities. Use the <b>"Find Buses"</b> section to check specific availability!`,
                actions: [
                    { label: 'Go to Find Buses', action: 'nav', payload: 'booking' }
                ]
            };
        }

        // 0. Direct PNR / Ticket ID Lookup
        if (q.includes('tkt-')) {
            const ticketMatch = q.match(/tkt-[a-z0-9]+/i);
            if (ticketMatch && userBookingsCache) {
                const found = userBookingsCache.find(b => b.ticketId.toLowerCase() === ticketMatch[0].toLowerCase());
                if (found) {
                    return {
                        text: `Found it! Ticket <b>${found.ticketId}</b> is <b>${found.status}</b>.<br><br>Route: ${found.pickup} → ${found.drop}<br>Date: ${formatDate(found.date)}<br>Fare: ₹${found.fare}`,
                        actions: [{ label: 'View all bookings', action: 'nav', payload: 'bookings' }]
                    };
                } else {
                    return `I couldn't find ticket ID <b>${ticketMatch[0].toUpperCase()}</b> in your account. Please check the ID or contact support.`;
                }
            }
        }

        // 1. Dynamic Routing - Try to parse "buses from X to Y"
        if (q.includes('from') && q.includes('to')) {
            const match = q.match(/from\s+([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/);
            if (match && match[1] && match[2]) {
                const from = match[1];
                const to = match[2];
                // Check if they mentioned "tomorrow" or "today"
                let actionLabel = 'Yes, search now';
                if (q.includes('tomorrow')) actionLabel = 'Search for Tomorrow';
                if (q.includes('today')) actionLabel = 'Search for Today';
                
                return {
                    text: `I can help you look for buses from <b>${from}</b> to <b>${to}</b>! Shall I load the route for you?`,
                    actions: [
                        { label: actionLabel, action: 'search', from: from, to: to },
                        { label: 'No, thanks', action: 'send', payload: 'Nevermind' }
                    ]
                };
            }
        }
        
        // 2. Available Buses
        if (q.includes('available') || q.includes('bus') || q.includes('route')) {
            return {
                text: `We have regular departures from major cities in Telangana, Andhra Pradesh, and more. Use the <b>"Find Buses"</b> section to check specific availability!`,
                actions: [
                    { label: 'Go to Find Buses', action: 'nav', payload: 'booking' }
                ]
            };
        }

        // 3. Ticket Status
        if (q.includes('status') || q.includes('my ticket') || q.includes('booking')) {
            if (!userBookingsCache || userBookingsCache.length === 0) {
                return {
                    text: `I couldn't find any active bookings in your account. Would you like to check the <b>"Find Buses"</b> section to book one?`,
                    actions: [
                        { label: 'Book a Bus', action: 'nav', payload: 'booking' }
                    ]
                };
            }
            const latest = userBookingsCache[0];
            return {
                text: `Your latest booking <b>(${latest.ticketId})</b> is currently <b>${latest.status}</b>.<br><br>Route: ${latest.pickup} → ${latest.drop}<br>Date: ${formatDate(latest.date)}`,
                actions: [
                    { label: 'View all bookings', action: 'nav', payload: 'bookings' }
                ]
            };
        }

        // 4. Seat Availability & Booking modifications
        if (q.includes('seat') || q.includes('empty') || q.includes('left') || q.includes('change seat')) {
            return `Seats are locked in real-time. If you want to change a booked seat, please cancel your current ticket and book a new one. <br><br>Most of our buses currently have seats available.`;
        }
        
        // 5. Cancellation Policy
        if (q.includes('cancel') || q.includes('refund')) {
            return {
                text: `<b>Cancellation Policy:</b><br>• 24+ hours before departure: Full refund.<br>• 12-24 hours before: 50% refund.<br>• Less than 12 hours: No refund.<br><br>You can cancel your booking from the <b>"My Bookings"</b> section.`,
                actions: [
                    { label: 'Go to My Bookings', action: 'nav', payload: 'bookings' }
                ]
            };
        }

        // 6. Luggage & Amenities
        if (q.includes('luggage') || q.includes('baggage') || q.includes('weight')) {
            return `<b>Luggage Policy:</b><br>• Up to <b>15KG</b> safely stowed in the lower compartment.<br>• One small cabin bag (up to 7KG) in the overhead racks.`;
        }
        if (q.includes('wifi') || q.includes('food') || q.includes('water') || q.includes('blanket')) {
            return `<b>Bus Amenities:</b><br>• Direct AC Cooling<br>• Clean Blankets & Water bottles provided<br>• Emergency medical kits on board.<br>Please check specific bus tags for Wi-Fi availability.`;
        }

        // 7. Fares & Prices
        if (q.includes('price') || q.includes('fare') || q.includes('cost') || q.includes('how much')) {
            return `<b>Fares:</b> Standard bus fares range from <b>₹250 to ₹900</b> depending on whether it's an AC Sleeper or Regular Seater, and distance traveled. The exact price is automatically calculated when you select your seats.`;
        }
        
        // 8. Track Bus
        if (q.includes('track') || q.includes('where is') || q.includes('location') || q.includes('gps')) {
            return {
                text: `Live tracking is activated 30 minutes before your departure. You can track your booked bus directly from your ticket view.`,
                actions: [
                    { label: 'View My Tickets', action: 'nav', payload: 'bookings' }
                ]
            };
        }
        
        // 9. Payment Issues / Password
        if (q.includes('payment failed') || q.includes('card') || q.includes('error')) {
            return `If your payment failed but money was deducted, it will be automatically refunded within <b>3-5 business days</b>. Try making the booking again.`;
        }
        if (q.includes('password') || q.includes('forgot')) {
            return `If you forgot your password, please contact our support at <b>support@busbooking.com</b> to reset it manually.`;
        }

        // 10. Contact / Emergency
        if (q.includes('contact') || q.includes('support') || q.includes('emergency')) {
            return `For emergencies or critical support, please call our 24/7 helpline at <b>1800-456-7890</b> or email us at <b>support@busbooking.com</b>.`;
        }

        // 11. Driver Info
        if (q.includes('driver') || q.includes('who is driving') || q.includes('safety')) {
            return `Our drivers hold heavy-vehicle commercial licenses and are highly trained. Driver details are shared via SMS <b>2 hours before</b> departure.`;
        }
        
        // 12. Negative responses
        if (q.includes('nevermind') || q.includes('no thanks') || q.includes('stop')) {
            return `Noted! Feel free to ask if you need anything else.`;
        }

        // 13. General Help
        if (q.includes('hello') || q.includes('hi') || q.includes('help') || q.includes('hey')) {
            return {
                text: `Hello! I am your advanced AI assistant. I can help you with many things. Click an option below or type your question!`,
                actions: [
                    { label: 'Check Ticket Status', action: 'send', payload: 'What is my ticket status?' },
                    { label: 'Fares & Pricing', action: 'send', payload: 'How much does a ticket cost?' },
                    { label: 'Cancellation Policy', action: 'send', payload: 'What is the cancellation policy?' },
                    { label: 'Track Bus', action: 'send', payload: 'How do I track my bus?' }
                ]
            };
        }

        return {
            text: `I'm sorry, I didn't quite catch that. Try asking about <b>prices, tracking, cancellations, luggage,</b> or ask to search for a route like <i>"Buses from Hyderabad to Warangal"</i>.`,
            actions: [
                 { label: 'Help Options', action: 'send', payload: 'Help' }
            ]
        };
    }