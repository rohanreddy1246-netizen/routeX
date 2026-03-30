/**
 * RouteX — Professional PDF Ticket Generator
 * Uses: html2pdf.js + QRCode.js (already loaded in index.html)
 *
 * Usage: generateTicketPDF(booking)
 * Called automatically from showTicketConfirmation()
 */

// ─── Store current booking globally for PDF re-download ───
let _lastBookingData = null;

/**
 * Main entry — call this after showTicketConfirmation()
 * @param {Object} booking — the booking object from finalizeBooking()
 */
function generateTicketPDF(booking) {
    _lastBookingData = booking;

    // Wire up "Download PDF" button
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.onclick = () => downloadPDF(booking);
    }
    // Auto-download removed as requested
}

// ─────────────────────────────────────────────
// Build the HTML content for the PDF ticket
// ─────────────────────────────────────────────
function buildTicketHTML(booking) {
    const seats = Array.isArray(booking.seats) ? booking.seats.join(', ') : (booking.seats || '—');
    const travelDate = booking.date
        ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : '—';
    const bookedOn = booking.createdAt || booking.bookingDate || new Date().toLocaleString('en-IN');

    return `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* Body background removed as it is applied to the wrapper */
  .pdf-container {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f4ff;
    padding: 20px;
    display: inline-block;
  }

  .ticket-wrapper {
    width: 720px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 10px 60px rgba(55,63,81,0.15);
    overflow: hidden;
  }

  /* ── HEADER ── */
  .ticket-header {
    background: linear-gradient(135deg, #373F51 0%, #52617C 100%);
    padding: 28px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
  }
  .brand-block { display: flex; align-items: center; gap: 14px; }
  .brand-icon {
    width: 52px; height: 52px;
    background: rgba(255,255,255,0.15);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
  }
  .brand-name { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
  .brand-tagline { font-size: 11px; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }

  .header-right { text-align: right; }
  .header-right .booking-id {
    font-size: 11px; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase;
  }
  .header-right .booking-id-val {
    font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace;
    letter-spacing: 2px; margin-top: 2px;
  }

  /* ── STATUS BANNER ── */
  .status-bar {
    background: #22c55e;
    padding: 9px 36px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .status-bar .status-text { color: #fff; font-weight: 700; font-size: 13px; letter-spacing: 1px; }
  .status-bar .status-date { color: rgba(255,255,255,0.8); font-size: 11px; }

  /* ── DASHED DIVIDER ── */
  .perforation {
    border-top: 3px dashed #d1d5db;
    margin: 0 20px;
    position: relative;
  }
  .perforation::before, .perforation::after {
    content: '';
    width: 28px; height: 28px; border-radius: 50%;
    background: #f0f4ff;
    position: absolute; top: -14px;
    border: 3px solid #d1d5db;
  }
  .perforation::before { left: -34px; }
  .perforation::after { right: -34px; }

  /* ── MAIN BODY ── */
  .ticket-body {
    padding: 28px 36px;
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 24px;
  }

  /* ── SECTIONS ── */
  .section-label {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: #9ca3af; margin-bottom: 6px;
  }
  .section-value {
    font-size: 15px; font-weight: 600; color: #1e293b;
  }
  .section-value.highlight {
    font-size: 18px; color: #373F51; font-weight: 800;
  }

  /* Route row */
  .route-row {
    display: flex; align-items: center; gap: 10px;
    background: #f8faff;
    border: 1px solid #e2e8f0;
    border-radius: 12px; padding: 16px 18px;
    margin-bottom: 18px;
  }
  .route-city { flex: 1; }
  .route-city .city-label { font-size: 9px; color: #9ca3af; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .route-city .city-name { font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 2px; }
  .route-arrow {
    font-size: 22px; color: #373F51; flex-shrink: 0;
  }

  /* Details grid: 2-col inside left panel */
  .details-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;
    margin-bottom: 18px;
  }

  .seats-badge {
    display: inline-block;
    background: linear-gradient(135deg, #373F51, #52617C);
    color: #fff;
    font-size: 14px; font-weight: 800;
    padding: 6px 14px; border-radius: 8px;
    letter-spacing: 1px;
  }

  /* ── QR PANEL ── */
  .qr-panel {
    display: flex; flex-direction: column; align-items: center;
    background: #f8faff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 12px;
  }
  .qr-panel .qr-label {
    font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #9ca3af;
    text-transform: uppercase; margin-bottom: 10px; text-align: center;
  }
  .qr-panel img, .qr-panel canvas {
    width: 140px !important; height: 140px !important;
    border-radius: 8px;
  }
  .qr-panel .scan-instruction {
    font-size: 10px; color: #64748b; text-align: center;
    margin-top: 10px; line-height: 1.5;
  }

  /* ── TERMS FOOTER ── */
  .ticket-footer {
    background: #f8faff;
    border-top: 1px solid #e2e8f0;
    padding: 16px 36px;
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px;
  }
  .terms { flex: 1; }
  .terms-title { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px; }
  .terms-text { font-size: 10px; color: #64748b; line-height: 1.7; }

  .boarding-notice {
    background: #373F51;
    color: #fff;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 11px; font-weight: 700;
    text-align: center; letter-spacing: 0.5px;
    white-space: nowrap;
  }
</style>

<div class="pdf-container">
  <div class="ticket-wrapper">
    <!-- HEADER -->
    <div class="ticket-header">
      <div class="brand-block">
        <div class="brand-icon">🚌</div>
        <div>
          <div class="brand-name">RouteX</div>
          <div class="brand-tagline">Official Travel Ticket</div>
        </div>
      </div>
      <div class="header-right">
        <div class="booking-id">Booking ID</div>
        <div class="booking-id-val">${sanitize(booking.ticketId)}</div>
      </div>
    </div>

    <!-- STATUS BAR -->
    <div class="status-bar">
      <div class="status-text">✅ &nbsp;CONFIRMED — PAYMENT COMPLETE</div>
      <div class="status-date">Booked: ${sanitize(bookedOn)}</div>
    </div>

    <!-- PERFORATION -->
    <div class="perforation"></div>

    <!-- BODY -->
    <div class="ticket-body">
      <!-- LEFT PANEL -->
      <div>
        <div class="route-row">
          <div class="route-city">
            <div class="city-label">Origin</div>
            <div class="city-name">${sanitize(booking.pickup || '—')}</div>
          </div>
          <div class="route-arrow">✈</div>
          <div class="route-city" style="text-align:right">
            <div class="city-label">Destination</div>
            <div class="city-name">${sanitize(booking.drop || '—')}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-cell">
            <div class="section-label">Passenger Name</div>
            <div class="section-value">${sanitize(booking.name || '—')}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Age / Gender</div>
            <div class="section-value">${sanitize(booking.age || '?')} yrs / ${sanitize(booking.gender || '?')}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Phone</div>
            <div class="section-value">${sanitize(booking.phone || '—')}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Email</div>
            <div class="section-value" style="font-size:13px">${sanitize(booking.email || '—')}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Travel Date</div>
            <div class="section-value highlight">${sanitize(travelDate)}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Boarding Time</div>
            <div class="section-value highlight">${sanitize(booking.boardingTime || '—')}</div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Bus Number</div>
            <div class="section-value">${sanitize(booking.busNumber || '—')} <span style="font-size:11px;color:#9ca3af">(${sanitize(booking.busType || '')})</span></div>
          </div>
          <div class="detail-cell">
            <div class="section-label">Fare Paid</div>
            <div class="section-value highlight">₹${sanitize(String(booking.fare || 0))}</div>
          </div>
          <div class="detail-cell" style="grid-column: span 2;">
            <div class="section-label">Seat Number(s)</div>
            <div class="section-value"><span class="seats-badge">🪑 ${sanitize(seats)}</span></div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: QR -->
      <div class="qr-panel">
        <div class="qr-label">Board Scan QR</div>
        <div id="pdf-qr-container"></div>
        <div class="scan-instruction">Show this QR to the driver<br>at the boarding gate</div>
      </div>
    </div><!-- /ticket-body -->

    <!-- PERFORATION -->
    <div class="perforation"></div>

    <!-- FOOTER -->
    <div class="ticket-footer">
      <div class="terms">
        <div class="terms-title">Terms & Conditions</div>
        <div class="terms-text">
          • Report to boarding point 15 min before departure.<br>
          • Ticket is non-transferable. Carry valid ID proof.<br>
          • Cancellations subject to RouteX refund policy.<br>
          • RouteX is not liable for delays due to weather or traffic.
        </div>
      </div>
      <div class="boarding-notice">🎫 Show this ticket<br>while boarding</div>
    </div>
  </div><!-- /ticket-wrapper -->
</div><!-- /pdf-container -->
`;
}

