// =============================================
// DRIVER DASHBOARD — Full Functional Model
// Loads driver info from admin-drivers list
// Shows assigned bus, passengers, routes
// Handles boarding, QR scan, stop progression
// =============================================

// ---- ADMIN DATA (Mirror of admin.js) ----
// The 6 test route combinations — Bus #1 to Bus #6
const ADMIN_BUSES = JSON.parse(localStorage.getItem('admin-buses')) || [
    // ✅ Route 1: Hyderabad → Tirupati — as requested
    { id: 1,  number: 'TS09AB1001', type: 'AC Sleeper',   capacity: 32, driver: 'Rajesh Kumar',
      route: 'Hyderabad → Tirupati', from: 'Hyderabad', to: 'Tirupati', status: 'Active',
      stops: ['LB Nagar', 'Nalgonda', 'Miryalguda', 'Nagarjunasagar', 'Guntur', 'Vijayawada', 'Tenali', 'Chirala', 'Ongole', 'Kavali', 'Nellore', 'Gudur', 'Puttur', 'Tirupati Bus Stand']},

    // Route 2: Hyderabad → Warangal
    { id: 2,  number: 'TS09AB1002', type: 'Non-AC',       capacity: 40, driver: 'Arjun Singh',
      route: 'Hyderabad → Warangal', from: 'Hyderabad', to: 'Warangal', status: 'Active',
      stops: ['MGBS Hyderabad', 'Uppal', 'Ghatkesar', 'Bhongir', 'Aler', 'Jangaon', 'Station Ghanpur', 'Warangal']},

    // Route 3: Bengaluru → Mysuru
    { id: 3,  number: 'TS09AB1003', type: 'AC Seater',    capacity: 32, driver: 'Suresh Reddy',
      route: 'Bengaluru → Mysuru', from: 'Bengaluru', to: 'Mysuru', status: 'Active',
      stops: ['Kempegowda Bus Stand', 'Jayanagar', 'Kengeri', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Srirangapatna', 'Mysuru']},

    // Route 4: Chennai → Pondicherry
    { id: 4,  number: 'TS09AB1004', type: 'Semi-Sleeper', capacity: 45, driver: 'Vikram Das',
      route: 'Chennai → Pondicherry', from: 'Chennai', to: 'Pondicherry', status: 'Active',
      stops: ['Chennai CMBT', 'Tambaram', 'Chengalpattu', 'Mahabalipuram', 'Chinglepet', 'Tindivanam', 'Villupuram', 'Pondicherry']},

    // Route 5: Mumbai → Nashik
    { id: 5,  number: 'TS09AB1005', type: 'Deluxe AC',    capacity: 30, driver: 'Ramesh Patel',
      route: 'Mumbai → Nashik', from: 'Mumbai', to: 'Nashik', status: 'Active',
      stops: ['Dadar Mumbai', 'Thane', 'Bhiwandi', 'Shahapur', 'Khardi', 'Igatpuri', 'Ghoti', 'Nashik CBS']},

    // Route 6: Delhi → Jaipur
    { id: 6,  number: 'TS09AB1006', type: 'AC Sleeper',   capacity: 32, driver: 'Prakash Rao',
      route: 'Delhi → Jaipur', from: 'Delhi', to: 'Jaipur', status: 'Active',
      stops: ['Kashmere Gate Delhi', 'NH-48 Gurgaon', 'Manesar', 'Dharuhera', 'Rewari', 'Kotputli', 'Shahpura', 'Jaipur Sindhi Camp']},

    // Remaining buses (7–20 — generic, no dedicated route)
    { id: 7,  number: 'TS09AB1007', type: 'Non-AC',       capacity: 40, driver: 'Kiran Sharma',  status: 'Active', from: 'Hyderabad', to: 'Pune',          stops: ['Hyderabad', 'Pune'] },
    { id: 8,  number: 'TS09AB1008', type: 'AC Seater',    capacity: 32, driver: 'Abdul Khan',    status: 'Active', from: 'Hyderabad', to: 'Nagpur',        stops: ['Hyderabad', 'Nagpur'] },
    { id: 9,  number: 'TS09AB1009', type: 'Semi-Sleeper', capacity: 45, driver: 'Venkat Sai',    status: 'Active', from: 'Bengaluru', to: 'Chennai',       stops: ['Bengaluru', 'Chennai'] },
    { id: 10, number: 'TS09AB1010', type: 'Deluxe AC',    capacity: 30, driver: 'Karthik N',     status: 'Active', from: 'Bengaluru', to: 'Mumbai',        stops: ['Bengaluru', 'Mumbai'] },
    { id: 11, number: 'TS09AB1011', type: 'AC Sleeper',   capacity: 32, driver: 'Manoj Tiwari',  status: 'Active', from: 'Vijayawada', to: 'Visakhapatnam',stops: ['Vijayawada', 'Visakhapatnam'] },
    { id: 12, number: 'TS09AB1012', type: 'Non-AC',       capacity: 40, driver: 'Santosh G',     status: 'Active', from: 'Visakhapatnam', to: 'Kolkata',   stops: ['Visakhapatnam', 'Kolkata'] },
    { id: 13, number: 'TS09AB1013', type: 'AC Seater',    capacity: 32, driver: 'Deepak Raj',    status: 'Active', from: 'Chennai', to: 'Tirupati',        stops: ['Chennai', 'Tirupati'] },
    { id: 14, number: 'TS09AB1014', type: 'Semi-Sleeper', capacity: 45, driver: 'Ravi Teja',     status: 'Active', from: 'Mumbai', to: 'Pune',             stops: ['Mumbai', 'Pune'] },
    { id: 15, number: 'TS09AB1015', type: 'Deluxe AC',    capacity: 30, driver: 'Ajay Varma',    status: 'Active', from: 'Delhi', to: 'Varanasi',          stops: ['Delhi', 'Varanasi'] },
    { id: 16, number: 'TS09AB1016', type: 'AC Sleeper',   capacity: 32, driver: 'Pawan Kalyan',  status: 'Active', from: 'Pune', to: 'Aurangabad',         stops: ['Pune', 'Aurangabad'] },
    { id: 17, number: 'TS09AB1017', type: 'Non-AC',       capacity: 40, driver: 'Mohan Babu',    status: 'Active', from: 'Nagpur', to: 'Nanded',           stops: ['Nagpur', 'Nanded'] },
    { id: 18, number: 'TS09AB1018', type: 'AC Seater',    capacity: 32, driver: 'Sunil Kumar',   status: 'Active', from: 'Hyderabad', to: 'Nizamabad',     stops: ['Hyderabad', 'Nizamabad'] },
    { id: 19, number: 'TS09AB1019', type: 'Semi-Sleeper', capacity: 45, driver: 'Anil Yadav',    status: 'Active', from: 'Hyderabad', to: 'Adilabad',      stops: ['Hyderabad', 'Adilabad'] },
    { id: 20, number: 'TS09AB1020', type: 'Deluxe AC',    capacity: 30, driver: 'Bhaskar Reddy', status: 'Active', from: 'Hyderabad', to: 'Kurnool',       stops: ['Hyderabad', 'Kurnool'] },
];


const ADMIN_DRIVERS = JSON.parse(localStorage.getItem('admin-drivers')) || [
    { id:  1, name: 'Rajesh Kumar',  license: 'TG-DL-001', phone: '9876543210', busId:  1, performance: '95%' },
    { id:  2, name: 'Arjun Singh',   license: 'TG-DL-002', phone: '9876543211', busId:  2, performance: '92%' },
    { id:  3, name: 'Suresh Reddy',  license: 'TG-DL-003', phone: '9876543212', busId:  3, performance: '88%' },
    { id:  4, name: 'Vikram Das',    license: 'TG-DL-004', phone: '9876543213', busId:  4, performance: '91%' },
    { id:  5, name: 'Ramesh Patel',  license: 'TG-DL-005', phone: '9876543214', busId:  5, performance: '96%' },
    { id:  6, name: 'Prakash Rao',   license: 'TG-DL-006', phone: '9876543215', busId:  6, performance: '89%' },
    { id:  7, name: 'Kiran Sharma',  license: 'TG-DL-007', phone: '9876543216', busId:  7, performance: '94%' },
    { id:  8, name: 'Abdul Khan',    license: 'TG-DL-008', phone: '9876543217', busId:  8, performance: '93%' },
    { id:  9, name: 'Venkat Sai',    license: 'TG-DL-009', phone: '9876543218', busId:  9, performance: '97%' },
    { id: 10, name: 'Karthik N',     license: 'TG-DL-010', phone: '9876543219', busId: 10, performance: '90%' },
    { id: 11, name: 'Manoj Tiwari',  license: 'TG-DL-011', phone: '9876543220', busId: 11, performance: '88%' },
    { id: 12, name: 'Santosh G',     license: 'TG-DL-012', phone: '9876543221', busId: 12, performance: '85%' },
    { id: 13, name: 'Deepak Raj',    license: 'TG-DL-013', phone: '9876543222', busId: 13, performance: '92%' },
    { id: 14, name: 'Ravi Teja',     license: 'TG-DL-014', phone: '9876543223', busId: 14, performance: '94%' },
    { id: 15, name: 'Ajay Varma',    license: 'TG-DL-015', phone: '9876543224', busId: 15, performance: '91%' },
    { id: 16, name: 'Pawan Kalyan',  license: 'TG-DL-016', phone: '9876543225', busId: 16, performance: '98%' },
    { id: 17, name: 'Mohan Babu',    license: 'TG-DL-017', phone: '9876543226', busId: 17, performance: '87%' },
    { id: 18, name: 'Sunil Kumar',   license: 'TG-DL-018', phone: '9876543227', busId: 18, performance: '95%' },
    { id: 19, name: 'Anil Yadav',    license: 'TG-DL-019', phone: '9876543228', busId: 19, performance: '89%' },
    { id: 20, name: 'Bhaskar Reddy', license: 'TG-DL-020', phone: '9876543229', busId: 20, performance: '96%' },
];

// ---- STATE ----
const TOTAL_SEATS = 32;
let currentDriver = null;
let assignedBus    = null;
let driverStops    = [];
let currentStopIndex = 0;
let allPassengersCache = [];
let qrScanner     = null;
let scannerActive  = false;

// =============================================
// DB HELPER
// =============================================
const LocalDB = {
    getAllBookings: async () => {
        if (!window.supabaseClient) return [];
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { data } = await window.supabaseClient
            .from('passengers').select('*').eq('journey_date', today);
        return data ? data.map(p => ({
            id: p.id, ticketId: p.ticket_id, name: p.name,
            seat: p.seat_number, seats: [p.seat_number],
            pickup: p.pickup_location, drop: p.drop_location,
            busNumber: p.bus_number, status: p.status,
            journeyDate: p.journey_date
        })) : [];
    }
};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeDriver();
});

