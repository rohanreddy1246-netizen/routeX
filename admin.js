// =============================================
// ADMIN MODULE — admin.html ONLY
// Handles: admin login guard, dashboard, bookings,
// buses, routes, drivers, revenue, monitoring, boarding
// =============================================

// =============================================
// ADMIN CREDENTIALS Check - using Unified Session
// =============================================

let currentAdmin = null;
let adminQrScanner = null;
let allBookingsCache = [];

let adminData = {
    buses: JSON.parse(localStorage.getItem('admin-buses')) || [
        { id: 1,  number: 'TS09AB1001', type: 'AC Sleeper',   capacity: 32, driver: 'Rajesh Kumar',  route: 'Hyderabad → Tirupati',     from: 'Hyderabad',    to: 'Tirupati',  status: 'Active', location: 'Hyderabad' },
        { id: 2,  number: 'TS09AB1002', type: 'Non-AC',       capacity: 40, driver: 'Arjun Singh',   route: 'Hyderabad → Warangal',      from: 'Hyderabad',   to: 'Warangal',    status: 'Active', location: 'Hyderabad' },
        { id: 3,  number: 'TS09AB1003', type: 'AC Seater',    capacity: 32, driver: 'Suresh Reddy',  route: 'Bengaluru → Mysuru',        from: 'Bengaluru',   to: 'Mysuru',      status: 'Active', location: 'Bengaluru' },
        { id: 4,  number: 'TS09AB1004', type: 'Semi-Sleeper', capacity: 45, driver: 'Vikram Das',    route: 'Chennai → Pondicherry',     from: 'Chennai',     to: 'Pondicherry', status: 'Active', location: 'Chennai' },
        { id: 5,  number: 'TS09AB1005', type: 'Deluxe AC',    capacity: 30, driver: 'Ramesh Patel',  route: 'Mumbai → Nashik',           from: 'Mumbai',      to: 'Nashik',      status: 'Active', location: 'Mumbai' },
        { id: 6,  number: 'TS09AB1006', type: 'AC Sleeper',   capacity: 32, driver: 'Prakash Rao',   route: 'Delhi → Jaipur',            from: 'Delhi',       to: 'Jaipur',      status: 'Active', location: 'Delhi' },
        { id: 7,  number: 'TS09AB1007', type: 'Non-AC',       capacity: 40, driver: 'Kiran Sharma',  status: 'Active', location: 'Mumbai' },
        { id: 8,  number: 'TS09AB1008', type: 'AC Seater',    capacity: 32, driver: 'Abdul Khan',    status: 'Active', location: 'Pune' },
        { id: 9,  number: 'TS09AB1009', type: 'Semi-Sleeper', capacity: 45, driver: 'Venkat Sai',    status: 'Active', location: 'Nagpur' },
        { id: 10, number: 'TS09AB1010', type: 'Deluxe AC',    capacity: 30, driver: 'Karthik N',     status: 'Active', location: 'Kolkata' },
        { id: 11, number: 'TS09AB1011', type: 'AC Sleeper',   capacity: 32, driver: 'Manoj Tiwari',  status: 'Active', location: 'Delhi' },
        { id: 12, number: 'TS09AB1012', type: 'Non-AC',       capacity: 40, driver: 'Santosh G',     status: 'Active', location: 'Warangal' },
        { id: 13, number: 'TS09AB1013', type: 'AC Seater',    capacity: 32, driver: 'Deepak Raj',    status: 'Active', location: 'Karimnagar' },
        { id: 14, number: 'TS09AB1014', type: 'Semi-Sleeper', capacity: 45, driver: 'Ravi Teja',     status: 'Active', location: 'Nizamabad' },
        { id: 15, number: 'TS09AB1015', type: 'Deluxe AC',    capacity: 30, driver: 'Ajay Varma',    status: 'Active', location: 'Adilabad' },
        { id: 16, number: 'TS09AB1016', type: 'AC Sleeper',   capacity: 32, driver: 'Pawan Kalyan',  status: 'Active', location: 'Guntur' },
        { id: 17, number: 'TS09AB1017', type: 'Non-AC',       capacity: 40, driver: 'Mohan Babu',    status: 'Active', location: 'Tirupati' },
        { id: 18, number: 'TS09AB1018', type: 'AC Seater',    capacity: 32, driver: 'Sunil Kumar',   status: 'Active', location: 'Kurnool' },
        { id: 19, number: 'TS09AB1019', type: 'Semi-Sleeper', capacity: 45, driver: 'Anil Yadav',    status: 'Active', location: 'Anantapur' },
        { id: 20, number: 'TS09AB1020', type: 'Deluxe AC',    capacity: 30, driver: 'Bhaskar Reddy', status: 'Active', location: 'Nellore' }
    ],
    routes: JSON.parse(localStorage.getItem('admin-routes')) || [
        { id: 1,  from: 'Tirupati', to: 'LB Nagar',     fare: 380,  distance: 580,  status: 'Active' },
        { id: 2,  from: 'Hyderabad',  to: 'Warangal',     fare: 260,  distance: 145,  status: 'Active' },
        { id: 3,  from: 'Bengaluru',  to: 'Mysuru',       fare: 200,  distance: 145,  status: 'Active' },
        { id: 4,  from: 'Chennai',    to: 'Pondicherry',  fare: 180,  distance: 160,  status: 'Active' },
        { id: 5,  from: 'Mumbai',     to: 'Nashik',       fare: 250,  distance: 167,  status: 'Active' },
        { id: 6,  from: 'Delhi',      to: 'Jaipur',       fare: 350,  distance: 280,  status: 'Active' },
        { id: 7,  from: 'Hyderabad',  to: 'Karimnagar',   fare: 280,  distance: 165,  status: 'Active' },
        { id: 8,  from: 'Hyderabad',  to: 'Bengaluru',    fare: 700,  distance: 570,  status: 'Active' },
        { id: 9,  from: 'Hyderabad',  to: 'Vijayawada',   fare: 480,  distance: 275,  status: 'Active' },
        { id: 10, from: 'Hyderabad',  to: 'Chennai',      fare: 780,  distance: 630,  status: 'Active' },
        { id: 11, from: 'Hyderabad',  to: 'Mumbai',       fare: 900,  distance: 710,  status: 'Active' },
        { id: 12, from: 'Hyderabad',  to: 'Pune',         fare: 850,  distance: 590,  status: 'Active' },
        { id: 13, from: 'Hyderabad',  to: 'Nagpur',       fare: 700,  distance: 500,  status: 'Active' },
        { id: 14, from: 'Bengaluru',  to: 'Chennai',      fare: 350,  distance: 345,  status: 'Active' },
        { id: 15, from: 'Vijayawada', to: 'Visakhapatnam',fare: 650,  distance: 350,  status: 'Active' },
        { id: 16, from: 'Visakhapatnam',to:'Kolkata',     fare: 1300, distance: 880,  status: 'Active' },
        { id: 17, from: 'Chennai',    to: 'Tirupati',     fare: 150,  distance: 135,  status: 'Active' },
        { id: 18, from: 'Mumbai',     to: 'Pune',         fare: 250,  distance: 150,  status: 'Active' },
        { id: 19, from: 'Delhi',      to: 'Varanasi',     fare: 1100, distance: 820,  status: 'Active' },
        { id: 20, from: 'Hyderabad',  to: 'Nizamabad',    fare: 310,  distance: 175,  status: 'Active' }
    ],
    drivers: JSON.parse(localStorage.getItem('admin-drivers')) || [
        { id: 1, name: 'Rajesh Kumar', license: 'TG-DL-001', phone: '9876543210', busId: 1, performance: '95%' },
        { id: 2, name: 'Arjun Singh', license: 'TG-DL-002', phone: '9876543211', busId: 2, performance: '92%' },
        { id: 3, name: 'Suresh Reddy', license: 'TG-DL-003', phone: '9876543212', busId: 3, performance: '88%' },
        { id: 4, name: 'Vikram Das', license: 'TG-DL-004', phone: '9876543213', busId: 4, performance: '91%' },
        { id: 5, name: 'Ramesh Patel', license: 'TG-DL-005', phone: '9876543214', busId: 5, performance: '96%' },
        { id: 6, name: 'Prakash Rao', license: 'TG-DL-006', phone: '9876543215', busId: 6, performance: '89%' },
        { id: 7, name: 'Kiran Sharma', license: 'TG-DL-007', phone: '9876543216', busId: 7, performance: '94%' },
        { id: 8, name: 'Abdul Khan', license: 'TG-DL-008', phone: '9876543217', busId: 8, performance: '93%' },
        { id: 9, name: 'Venkat Sai', license: 'TG-DL-009', phone: '9876543218', busId: 9, performance: '97%' },
        { id: 10, name: 'Karthik N', license: 'TG-DL-010', phone: '9876543219', busId: 10, performance: '90%' },
        { id: 11, name: 'Manoj Tiwari', license: 'TG-DL-011', phone: '9876543220', busId: 11, performance: '88%' },
        { id: 12, name: 'Santosh G', license: 'TG-DL-012', phone: '9876543221', busId: 12, performance: '85%' },
        { id: 13, name: 'Deepak Raj', license: 'TG-DL-013', phone: '9876543222', busId: 13, performance: '92%' },
        { id: 14, name: 'Ravi Teja', license: 'TG-DL-014', phone: '9876543223', busId: 14, performance: '94%' },
        { id: 15, name: 'Ajay Varma', license: 'TG-DL-015', phone: '9876543224', busId: 15, performance: '91%' },
        { id: 16, name: 'Pawan Kalyan', license: 'TG-DL-016', phone: '9876543225', busId: 16, performance: '98%' },
        { id: 17, name: 'Mohan Babu', license: 'TG-DL-017', phone: '9876543226', busId: 17, performance: '87%' },
        { id: 18, name: 'Sunil Kumar', license: 'TG-DL-018', phone: '9876543227', busId: 18, performance: '95%' },
        { id: 19, name: 'Anil Yadav', license: 'TG-DL-019', phone: '9876543228', busId: 19, performance: '89%' },
        { id: 20, name: 'Bhaskar Reddy', license: 'TG-DL-020', phone: '9876543229', busId: 20, performance: '96%' }
    ],
    activityLogs: JSON.parse(localStorage.getItem('admin-logs')) || [],
};

