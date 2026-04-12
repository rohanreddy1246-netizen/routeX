/**
 * RouteX — Ultra-Stable Table-Based PDF Ticket Generator
 * Designed for perfect rendering in all browsers.
 */

let _lastBookingData = null;

function generateTicketPDF(booking) {
    _lastBookingData = booking;
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.onclick = () => downloadPDF(booking);
    }
}

function sanitize(str) {
    if (str === null || str === undefined || str === '') return 'N/A';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function numToWords(num) {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
        'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if (!num || num === 0) return 'Zero';
    const n = Math.round(num);
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '');
    return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '');
}

/**
 * Robust date formatter that avoids "Invalid Date"
 */
function formatDateSafe(dateVal) {
    if (!dateVal) return 'N/A';
    
    if (typeof dateVal === 'string' && dateVal.includes('Invalid Date')) {
        return 'N/A';
    }

    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
            return typeof dateVal === 'string' ? dateVal : 'N/A';
        }
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'N/A';
    }
}

function buildTicketHTML(booking) {
    // 5. General Validation
    if (!booking.ticketId) console.warn("Ticket ID missing for PDF");
    if (!booking.pickup) console.warn("Pickup missing for PDF");
    if (!booking.drop) console.warn("Drop missing for PDF");

    const seats = Array.isArray(booking.seats) && booking.seats.length > 0 
        ? booking.seats.join(', ') : (booking.seats || 'N/A');
        
    // 1. Invalid Date Fix
    const travelDate = formatDateSafe(booking.date);
    const bookedOn = formatDateSafe(booking.createdAt || booking.bookingDate || new Date());
    
    const totalFare = parseFloat(booking.fare) || 0;
    const baseFare = Math.round(totalFare / 1.118);
    const convFee = totalFare - baseFare;

    return `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  
  /* 2. Layout Issue Fix */
  .pdf-body {
    background: #ffffff !important;
    width: 100%;
    margin: 0 auto;
    opacity: 1 !important;
  }

  .ticket-card {
    width: 100%;
    margin: 0 auto;
    background: #ffffff !important;
    border: 1px solid #eee;
    opacity: 1 !important;
  }

  /* Structural Table Reset */
  table.layout-table { width: 100%; border-collapse: collapse; border: none; }
  table.layout-table td { vertical-align: top; border: none; }

  /* Header Section */
  .header-container { background: #00a3a3 !important; padding: 25px; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .brand-logo { font-size: 32px; font-weight: 900; letter-spacing: 1px; color: #ffffff !important; display: block; }
  .brand-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-top: 5px; }
  .header-right-text { text-align: right; }
  .ticket-main-title { font-size: 16px; font-weight: 700; }
  .ticket-sub-title { font-size: 9px; opacity: 0.8; margin-top: 5px; }

  /* Route Section */
  .route-row { background: #f0fafa; padding: 25px; border-bottom: 2px solid #00a3a3; }
  .route-label { font-size: 10px; font-weight: 800; color: #00a3a3; text-transform: uppercase; margin-bottom: 5px; }
  .route-city { font-size: 22px; font-weight: 900; color: #000; }
  .route-date { font-size: 12px; color: #444; margin-top: 5px; font-weight: 700; }
  .arrow-cell { text-align: center; font-size: 30px; font-weight: bold; color: #00a3a3; padding-top: 10px; }

  /* Meta Info Bar */
  .meta-bar { padding: 15px 25px; border-bottom: 1px solid #eee; }
  .meta-label { font-size: 9px; font-weight: 700; color: #77aaaa; text-transform: uppercase; margin-bottom: 3px; }
  .meta-value { font-size: 12px; font-weight: 800; color: #333; }
  .pnr-value { color: #00a3a3; font-family: monospace; font-size: 14px; }

  /* Passenger Details */
  .section-header { background: #00a3a3; color: #fff; padding: 10px 25px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .pax-table { width: 100%; border-collapse: collapse; }
  .pax-table th { background: #f9f9f9; padding: 12px 25px; text-align: left; font-size: 10px; color: #666; border-bottom: 1px solid #eee; text-transform: uppercase; }
  .pax-table td { padding: 15px 25px; font-size: 13px; color: #333; border-bottom: 1px solid #f2f2f2; }

  /* Payment & QR */
  .payment-qr-container { padding: 25px; border-top: 1px solid #eee; }
  .pay-title { font-size: 12px; font-weight: 800; color: #333; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
  .pay-line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; color: #555; }
  .pay-total-row { border-top: 2px solid #00a3a3; padding-top: 10px; margin-top: 10px; color: #00a3a3; font-size: 20px; font-weight: 900; }
  .pay-words { font-size: 11px; color: #999; margin-top: 12px; font-style: italic; }

  .qr-wrapper { border: 1px solid #e0eeee; padding: 15px; border-radius: 8px; background: #fff; text-align: center; }
  .qr-scan-label { font-size: 11px; font-weight: 800; color: #00a3a3; margin-top: 10px; letter-spacing: 1px; }

  /* Instructions Grid */
  .instr-footer { padding: 25px; background: #f9fdfd; border-top: 1px solid #eee; }
  .instr-title { font-size: 12px; font-weight: 800; color: #00a3a3; text-transform: uppercase; margin-bottom: 15px; }
  .instr-grid { width: 100%; border-collapse: collapse; }
  .instr-grid td { width: 50%; vertical-align: top; padding: 8px 15px 8px 0; font-size: 11px; color: #444; line-height: 1.5; }
  .bullet { color: #00a3a3; font-weight: 900; font-size: 14px; display: inline-block; width: 15px; }

  .footer-copyright { text-align: center; padding: 15px; font-size: 10px; color: #aaa; text-transform: uppercase; background: #fafafa; border-top: 1px solid #eee; letter-spacing: 1px; }
</style>

<div class="pdf-body">
  <div class="ticket-card">
    
    <!-- HEADER -->
    <div class="header-container">
      <table class="layout-table">
        <tr>
          <td>
            <div class="brand-logo">RouteX</div>
            <div class="brand-sub">Modern Bus Travel Solution</div>
          </td>
          <td class="header-right-text">
            <div class="ticket-main-title">Make Your Journey Safe</div>
            <div class="ticket-sub-title">Verified Electronic Passenger Ticket</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- ROUTE -->
    <div class="route-row">
      <table class="layout-table">
        <tr>
          <td style="width: 40%;">
            <div class="route-label">From</div>
            <div class="route-city">${sanitize(booking.pickup)}</div>
            <div class="route-date">DATE: ${travelDate}</div>
          </td>
          <td class="arrow-cell" style="width: 20%;">→</td>
          <td style="width: 40%; text-align: right;">
            <div class="route-label">To</div>
            <div class="route-city">${sanitize(booking.drop)}</div>
            <div class="route-date">DATE: ${travelDate}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- META BAR -->
    <div class="meta-bar">
      <table class="layout-table">
        <tr>
          <td style="width: 28%;">
            <div class="meta-label">PNR / Ticket Id</div>
            <div class="meta-value pnr-value">${sanitize(booking.ticketId || 'TKT-PENDING')}</div>
          </td>
          <td style="width: 28%;">
            <div class="meta-label">Bus Number</div>
            <div class="meta-value">${sanitize(booking.busNumber)}</div>
          </td>
          <td style="width: 22%; text-align: center;">
            <div class="meta-label">Boarding Time</div>
            <div class="meta-value" style="color: #00a3a3;">${sanitize(booking.boardingTime)}</div>
          </td>
          <td style="width: 22%; text-align: right;">
            <div class="meta-label">Booked Date</div>
            <div class="meta-value">${bookedOn}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- PASSENGER -->
    <div class="section-header">Passenger Summary</div>
    <table class="pax-table">
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>Passenger Name</th>
          <th>Age / Gender</th>
          <th>Seat(s)</th>
          <th style="text-align: right;">Final Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style="font-weight: 900; color: #000;">${sanitize(booking.name)}</td>
          <td>${sanitize(booking.age)} / ${sanitize(booking.gender)}</td>
          <td style="font-weight: 900;">${sanitize(seats)}</td>
          <td style="text-align: right; color: #00a3a3; font-weight: 900;">CONFIRMED</td>
        </tr>
      </tbody>
    </table>

    <!-- PAYMENT & QR -->
    <div class="payment-qr-container">
      <table class="layout-table">
        <tr>
          <td style="width: 60%; padding-right: 40px;">
            <div class="pay-title">Fare Details</div>
            <div class="pay-line">
              <span>Ticket Amount</span>
              <span>₹ ${baseFare.toFixed(2)}</span>
            </div>
            <div class="pay-line">
              <span>GST & Convenecy Fee</span>
              <span>₹ ${convFee.toFixed(2)}</span>
            </div>
            <div class="pay-line pay-total-row">
              <span style="font-size: 15px;">Net Fare Paid</span>
              <span>₹ ${totalFare.toFixed(2)}</span>
            </div>
            <div class="pay-words">Amount in words: ${numToWords(totalFare)} Only</div>
          </td>
          <td style="width: 40%;">
            <div class="qr-wrapper">
              <div id="pdf-qr-container" style="display:inline-block;"></div>
              <div class="qr-scan-label">SCAN TO BOARD</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- INSTRUCTIONS -->
    <div class="instr-footer">
      <div class="instr-title">Travel Instructions & Guidelines:</div>
      <table class="instr-grid">
        <tr>
          <td><span class="bullet">•</span>Please carry a valid ID proof along with this ticket during travel.</td>
          <td><span class="bullet">•</span>Arrive at boarding point 15-20 mins early to avoid missing bus.</td>
        </tr>
        <tr>
          <td><span class="bullet">•</span>Ticket is non-transferable and valid for named passenger only.</td>
          <td><span class="bullet">•</span>Seats booked cannot be changed without prior rebooking.</td>
        </tr>
        <tr>
          <td><span class="bullet">•</span>Cancellation and refunds are subject to operator policies.</td>
          <td><span class="bullet">•</span>Passengers are responsible for their own luggage items.</td>
        </tr>
        <tr>
          <td><span class="bullet">•</span>Follow all safety guidelines given by the driver or staff.</td>
          <td><span class="bullet">•</span>For support, please contact customer care with your PNR ID.</td>
        </tr>
      </table>
    </div>

    <!-- FOOTER -->
    <div class="footer-copyright">
      ISSUED ELECTRONICALLY BY ROUTEX SOLUTIONS | TAX INVOICE: ${sanitize(booking.ticketId?.split('-')[1] || '047726')} | GST 2024
    </div>

  </div>
</div>
`;
}