function initializeDriver() {
    const sessionUser = JSON.parse(sessionStorage.getItem('userSession') || 'null');
    if (!sessionUser || sessionUser.role !== 'driver') {
        alert('Unauthorized. Please login as a driver.');
        window.location.href = 'index.html';
        return;
    }

    // Find matching driver in admin list by phone or license
    currentDriver = ADMIN_DRIVERS.find(d =>
        d.phone === sessionUser.phone ||
        d.license === sessionUser.license_no ||
        d.name.toLowerCase() === sessionUser.name?.toLowerCase()
    ) || {
        id: 0, name: sessionUser.name || 'Driver',
        license: sessionUser.license_no || '—',
        phone: sessionUser.phone || '—',
        busId: null, performance: 'N/A'
    };

    // Find assigned bus
    assignedBus = ADMIN_BUSES.find(b => b.id === currentDriver.busId) || null;

    // Build dynamic stops from bus route
    if (assignedBus && Array.isArray(assignedBus.stops) && assignedBus.stops.length > 1) {
        // Use the detailed stops defined in the bus data
        driverStops = assignedBus.stops;
    } else if (assignedBus) {
        // Fallback: auto-generate 5 generic stops
        driverStops = [
            assignedBus.from,
            `${assignedBus.from} Outskirts`,
            'Halfway Point',
            `${assignedBus.to} Outskirts`,
            assignedBus.to,
        ];
    } else {
        driverStops = ['Depot', 'Stop 1', 'Stop 2', 'Destination'];
    }

    renderDriverProfile();
    createSeatLayout();
    updateStopDisplay();
    initDriverRealtime();
    refreshDriverBookings();
}