// =============================================
// INIT
// =============================================
async function fetchAdminData() {
    try {
        if (!window.supabaseClient) { console.warn('Supabase not ready'); return; }
        const { data: tickets, error } = await window.supabaseClient.from('tickets')
            .select(`
                id, ticket_id, booked_by_email, booked_by_phone, total_fare, journey_date, created_at, status,
                passengers ( name, age, gender, seat_number, pickup_location, drop_location, bus_number, status )
            `);
        if (error) { console.error('fetchAdminData error:', error.message); return; }
        if (tickets) {
            allBookingsCache = tickets.map(t => {
                const p = t.passengers && t.passengers.length > 0 ? t.passengers[0] : {};
                const busInfo = adminData.buses.find(b => b.number === p.bus_number);
                return {
                    id: t.id, ticketId: t.ticket_id, name: p.name || 'Unknown',
                    phone: t.booked_by_phone, email: t.booked_by_email,
                    pickup: p.pickup_location, drop: p.drop_location, busNumber: p.bus_number,
                    busType: busInfo?.type || 'Standard', date: t.journey_date,
                    seats: t.passengers ? t.passengers.map(px => px.seat_number) : [],
                    fare: t.total_fare, age: p.age, gender: p.gender,
                    timestamp: t.created_at, status: t.status
                };
            });
            console.log('✅ Admin data fetched:', allBookingsCache.length, 'tickets');
        } else { allBookingsCache = []; }
    } catch (err) { console.error('Error fetching admin data:', err); }
}
document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
    setupAdminLogout();
    setupAdminForms();
    setupBoardingButtons();
});