// ─────────────────────────────────────────────
// Generate & Download the PDF
// ─────────────────────────────────────────────
async function downloadPDF(booking) {
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Generating PDF...';
    }

    try {
        if (typeof html2pdf === 'undefined') {
            alert('PDF library not loaded. Please check your internet connection.');
            return;
        }

        const html = buildTicketHTML(booking);

        // Create a temporary hidden container
        const container = document.createElement('div');
        // Need to be visible in DOM but off-screen for html2canvas to render reliably
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:760px;z-index:-1;';
        container.innerHTML = html;
        document.body.appendChild(container);

        // Generate QR Code dynamically inside the container
        const qrContainer = container.querySelector('#pdf-qr-container');
        if (qrContainer && typeof QRCode !== 'undefined') {
            const qrContent = booking.ticketId || 'UNKNOWN';

            new QRCode(qrContainer, {
                text: qrContent,
                width: 140,
                height: 140,
                colorDark: '#373F51',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }

        // Wait a moment for QR canvas to render and styles to apply
        await new Promise(resolve => setTimeout(resolve, 800));

        const opt = {
            margin:       [8, 8, 8, 8],
            filename:     `RouteX-Ticket-${booking.ticketId}.pdf`,
            image:        { type: 'jpeg', quality: 0.97 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: 'avoid-all' }
        };

        // Render the inner .pdf-container
        await html2pdf().set(opt).from(container.querySelector('.pdf-container')).save();

        document.body.removeChild(container);
    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('PDF generation failed. Please try printing instead (🖨 Print button).');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📥 Download PDF';
        }
    }
}