// =============================================
// RENDER DRIVER PROFILE
// =============================================
function renderDriverProfile() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setEl('driverName',    currentDriver.name);
    setEl('driverLicense', currentDriver.license);
    setEl('driverPhone',   currentDriver.phone);
    setEl('driverPerf',    currentDriver.performance || 'N/A');

    if (assignedBus) {
        const CITY_MAP = {
            'lb nagar': 'Hyderabad',
            'mgbs hyderabad': 'Hyderabad',
            'uppal': 'Hyderabad',
            'dilsukhnagar': 'Hyderabad',
            'mehdipatnam': 'Hyderabad',
            'kukatpally': 'Hyderabad',
            'secunderabad': 'Hyderabad',
            'miyapur': 'Hyderabad',
            'tirupati bus stand': 'Tirupati',
            'dadar mumbai': 'Mumbai',
            'kempegowda bus stand': 'Bengaluru',
            'chennai cmbt': 'Chennai',
            'nashik cbs': 'Nashik',
            'jaipur sindhi camp': 'Jaipur'
        };

        const getCity = (stop) => CITY_MAP[stop.toLowerCase()] || stop;
        const fromCity = getCity(assignedBus.from);
        const toCity = getCity(assignedBus.to);

        setEl('driverBusNumber', assignedBus.number);
        setEl('driverBusType',   assignedBus.type);
        setEl('driverRoute',     `${fromCity} → ${toCity}`);
        setEl('driverCapacity',  assignedBus.capacity + ' seats');
        setEl('busStatusBadge',  assignedBus.status);
    } else {
        setEl('driverRoute', 'No bus assigned. Contact admin.');
        setEl('driverBusNumber', '—');
    }
}