function initAdminRealtime() {
    if (!window.supabaseClient) return;
    window.supabaseClient
        .channel('public:tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
            console.log('Realtime update:', payload);
            fetchAdminData().then(() => {
                const activeTabLink = document.querySelector('.sidebar-link.active');
                if (activeTabLink) showAdminTab(activeTabLink.dataset.tab);
            });
        })
        .subscribe();
}

function checkAdminSession() {
    const session = JSON.parse(sessionStorage.getItem('userSession') || 'null');
    if (session && session.role === 'admin') {
        currentAdmin = session;
        showAdminDashboard();
    } else {
        window.location.href = 'index.html';
    }
}



async function showAdminDashboard() {

    const nameEl = document.getElementById('admin-name-display');
    if (nameEl && currentAdmin) nameEl.textContent = currentAdmin.name || currentAdmin.email;

    await fetchAdminData();
    initAdminRealtime();

    showAdminTab('dashboard');
    logAdminActivity('Logged in');
}

// =============================================
// LOGOUT
// =============================================
function setupAdminLogout() {
    const btn = document.getElementById('admin-logout-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        logAdminActivity('Logged out');
        currentAdmin = null;
        sessionStorage.removeItem('userSession');
        window.location.href = 'index.html';
    });
}

// =============================================
// TAB NAVIGATION
// =============================================
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('d-none'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    const tabEl = document.getElementById(`${tabName}-tab`);
    if (tabEl) tabEl.classList.remove('d-none');

    const linkEl = document.querySelector(`.sidebar-link[data-tab="${tabName}"]`);
    if (linkEl) linkEl.classList.add('active');

    const loaders = {
        dashboard: loadDashboard,
        bookings: loadBookingsTab,
        buses: loadBusesTab,
        routes: loadRoutesTab,
        drivers: loadDriversTab,
        payments: loadPaymentsTab,
        monitoring: loadMonitoringTab,
        boarding: loadBoardingTab,
    };
    if (loaders[tabName]) loaders[tabName]();
}

