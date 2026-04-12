// Example: How to integrate RouteX Ticket Generator into your app

// 1. Include the required libraries in your HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode.js/1.5.3/qrcode.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
// <script src="ticket-generator.js"></script>

// 2. Example booking data structure
const sampleBooking = {
    ticketId: "RTX20241225001",
    name: "Rahul Sharma",
    age: 28,
    gender: "Male",
    seats: ["A1", "A2"], // Array of seat numbers
    busNumber: "BUS-DEL-001",
    busType: "AC Sleeper",
    pickup: "Delhi ISBT Kashmere Gate",
    drop: "Mumbai Dadar Central",
    date: "2024-12-25", // YYYY-MM-DD format
    boardingTime: "22:30", // HH:MM format
    fare: 2500, // Number (in rupees)
    email: "rahul.sharma@email.com",
    phone: "+91-9876543210",
    status: "Confirmed",
    bookingDate: "2024-12-20" // When booking was made
};

// 3. How to use in your JavaScript code:

// Option A: Initialize PDF generation for a booking
function initializeTicketGenerator(bookingData) {
    // This sets up the download button click handler
    generateTicketPDF(bookingData);
}

// Option B: Directly download PDF
function downloadTicketPDF(bookingData) {
    downloadPDF(bookingData);
}

// Option C: Get ticket HTML for preview
function getTicketPreview(bookingData) {
    try {
        return buildTicketHTML(bookingData);
    } catch (error) {
        console.error('Error generating ticket HTML:', error);
        return null;
    }
}

// 4. Example usage in your booking confirmation page:

// After successful booking
function onBookingConfirmed(bookingData) {
    // Store booking data
    localStorage.setItem('currentBooking', JSON.stringify(bookingData));

    // Initialize ticket generator
    initializeTicketGenerator(bookingData);

    // Redirect to ticket page or show preview
    window.location.href = 'ticket.html';
}

// 5. Example: Handle booking data from localStorage
function loadBookingFromStorage() {
    try {
        const booking = JSON.parse(localStorage.getItem('currentBooking'));
        if (booking && booking.ticketId) {
            return booking;
        }
    } catch (error) {
        console.error('Error loading booking:', error);
    }
    return null;
}

// 6. Example: Validate booking data before generating ticket
function validateBookingData(booking) {
    const required = ['ticketId', 'name', 'pickup', 'drop', 'date', 'fare'];
    for (let field of required) {
        if (!booking[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    return true;
}

// 7. Complete example integration
document.addEventListener('DOMContentLoaded', function() {
    // Load booking data
    const booking = loadBookingFromStorage();

    if (booking) {
        try {
            // Validate data
            validateBookingData(booking);

            // Initialize ticket generator
            initializeTicketGenerator(booking);

            // Show ticket preview
            const previewElement = document.getElementById('ticket-preview');
            if (previewElement) {
                previewElement.innerHTML = getTicketPreview(booking);
            }

        } catch (error) {
            console.error('Ticket generation failed:', error);
            alert('Error: ' + error.message);
        }
    } else {
        alert('No booking data found. Please complete a booking first.');
    }
});

// 8. Example: Custom button handlers
function setupCustomButtons() {
    // Download PDF button
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const booking = loadBookingFromStorage();
            if (booking) {
                downloadTicketPDF(booking);
            }
        });
    }

    // Print ticket button
    const printBtn = document.getElementById('print-ticket-btn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

// Call this when your page loads
setupCustomButtons();