// =============================================
// SEAT LAYOUT — 32 SEATS (4 per row, 8 rows)
// =============================================
function createSeatLayout() {
    const layout = document.getElementById('seatLayout');
    if (!layout) return;

    let rows = '';
    for (let row = 1; row <= 8; row++) {
        rows += `
        <div class="seat-row">
            <div class="row-number">${row}</div>
            <div class="seats-in-row">
                <div class="seat-wrapper">
                    <button class="seat-btn available" data-seat="${row}A" onclick="showSeatInfo(this)">${row}A</button>
                </div>
                <div class="seat-wrapper">
                    <button class="seat-btn available" data-seat="${row}B" onclick="showSeatInfo(this)">${row}B</button>
                </div>
                <div class="aisle-gap"></div>
                <div class="seat-wrapper">
                    <button class="seat-btn available" data-seat="${row}C" onclick="showSeatInfo(this)">${row}C</button>
                </div>
                <div class="seat-wrapper">
                    <button class="seat-btn available" data-seat="${row}D" onclick="showSeatInfo(this)">${row}D</button>
                </div>
            </div>
        </div>`;
    }

    layout.innerHTML = `
        <div class="bus-interior">
            <div class="seats-section">
                <div class="seats-header">
                    <div class="side-label left-side">Left ← Window</div>
                    <div class="side-label right-side">Window → Right</div>
                </div>
                ${rows}
            </div>
        </div>
        <div class="seat-legend-modern">
            <div class="legend-item"><div class="legend-seat available"></div><span>Available</span></div>
            <div class="legend-item"><div class="legend-seat booked"></div><span>Booked</span></div>
            <div class="legend-item"><div class="legend-seat boarded"></div><span>Boarded ✅</span></div>
            <div class="legend-item"><div class="legend-seat dropped"></div><span>Dropped 🏁</span></div>
        </div>`;
}

// =============================================
// SHOW SEAT PASSENGER INFO ON CLICK
// =============================================
function showSeatInfo(btn) {
    const seatId = btn.dataset.seat;
    const busNum = assignedBus ? assignedBus.number : null;
    const passenger = allPassengersCache.find(p =>
        p.seat === seatId && (!busNum || p.busNumber === busNum)
    );

    const infoBox = document.getElementById('seatInfoBox');
    if (!infoBox) return;

    if (!passenger) {
        infoBox.innerHTML = `<p class="text-muted">💺 Seat <b>${seatId}</b> is empty.</p>`;
        return;
    }

    infoBox.innerHTML = `
        <div class="passenger-info-card">
            <h6>💺 Seat ${seatId} — ${passenger.status}</h6>
            <p>👤 <b>${passenger.name}</b></p>
            <p>🎟 Ticket: <code>${passenger.ticketId}</code></p>
            <p>📍 ${passenger.pickup} → ${passenger.drop}</p>
            <p>📅 Journey: ${passenger.journeyDate || '—'}</p>
            ${passenger.status === 'Booked' ?
                `<button class="btn btn-sm btn-success mt-1" onclick="boardByTicket('${passenger.ticketId}')">✅ Board Now</button>` :
                passenger.status === 'Boarded' ?
                `<button class="btn btn-sm btn-warning mt-1" onclick="manualDrop('${passenger.ticketId}')">🏁 Mark Dropped</button>` : ''
            }
        </div>`;
}

// =============================================
// REAL-TIME SUBSCRIPTION
// =============================================
function initDriverRealtime() {
    if (!window.supabaseClient) return;
    window.supabaseClient
        .channel('driver-passengers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'passengers' }, async () => {
            await refreshDriverBookings();
        })
        .subscribe();
}