// =============================================
// SHARED: READ BOOKINGS FROM LOCALSTORAGE
// =============================================
function getSharedBookings() {
    let raw = allBookingsCache;
    let valid = raw.filter(b => b && b.ticketId && b.name && b.pickup && b.drop);
    allBookingsCache = valid;
    return allBookingsCache;
}

// =============================================
// DASHBOARD
// =============================================
function loadDashboard() {
    const bookings = getSharedBookings();
    const totalRevenue = bookings.reduce((s, b) => s + (Number(b.fare) || 500), 0);
    const totalBuses = adminData.buses.length;
    const totalSeats = totalBuses * 32;
    const bookedSeats = bookings.reduce((s, b) => s + (b.seats ? b.seats.length : 0), 0);
    const occupancy = totalSeats > 0 ? Math.min(100, Math.round((bookedSeats / totalSeats) * 100)) : 0;

    setText('total-buses', totalBuses);
    setText('total-bookings', bookings.length);
    setText('total-revenue', `₹${totalRevenue.toLocaleString('en-IN')}`);
    setText('occupancy-rate', `${occupancy}%`);

    // Recent bookings
    const recentEl = document.getElementById('recent-bookings-list');
    if (recentEl) {
        const recent = [...bookings].reverse().slice(0, 6);
        recentEl.innerHTML = recent.length > 0
            ? recent.map(b => `
                <div class="booking-item">
                    <div class="booking-item-info">
                        <div class="booking-ticket-id">${b.ticketId || 'N/A'}</div>
                        <div class="booking-passenger">${b.name || 'Unknown'}</div>
                        <div class="booking-meta">${b.pickup || ''} → ${b.drop || ''} | Seats: ${(b.seats || []).join(', ')} | ₹${b.fare || 500}</div>
                    </div>
                    <span class="badge-confirmed">Confirmed</span>
                </div>
            `).join('')
            : '<p class="empty-state">No bookings yet. User bookings will appear here.</p>';
    }

    // Fleet status
    const fleetEl = document.getElementById('fleet-status-list');
    if (fleetEl) {
        fleetEl.innerHTML = adminData.buses.map(bus => `
            <div class="fleet-item">
                <div class="fleet-bus-num">${bus.number} <span class="badge-confirmed" style="font-size:0.68rem;">${bus.status}</span></div>
                <div class="fleet-meta">${bus.type} | Cap: ${bus.capacity} | Driver: ${bus.driver} | ${bus.location}</div>
            </div>
        `).join('');
    }
}

// =============================================
// BOOKINGS TAB
// =============================================
function loadBookingsTab() {
    const bookings = getSharedBookings();
    renderBookingsTable(bookings);
}

function filterBookings() {
    const q = (document.getElementById('bookings-search')?.value || '').toLowerCase();
    const filtered = allBookingsCache.filter(b =>
        (b.ticketId || '').toLowerCase().includes(q) ||
        (b.name || '').toLowerCase().includes(q) ||
        (b.email || '').toLowerCase().includes(q) ||
        (b.phone || '').toLowerCase().includes(q)
    );
    renderBookingsTable(filtered);
}