async function downloadPDF(booking) {
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Exporting PDF...';
    }

    try {
        if (typeof html2pdf === 'undefined') {
            alert('PDF library not loaded.');
            return;
        }

        const html = buildTicketHTML(booking);
        const container = document.createElement('div');
        // Let it naturally size itself for A4 render
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;background:#fff;';
        container.innerHTML = html;
        document.body.appendChild(container);

        // 4. QR Code validation
        const qrContent = booking.ticketId || '';
        const qrDiv = container.querySelector('#pdf-qr-container');
        if (!qrContent) {
            console.error("QR data missing");
            if (qrDiv) qrDiv.innerHTML = '<span style="color:red; font-size:10px;">QR Error</span>';
        } else if (qrDiv && typeof QRCode !== 'undefined') {
            new QRCode(qrDiv, {
                text: qrContent,
                width: 140,
                height: 140,
                colorDark: '#000000',
                colorLight: '#ffffff'
            });
        }

        // Wait for rendering
        await new Promise(r => setTimeout(r, 1000));

        // Canvas to Image for QR
        const canvas = qrDiv ? qrDiv.querySelector('canvas') : null;
        if (canvas) {
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.width = '140px';
            img.style.height = '140px';
            qrDiv.innerHTML = '';
            qrDiv.appendChild(img);
        }

        // 3. Lossless PNG to prevent color fading
        const opt = {
            margin:       10, // Margin in mm
            filename:     `RouteX_Ticket_${booking.ticketId || 'New'}.pdf`,
            image:        { type: 'png' }, // PNG prevents browser JPEG color washing (the "white layer" fade)
            html2canvas:  { 
                scale: 2,
                useCORS: true,
                scrollY: 0,
                scrollX: 0,
                logging: false,
                onclone: (clonedDoc) => {
                    const overlays = clonedDoc.querySelectorAll('.processing-overlay, .modal-backdrop, .modal');
                    overlays.forEach(el => el.style.display = 'none');
                }
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const element = container.querySelector('.pdf-body');
        await html2pdf().set(opt).from(element).save();
        
        document.body.removeChild(container);

    } catch (err) {
        console.error('PDF Error:', err);
        alert('PDF download failed. Please try again.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📥 Download PDF';
        }
    }
}