// =============================================
// REFRESH BOOKINGS & SEAT MAP
// =============================================
async function refreshDriverBookings() {
    const allBookings = await LocalDB.getAllBookings();

    // Filter to this bus only (if bus assigned)
    const busNum = assignedBus ? assignedBus.number : null;
    allPassengersCache = busNum
        ? allBookings.filter(p => p.busNumber === busNum)
        : allBookings;

    // Reset all seats
    document.querySelectorAll('.seat-btn').forEach(btn => {
        btn.className = 'seat-btn available';
    });

    // Apply passenger statuses and collect unique custom stops
    const passengerCustomStops = new Set();

    allPassengersCache.forEach(p => {
        // Collect active drops and pickups to ensure driver stops there
        if (p.status === 'Booked' || p.status === 'Boarded') {
            passengerCustomStops.add(p.pickup);
            passengerCustomStops.add(p.drop);
        }

        if (p.status === 'Cancelled') return;
        const btn = document.querySelector(`[data-seat="${p.seat}"]`);
        if (btn) {
            btn.className = 'seat-btn ' + (
                p.status === 'Boarded' ? 'boarded' :
                p.status === 'Dropped' ? 'dropped' : 'booked'
            );
            // Add symbol if dropped
            if (p.status === 'Dropped') {
                btn.innerHTML = `${p.seat} <span class="drop-symbol">🏁</span>`;
            } else {
                btn.innerText = p.seat;
            }
        }
    });

    // DYNAMICALLY MERGE PASSENGER STOPS INTO THE ROUTE Sequence
    // This allows the driver to see stops that passengers booked from the static dropdown 
    // but the admin didn't explicitly add to the route!
    if (assignedBus) {
        let baseStops = (Array.isArray(assignedBus.stops) && assignedBus.stops.length > 1) 
            ? [...assignedBus.stops] 
            : [assignedBus.from, 'Halfway Point', assignedBus.to];
        
        const missingStops = Array.from(passengerCustomStops).filter(s => !baseStops.includes(s));
        
        if (missingStops.length > 0 && baseStops.length >= 2) {
            // Insert missing stops right before the final destination
            const finalStop = baseStops.pop();
            driverStops = [...baseStops, ...missingStops, finalStop];
        } else if (missingStops.length > 0) {
            driverStops = [...baseStops, ...missingStops];
        } else {
            driverStops = baseStops;
        }
    }

    updateDashboardStats();
    updateStopDisplay(); // Re-render the stop line with the new injected stops
    renderPassengerList();
}

// =============================================
// UPDATE STATS
// =============================================
function updateDashboardStats() {
    const busNum = assignedBus ? assignedBus.number : null;
    const capacity = assignedBus ? assignedBus.capacity : TOTAL_SEATS;
    
    // Explicitly track passengers using the index condition: pickup_stop_order <= current_stop_order < drop_stop_order
    const active = allPassengersCache.filter(p => p.status === 'Boarded');
    const booked  = allPassengersCache.filter(p => p.status === 'Booked');
    const dropped = allPassengersCache.filter(p => p.status === 'Dropped');
    const total   = active.length + booked.length;
    const avail   = capacity - total;
    const occ     = Math.round((active.length / capacity) * 100);

    const s = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    s('passengers',      active.length);
    s('availableSeats',  avail);
    s('occupancyPercent', occ + '%');
    s('bookedCount',     booked.length);
    s('droppedCount',    dropped.length);
    s('totalCapacity',   capacity);

    // Who's dropping at next stop?
    const nextStopName = driverStops[currentStopIndex + 1] || '';
    if (nextStopName) {
        const droppingNext = active.filter(p => 
            (p.drop || '').toLowerCase().includes(nextStopName.toLowerCase()) || 
            nextStopName.toLowerCase().includes((p.drop || '').toLowerCase())
        );
        if (droppingNext.length > 0) {
            s('droppingNext', 'Seats: ' + droppingNext.map(p => p.seat).join(', '));
        } else {
            s('droppingNext', 'No Drops Here');
        }
    } else {
        s('droppingNext', 'Final Stop reached');
    }
}