function renderBookingsTable(bookings) {
    const content = document.getElementById('bookings-content');
    if (!content) return;

    if (bookings.length === 0) {
        content.innerHTML = `<div class="alert-info-dark">No bookings found. Bookings made by users will appear here automatically.</div>`;
        return;
    }

    content.innerHTML = `
        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Ticket ID</th>
                        <th>Passenger</th>
                        <th>Contact</th>
                        <th>Route</th>
                        <th>Seats</th>
                        <th>Date</th>
                        <th>Fare</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(b => `
                        <tr>
                            <td><span class="ticket-code">${b.ticketId || '—'}</span></td>
                            <td>
                                <strong style="color:#e0e0f8;">${b.name || '—'}</strong><br>
                                <span style="font-size:0.76rem;color:rgba(255,255,255,0.4);">${b.age || ''}${b.age ? ' yrs' : ''} ${b.gender || ''}</span>
                            </td>
                            <td style="font-size:0.82rem;">
                                ${b.email || '—'}<br>
                                <span style="color:rgba(255,255,255,0.45);">${b.phone || '—'}</span>
                            </td>
                            <td style="font-size:0.85rem;">${b.pickup || '—'} → ${b.drop || '—'}</td>
                            <td>${(b.seats || []).join(', ')}</td>
                            <td style="font-size:0.82rem;">${b.date || '—'}</td>
                            <td style="color:#7cf5c8;font-weight:700;">₹${b.fare || 500}</td>
                            <td><span class="badge-confirmed">Confirmed</span></td>
                            <td>
                                <button onclick="adminCancelBooking('${b.ticketId}')"
                                    style="background:rgba(220,53,69,0.15);color:#ff8a93;border:1px solid rgba(220,53,69,0.25);
                                           border-radius:7px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">
                                    Cancel
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:10px;font-size:0.8rem;color:rgba(255,255,255,0.3);">
            Showing ${bookings.length} booking(s)
        </div>
    `;
}

// =============================================
// BUSES TAB
// =============================================
function loadBusesTab() {
    const content = document.getElementById('buses-content');
    if (!content) return;

    content.innerHTML = `
        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead><tr><th>Bus Number</th><th>Type</th><th>Capacity</th><th>Driver</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    ${adminData.buses.map(bus => `
                        <tr>
                            <td><strong style="color:#c0cdff;">${bus.number}</strong></td>
                            <td>${bus.type}</td>
                            <td>${bus.capacity}</td>
                            <td>${bus.driver}</td>
                            <td><span class="badge-confirmed">${bus.status}</span></td>
                            <td>
                                <button onclick="adminDeleteBus(${bus.id})"
                                        style="background:rgba(220,53,69,0.15);color:#ff8a93;border:1px solid rgba(220,53,69,0.25);
                                               border-radius:7px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// ROUTES TAB
// =============================================
function loadRoutesTab() {
    const content = document.getElementById('routes-content');
    if (!content) return;

    content.innerHTML = `
        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead><tr><th>From</th><th>To</th><th>Fare</th><th>Distance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    ${adminData.routes.map(r => `
                        <tr>
                            <td>${r.from_city || r.from}</td>
                            <td>${r.to_city || r.to}</td>
                            <td style="color:#7cf5c8;font-weight:700;">₹${r.fare}</td>
                            <td>${r.distance} km</td>
                            <td><span class="badge-confirmed">${r.status}</span></td>
                            <td>
                                <button onclick="adminDeleteRoute(${r.id})"
                                        style="background:rgba(220,53,69,0.15);color:#ff8a93;border:1px solid rgba(220,53,69,0.25);
                                               border-radius:7px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// DRIVERS TAB
// =============================================
function loadDriversTab() {
    const content = document.getElementById('drivers-content');
    if (!content) return;

    content.innerHTML = `
        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead><tr><th>Name</th><th>License</th><th>Phone</th><th>Assigned Bus</th><th>Performance</th><th>Action</th></tr></thead>
                <tbody>
                    ${adminData.drivers.map(d => `
                        <tr>
                            <td><strong style="color:#e0e0f8;">${d.name}</strong></td>
                            <td style="font-family:monospace;color:#a0b4ff;">${d.license}</td>
                            <td>${d.phone}</td>
                            <td>${adminData.buses.find(b => b.id === d.busId)?.number || '—'}</td>
                            <td><span class="badge-info">${d.performance}</span></td>
                            <td>
                                <button onclick="adminDeleteDriver(${d.id})"
                                        style="background:rgba(220,53,69,0.15);color:#ff8a93;border:1px solid rgba(220,53,69,0.25);
                                               border-radius:7px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// PAYMENTS/REVENUE TAB
// =============================================
function loadPaymentsTab() {
    const content = document.getElementById('payments-content');
    if (!content) return;
    const bookings = getSharedBookings();

    const totalRevenue = bookings.reduce((s, b) => s + (Number(b.fare) || 500), 0);
    const avgFare = bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0;
    const maxFare = bookings.length > 0 ? Math.max(...bookings.map(b => Number(b.fare) || 500)) : 0;

    content.innerHTML = `
        <div class="revenue-stats">
            <div class="revenue-stat">
                <div class="label">Total Revenue</div>
                <div class="value">₹${totalRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div class="revenue-stat">
                <div class="label">Bookings</div>
                <div class="value">${bookings.length}</div>
            </div>
            <div class="revenue-stat">
                <div class="label">Avg. Fare</div>
                <div class="value">₹${avgFare.toLocaleString('en-IN')}</div>
            </div>
            <div class="revenue-stat">
                <div class="label">Highest Fare</div>
                <div class="value">₹${maxFare.toLocaleString('en-IN')}</div>
            </div>
        </div>

        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead><tr><th>Ticket ID</th><th>Passenger</th><th>Route</th><th>Fare</th><th>Booking Date</th><th>Status</th></tr></thead>
                <tbody>
                    ${bookings.length > 0
            ? [...bookings].reverse().map(b => `
                            <tr>
                                <td><span class="ticket-code">${b.ticketId || '—'}</span></td>
                                <td>${b.name || '—'}</td>
                                <td style="font-size:0.82rem;">${b.pickup || '—'} → ${b.drop || '—'}</td>
                                <td style="color:#7cf5c8;font-weight:700;">₹${b.fare || 500}</td>
                                <td style="font-size:0.82rem;">${b.bookingDate || b.date || '—'}</td>
                                <td><span class="badge-confirmed">Completed</span></td>
                            </tr>
                        `).join('')
            : '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.3);padding:24px;">No transactions yet</td></tr>'
        }
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// MONITORING TAB
// =============================================
function loadMonitoringTab() {
    const content = document.getElementById('monitoring-content');
    if (!content) return;

    content.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div>
                <h5 class="section-title">🚌 Fleet Live Status</h5>
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead><tr><th>Bus</th><th>Driver</th><th>Location</th><th>Status</th></tr></thead>
                        <tbody>
                            ${adminData.buses.map(bus => `
                                <tr>
                                    <td><strong style="color:#c0cdff;">${bus.number}</strong></td>
                                    <td>${bus.driver}</td>
                                    <td>${bus.location}</td>
                                    <td><span class="badge-confirmed">Running</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <h5 class="section-title">📊 Fleet Summary</h5>
                <div class="dash-card">
                    <div class="dash-card-body">
                        <div class="fleet-item">
                            <div class="fleet-bus-num">Total Buses</div>
                            <div class="fleet-meta" style="font-size:1.2rem;color:#7eb8ff;font-weight:800;">${adminData.buses.length}</div>
                        </div>
                        <div class="fleet-item">
                            <div class="fleet-bus-num">Active Routes</div>
                            <div class="fleet-meta" style="font-size:1.2rem;color:#7cf5c8;font-weight:800;">${adminData.routes.length}</div>
                        </div>
                        <div class="fleet-item">
                            <div class="fleet-bus-num">Registered Drivers</div>
                            <div class="fleet-meta" style="font-size:1.2rem;color:#c9b8ff;font-weight:800;">${adminData.drivers.length}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================
// BOARDING TAB
// =============================================
function loadBoardingTab() {
    updateBoardingList();
}

function setupBoardingButtons() {
    document.addEventListener('click', e => {
        if (e.target?.id === 'start-scanner') {
            e.target.disabled = true;
            const stopBtn = document.getElementById('stop-scanner');
            if (stopBtn) stopBtn.disabled = false;
            startAdminQRScanner();
        }
        if (e.target?.id === 'stop-scanner') {
            stopAdminQRScanner();
            const startBtn = document.getElementById('start-scanner');
            if (startBtn) startBtn.disabled = false;
            e.target.disabled = true;
        }
    });
}

function startAdminQRScanner() {
    const el = document.getElementById('qr-reader');
    if (!el) return;
    try {
        adminQrScanner = new Html5Qrcode('qr-reader');
        adminQrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            text => {
                let ticketId = text;
                if (text.includes('Ticket:')) ticketId = text.split('Ticket: ')[1].split('\n')[0].trim();
                const inp = document.getElementById('ticket-id-input');
                if (inp) inp.value = ticketId;
                adminValidateBoardingTicket();
            },
            err => console.log('QR scan:', err)
        ).catch(err => {
            console.error('Camera error:', err);
            alert('Unable to access camera. Use manual entry.');
            stopAdminQRScanner();
        });
    } catch (err) {
        console.error('Scanner init error:', err);
    }
}

function stopAdminQRScanner() {
    if (adminQrScanner && adminQrScanner.isScanning) {
        adminQrScanner.stop().catch(err => console.error('Stop error:', err));
        adminQrScanner = null;
    }
}

async function adminValidateBoardingTicket() {
    const inp = document.getElementById('ticket-id-input');
    const resultDiv = document.getElementById('boarding-result');
    if (!inp || !resultDiv) return;

    const ticketId = inp.value.trim();
    if (!ticketId) { resultDiv.innerHTML = `<div class="alert-warning-dark">⚠️ Please enter a Ticket ID.</div>`; return; }

    const bookings = getSharedBookings();
    const booking = bookings.find(b => b.ticketId === ticketId);
    if (!booking) { resultDiv.innerHTML = `<div class="alert-error-dark">❌ Invalid Ticket ID: <strong>${ticketId}</strong></div>`; inp.value = ''; return; }

    const boarded = JSON.parse(localStorage.getItem('boardedPassengers') || '[]');
    if (boarded.find(p => p.ticketId === ticketId)) {
        resultDiv.innerHTML = `<div class="alert-warning-dark">⚠️ Already boarded: <strong>${booking.name}</strong></div>`;
        return;
    }

    const record = {
        ticketId: booking.ticketId,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        seats: booking.seats,
        boardingTime: new Date().toLocaleTimeString('en-IN'),
        boardingDate: new Date().toLocaleDateString('en-IN'),
    };
    boarded.push(record);
    localStorage.setItem('boardedPassengers', JSON.stringify(boarded));

    resultDiv.innerHTML = `
        <div class="alert-success-dark">
            ✅ <strong>Boarded!</strong> ${booking.name}<br>
            Seats: ${(booking.seats || []).join(', ')} | ${record.boardingTime}
        </div>
    `;
    inp.value = '';
    updateBoardingList();
}

async function updateBoardingList() {
    const listDiv = document.getElementById('boarding-list');
    if (!listDiv) return;
    const boarded = JSON.parse(localStorage.getItem('boardedPassengers') || '[]');

    if (boarded.length === 0) {
        listDiv.innerHTML = '<p class="empty-state" style="padding:16px;">No passengers boarded yet.</p>';
        return;
    }

    listDiv.innerHTML = `
        <div class="admin-table-wrapper">
            <table class="admin-table">
                <thead class="table-dark">
                    <tr><th>Ticket ID</th><th>Passenger</th><th>Seats</th><th>Boarding Time</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${boarded.map(p => `
                        <tr>
                            <td><span class="ticket-code">${p.ticketId}</span></td>
                            <td>${p.name}</td>
                            <td>${(p.seats || []).join(', ')}</td>
                            <td>${p.boardingTime}</td>
                            <td>
                                <button onclick="adminRemoveBoardedPassenger('${p.ticketId}')"
                                        style="background:rgba(220,53,69,0.15);color:#ff8a93;border:1px solid rgba(220,53,69,0.25);
                                               border-radius:7px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">Remove</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:10px;font-size:0.82rem;color:rgba(255,255,255,0.4);">
            Total boarded: <strong style="color:#7cf5c8;">${boarded.length}</strong> passenger(s)
        </div>
    `;
}

async function adminRemoveBoardedPassenger(ticketId) {
    let boarded = JSON.parse(localStorage.getItem('boardedPassengers') || '[]');
    boarded = boarded.filter(p => p.ticketId !== ticketId);
    localStorage.setItem('boardedPassengers', JSON.stringify(boarded));
    updateBoardingList();
}

// =============================================
// CRUD ACTIONS
// =============================================
async function adminCancelBooking(ticketId) {
    if (!confirm(`Cancel booking ${ticketId}? This cannot be undone.`)) return;
    try {
        if (!window.supabaseClient) { alert('DB not ready'); return; }
        await window.supabaseClient.from('tickets').update({ status: 'Cancelled' }).eq('ticket_id', ticketId);
        await window.supabaseClient.from('passengers').update({ status: 'Cancelled' }).eq('ticket_id', ticketId);
        const { data: paxData } = await window.supabaseClient.from('passengers')
            .select('bus_number, journey_date, seat_number').eq('ticket_id', ticketId);
        if (paxData && paxData.length > 0) {
            for (const pax of paxData) {
                await window.supabaseClient.from('seats').delete().match({
                    bus_number: pax.bus_number, journey_date: pax.journey_date, seat_number: pax.seat_number
                });
            }
        }
        logAdminActivity(`Cancelled booking: ${ticketId}`);
        await fetchAdminData();
        loadBookingsTab();
        loadDashboard();
    } catch (err) {
        console.error('Error cancelling booking:', err);
        alert('Error cancelling booking.');
    }
}

function adminDeleteBus(id) {
    if (!confirm('Delete this bus?')) return;
    adminData.buses = adminData.buses.filter(b => b.id !== id);
    saveBusesToStorage();
    loadBusesTab();
    logAdminActivity(`Deleted bus id: ${id}`);
}

function adminDeleteRoute(id) {
    if (!confirm('Delete this route?')) return;
    adminData.routes = adminData.routes.filter(r => r.id !== id);
    saveRoutesToStorage();
    loadRoutesTab();
}

function adminDeleteDriver(id) {
    if (!confirm('Delete this driver?')) return;
    adminData.drivers = adminData.drivers.filter(d => d.id !== id);
    saveDriversToStorage();
    loadDriversTab();
}

// =============================================
// FORM HANDLERS
// =============================================
function setupAdminForms() {
    const addBusForm = document.getElementById('add-bus-form');
    if (addBusForm) {
        addBusForm.addEventListener('submit', e => {
            e.preventDefault();
            adminData.buses.push({
                id: Date.now(),
                number: document.getElementById('bus-number').value.trim(),
                type: document.getElementById('bus-model').value.trim(),
                capacity: parseInt(document.getElementById('bus-capacity').value),
                driver: document.getElementById('bus-driver').value.trim(),
                status: 'Active', location: 'Base Station',
            });
            saveBusesToStorage(); loadBusesTab();
            addBusForm.classList.add('d-none'); addBusForm.reset();
        });
    }

    const addRouteForm = document.getElementById('add-route-form');
    if (addRouteForm) {
        addRouteForm.addEventListener('submit', e => {
            e.preventDefault();
            adminData.routes.push({
                id: Date.now(),
                from: document.getElementById('route-from').value.trim(),
                to: document.getElementById('route-to').value.trim(),
                fare: parseInt(document.getElementById('route-fare').value),
                distance: parseInt(document.getElementById('route-distance').value),
                status: 'Active',
            });
            saveRoutesToStorage(); loadRoutesTab();
            addRouteForm.classList.add('d-none'); addRouteForm.reset();
        });
    }

    const addDriverForm = document.getElementById('add-driver-form');
    if (addDriverForm) {
        addDriverForm.addEventListener('submit', e => {
            e.preventDefault();
            adminData.drivers.push({
                id: Date.now(),
                name: document.getElementById('driver-name').value.trim(),
                license: document.getElementById('driver-license').value.trim(),
                phone: document.getElementById('driver-phone').value.trim(),
                busId: adminData.buses[0]?.id || null,
                performance: '90%',
            });
            saveDriversToStorage(); loadDriversTab();
            addDriverForm.classList.add('d-none'); addDriverForm.reset();
        });
    }
}

function showAddBusForm() { document.getElementById('add-bus-form').classList.remove('d-none'); }
function hideAddBusForm() { document.getElementById('add-bus-form').classList.add('d-none'); }
function showAddRouteForm() { document.getElementById('add-route-form').classList.remove('d-none'); }
function hideAddRouteForm() { document.getElementById('add-route-form').classList.add('d-none'); }
function showAddDriverForm() { document.getElementById('add-driver-form').classList.remove('d-none'); }
function hideAddDriverForm() { document.getElementById('add-driver-form').classList.add('d-none'); }

// =============================================
// STORAGE
// =============================================
function saveBusesToStorage() { localStorage.setItem('admin-buses', JSON.stringify(adminData.buses)); }
function saveRoutesToStorage() { localStorage.setItem('admin-routes', JSON.stringify(adminData.routes)); }
function saveDriversToStorage() { localStorage.setItem('admin-drivers', JSON.stringify(adminData.drivers)); }
function logAdminActivity(action) { 
    const logs = JSON.parse(localStorage.getItem('admin-logs') || '[]');
    logs.push({ timestamp: new Date().toISOString(), action, admin: currentAdmin?.email });
    localStorage.setItem('admin-logs', JSON.stringify(logs.slice(-50)));
}

// =============================================
// UTILITY
// =============================================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// =============================================
// TICKET LOOKUP
// =============================================
function adminLookupTicket() {
    const input = document.getElementById('admin-ticket-lookup-input');
    const resultDiv = document.getElementById('admin-ticket-lookup-result');
    if (!input || !resultDiv) return;

    const query = input.value.trim().toUpperCase();
    if (!query) {
        resultDiv.innerHTML = '<span class="text-danger">Please enter a ticket ID.</span>';
        return;
    }

    const bookings = getSharedBookings();
    const b = bookings.find(x => x.ticketId === query);

    if (!b) {
        resultDiv.innerHTML = `<span class="text-danger">Ticket ${query} not found.</span>`;
        return;
    }

    resultDiv.innerHTML = `
        <div style="background: white; padding: 16px; border-radius: 8px; width: 100%; border: 1px solid #eee; margin-top: 10px;">
            <h5 style="color: #1a1a2e; margin-bottom: 12px;">✅ Ticket Found: ${b.ticketId}</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                <div><strong>Passenger:</strong> ${b.name} (${b.age} ${b.gender})</div>
                <div><strong>Contact:</strong> ${b.phone} | ${b.email}</div>
                <div><strong>Route:</strong> ${b.pickup} → ${b.drop}</div>
                <div><strong>Bus:</strong> ${b.busNumber} (${b.busType})</div>
                <div><strong>Seats:</strong> ${(b.seats || []).join(', ')}</div>
                <div><strong>Booked On:</strong> ${b.timestamp ? new Date(b.timestamp).toLocaleString('en-IN') : b.date || '—'}</div>
                <div><strong>Fare:</strong> ₹${b.fare}</div>
                <div><strong>Booked On:</strong> ${b.bookingDate}</div>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-outline-danger" onclick="adminCancelBooking('${b.ticketId}'); adminLookupTicket();">❌ Cancel This Booking</button>
            </div>
        </div>
    `;
}