// =============================================
// PASSENGER LIST TABLE
// =============================================
function renderPassengerList() {
    const tbody = document.getElementById('passengerTableBody');
    if (!tbody) return;

    if (!allPassengersCache.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No passengers for this bus yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = allPassengersCache.map(p => {
        const rawStatus = (p.status || '').toLowerCase();
        let displayStatus = p.status;
        if (rawStatus === 'booked' || rawStatus === 'waiting' || rawStatus === 'confirmed') displayStatus = 'Booked';

        const badgeClass =
            rawStatus === 'boarded'   ? 'badge-pill badge-boarded' :
            rawStatus === 'dropped'   ? 'badge-pill badge-dropped' :
            rawStatus === 'cancelled' ? 'badge-pill badge-cancelled' :
                                       'badge-pill badge-booked';
        const rowBg =
            rawStatus === 'boarded' ? 'style="background:rgba(124,109,255,0.06);"' :
            rawStatus === 'dropped' ? 'style="background:rgba(80,80,100,0.05);"'  : '';
        return `
        <tr data-status="${displayStatus.toLowerCase()}" ${rowBg}>
            <td><code>${p.ticketId}</code></td>
            <td><b>${p.name}</b></td>
            <td><b>${p.seat}</b></td>
            <td style="font-size:0.78rem;">${p.pickup} → ${p.drop}</td>
            <td><span class="${badgeClass}">${displayStatus}</span></td>
            <td>
                ${ displayStatus === 'Booked'
                    ? `<button class="action-mini board" onclick="boardByTicket('${p.ticketId}')">Board ✓</button>`
                    : rawStatus === 'boarded'
                    ? `<button class="action-mini drop"  onclick="manualDrop('${p.ticketId}')">🏁 Drop</button>`
                    : '—' }
            </td>
        </tr>`;
    }).join('');

    // Always re-apply seat map colours and blink after table renders
    applySeatsFromCache();

    // Re-apply currently active filter
    const activeTab = document.querySelector('.filter-tab.active');
    if (activeTab) {
        let filterText = '';
        if (activeTab.textContent.includes('Waiting')) filterText = 'Booked';
        else if (activeTab.textContent.includes('Boarded')) filterText = 'Boarded';
        else if (activeTab.textContent.includes('Dropped')) filterText = 'Dropped';
        filterPassengers(filterText);
    }
}

// =============================================
// BOARD PASSENGER
// =============================================
async function boardPassenger() {
    const input = document.getElementById('ticketInput');
    if (!input) return;
    const ticketId = input.value.trim().toUpperCase();
    if (!ticketId) { alert('Please enter a Ticket ID'); return; }
    await boardByTicket(ticketId);
    input.value = '';
}

async function boardByTicket(ticketId) {
    if (!window.supabaseClient) { alert('Database not connected'); return; }

    // ── TRUE INSTANT OPTIMISTIC UPDATE ──
    // Does the ticket exist in the local cache already?
    let cachedPassengers = allPassengersCache.filter(p => p.ticketId === ticketId);
    
    if (cachedPassengers.length > 0) {
        if (cachedPassengers.every(p => p.status !== 'Booked')) {
            showToast('⚠️ Already boarded, dropped, or cancelled.');
            return;
        }

        // Apply visual updates INSTANTLY
        allPassengersCache = allPassengersCache.map(p =>
            p.ticketId === ticketId ? { ...p, status: 'Boarded' } : p
        );
        updateDashboardStats();
        renderPassengerList();
        showToast(`✅ Boarded instantly: ${cachedPassengers[0].name} (${cachedPassengers.map(p=>p.seat).join(', ')})`);

        // Send to Supabase in the background (fire and forget)
        window.supabaseClient.from('passengers')
            .update({ status: 'Boarded' })
            .eq('ticket_id', ticketId)
            .then(({ error }) => {
                if (error) console.error('Background DB sync failed:', error);
            });
            
        return; // Done! UI is completely responsive.
    }

    // ── SLOW PATH: Unknown ticket (maybe just booked, or wrong bus) ──
    showToast(`⏳ Checking database for ticket ${ticketId}...`);
    const { data: dbResult, error: dbErr } = await window.supabaseClient
        .from('passengers').select('*').eq('ticket_id', ticketId);

    if (dbErr || !dbResult || !dbResult.length) {
        alert('❌ Invalid Ticket: ' + ticketId); 
        return;
    }

    const passengers = dbResult.map(p => ({
        id: p.id, ticketId: p.ticket_id, name: p.name,
        seat: p.seat_number, seats: [p.seat_number],
        pickup: p.pickup_location, drop: p.drop_location,
        busNumber: p.bus_number, status: p.status,
        journeyDate: p.journey_date
    }));

    const today = new Date().toISOString().split('T')[0];
    if (passengers[0].journeyDate !== today) {
        alert(`❌ Wrong Date! This ticket is for ${passengers[0].journeyDate}, not today.`);
        return;
    }

    const busNum = assignedBus ? assignedBus.number : null;
    if (busNum && passengers.some(p => p.busNumber !== busNum)) {
        alert(`❌ Wrong Bus! This ticket is for bus ${passengers[0].busNumber || 'another route'}.`);
        return;
    }
    
    if (passengers.every(p => p.status !== 'Booked')) { 
        alert('⚠️ Already boarded, dropped, or cancelled.'); 
        return; 
    }

    // Found in DB. Update Supabase first.
    const { error } = await window.supabaseClient
        .from('passengers').update({ status: 'Boarded' }).eq('ticket_id', ticketId);
    if (error) { alert('❌ Error boarding: ' + error.message); return; }

    showToast(`✅ Boarded: ${passengers[0].name} (${passengers.map(p=>p.seat).join(', ')})`);

    // Inject into local cache and repaint
    passengers.forEach(p => allPassengersCache.push({ ...p, status: 'Boarded' }));
    updateDashboardStats();
    renderPassengerList();

    // Re-sync full DB state in the background later just in case
    setTimeout(() => refreshDriverBookings(), 2000);
}

async function manualDrop(ticketId) {
    if (!confirm(`Mark ticket ${ticketId} as Dropped?`)) return;
    if (!window.supabaseClient) return;

    // ── TRUE INSTANT OPTIMISTIC UPDATE ──
    allPassengersCache = allPassengersCache.map(p =>
        p.ticketId === ticketId ? { ...p, status: 'Dropped' } : p
    );
    
    updateDashboardStats();
    renderPassengerList();
    showToast(`🏁 Dropped ticket ${ticketId}`);

    // background sync
    window.supabaseClient.from('passengers')
        .update({ status: 'Dropped' })
        .eq('ticket_id', ticketId)
        .then(({ error }) => {
            if (error) console.error('Background DB drop failed:', error);
        });

    setTimeout(() => refreshDriverBookings(), 1500);
}

// One-stop function: repaints the full seat map from allPassengersCache
function applySeatsFromCache() {
    // Reset all to available first
    document.querySelectorAll('.seat-btn').forEach(btn => {
        btn.className = 'seat-btn available';
    });
    // Paint each passenger seat
    allPassengersCache.forEach(p => {
        if (p.status === 'Cancelled') return;
        const btn = document.querySelector(`[data-seat="${p.seat}"]`);
        if (!btn) return;
        btn.className = 'seat-btn ' + (
            p.status === 'Boarded' ? 'boarded' :
            p.status === 'Dropped' ? 'dropped' : 'booked'
        );
    });
    // Blink seats dropping at next stop
    highlightNextDropSeats();
}

// =============================================
// STOP MANAGEMENT
// =============================================
function updateStopDisplay() {
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    s('currentStop',  driverStops[currentStopIndex] || '—');
    s('nextStop',     driverStops[currentStopIndex + 1] || 'Final Stop 🏁');
    s('stopProgress', `Stop ${currentStopIndex + 1} of ${driverStops.length}`);

    // Render progress bar
    const pct = Math.round((currentStopIndex / (driverStops.length - 1)) * 100);
    const bar = document.getElementById('routeProgressBar');
    if (bar) { bar.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct); bar.innerText = pct + '%'; }

    // Render stop list
    const stopList = document.getElementById('stopList');
    if (stopList) {
        stopList.innerHTML = driverStops.map((stop, i) => `
            <div class="stop-item ${i < currentStopIndex ? 'done' : i === currentStopIndex ? 'current' : 'upcoming'}">
                <div class="stop-dot"></div>
                <span>${stop}</span>
                ${i === currentStopIndex ? ' <span class="badge bg-primary ms-2">YOU ARE HERE</span>' : ''}
                ${i < currentStopIndex ? ' <span class="badge bg-success ms-2">✓ Passed</span>' : ''}
            </div>
        `).join('');
    }

    // Re-apply blinking on stop change
    highlightNextDropSeats();
}

async function nextStop() {
    if (currentStopIndex >= driverStops.length - 1) {
        alert('🏁 You have reached the final destination!');
        return;
    }

    currentStopIndex++;
    const currentStopName = driverStops[currentStopIndex];
    updateStopDisplay();

    // Auto-drop passengers arriving at this stop
    const dropping = allPassengersCache.filter(p =>
        p.status === 'Boarded' &&
        (p.drop.toLowerCase().includes(currentStopName.toLowerCase()) || p.drop === currentStopName)
    );

    if (dropping.length > 0 && window.supabaseClient) {
        for (const p of dropping) {
            await window.supabaseClient.from('passengers').update({ status: 'Dropped' }).eq('ticket_id', p.ticketId);
        }
        showToast(`🏁 Arrived at ${currentStopName}! Auto-dropped ${dropping.length} passenger(s).`);
    } else {
        showToast(`➡️ Moved to: ${currentStopName}`);
    }

    await refreshDriverBookings();
}

// =============================================
// QR CODE SCANNER
// =============================================

// =============================================
// HIGHLIGHT NEXT-STOP DROP SEATS (BLINK RED)
// =============================================
function highlightNextDropSeats() {
    const nextStopName = (driverStops[currentStopIndex + 1] || '').toLowerCase();

    // First, clear any existing blink from all seats
    document.querySelectorAll('.seat-btn.dropping-next').forEach(btn => {
        btn.classList.remove('dropping-next');
    });

    if (!nextStopName) return; // Already at last stop

    // Find boarded passengers dropping at next stop
    const droppingSeats = allPassengersCache
        .filter(p => p.status === 'Boarded' &&
            (p.drop.toLowerCase() === nextStopName ||
             p.drop.toLowerCase().includes(nextStopName) ||
             nextStopName.includes(p.drop.toLowerCase())))
        .map(p => p.seat);

    droppingSeats.forEach(seat => {
        const btn = document.querySelector(`[data-seat="${seat}"]`);
        if (btn) btn.classList.add('dropping-next');
    });
}
function startScanner() {
    if (scannerActive) { stopScanner(); return; }

    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) { alert('QR Reader container not found'); return; }
    qrReader.innerHTML = '';
    scannerActive = true;

    const btn = document.getElementById('scannerBtn');
    if (btn) { btn.innerHTML = '❌ Close QR Scanner'; btn.style.background = 'var(--danger)'; }

    try {
        Html5Qrcode.getCameras().then(devices => {
            if (!devices || !devices.length) { alert('❌ No camera found'); scannerActive = false; return; }
            qrScanner = new Html5Qrcode('qr-reader');
            qrScanner.start(
                devices[0].id,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decoded) => handleQRScan(decoded),
                () => {}
            ).catch(err => {
                alert('❌ Camera access failed: ' + err.message);
                stopScanner();
            });
        });
    } catch (err) { alert('❌ QR scanner error'); scannerActive = false; }
}

function stopScanner() {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            qrScanner.clear();
            const el = document.getElementById('qr-reader');
            if (el) el.innerHTML = '';
        }).catch(() => {});
    }
    scannerActive = false;
    const btn = document.getElementById('scannerBtn');
    if (btn) { btn.innerHTML = '📱 QR Scanner'; btn.style.background = 'var(--primary)'; }
}

async function handleQRScan(raw) {
    let ticketId = raw.trim().toUpperCase();
    if (ticketId.startsWith('TKT:')) ticketId = ticketId.split('\n')[0].replace('TKT:', '').trim();
    stopScanner();
    await boardByTicket(ticketId);
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position:fixed;bottom:20px;right:20px;z-index:9999;
            display:flex;flex-direction:column;gap:10px;`;
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'driver-toast';
    toast.innerHTML = msg;
    toast.style.cssText = `
        background:linear-gradient(135deg,#1a1a2e,#16213e);
        color:#e0e0f8;border:1px solid rgba(130,100,255,0.4);
        border-radius:12px;padding:12px 18px;font-size:0.9rem;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        animation:slideInToast 0.3s ease;min-width:280px;`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

// =============================================
// FILTER PASSENGER LIST
// =============================================
function filterPassengers(status) {
    const rows = document.querySelectorAll('#passengerTableBody tr');
    const lowerStatus = status ? status.toLowerCase() : '';
    rows.forEach(row => {
        // If row is the "No passengers" message or "Loading", keep it visible or let logic handle it.
        if (row.cells.length === 1) {
             row.style.display = '';
             return;
        }
        
        const rowStatus = row.getAttribute('data-status') || '';

        if (!lowerStatus || rowStatus === lowerStatus || row.textContent.toLowerCase().includes(lowerStatus)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// =============================================
// LOGOUT
// =============================================
function logoutDriver() {
    if (confirm('Logout from the dashboard?')) {
        sessionStorage.removeItem('userSession');
        window.location.href = 'index.html';
    }
}