/**
 * Shared test helpers and non-calendar formatting utilities.
 */

export const FULL_CONDO_ADDRESS = 'Unit 418 Serin East Tagaytay, Brgy. Silang Crossing East, Tagaytay City, Cavite, 4120, Philippines';

/**
 * Escapes unsafe HTML characters to prevent XSS.
 *
 * @param {string|*} str - Input string
 * @returns {string} Sanitized string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the direct Google Calendar web template link for "Add to Calendar".
 *
 * @param {string} refId - Booking reference ID
 * @param {string} checkInDate - YYYY-MM-DD
 * @param {string} checkOutDate - YYYY-MM-DD
 * @param {string|number} [totalPrice] - Total confirmed price
 * @returns {string} Google Calendar Add URL
 */
export function buildGoogleCalendarTemplateUrl(refId, checkInDate, checkOutDate, totalPrice) {
  const s = String(checkInDate).replace(/-/g, '');
  const e = String(checkOutDate).replace(/-/g, '');
  const priceInfo = totalPrice ? `\nTotal: ₱${Math.round(totalPrice).toLocaleString('en-US')}` : '';
  const title = encodeURIComponent(`Staycation: Unit 418 Serin East Tagaytay (Ref #${refId})`);
  const details = encodeURIComponent(`Condo Staycation Ref #${refId}${priceInfo}\nCheck-in: 3:00 PM\nCheck-out: 11:00 AM\nAddress: ${FULL_CONDO_ADDRESS}`);
  const loc = encodeURIComponent(FULL_CONDO_ADDRESS);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${s}T150000/${e}T110000&details=${details}&location=${loc}`;
}

/**
 * Generates RFC 5545 iCalendar (.ics) string.
 *
 * @param {Object} reservation - Reservation object
 * @returns {string} .ics content string
 */
export function buildIcsContent(reservation) {
  const inVal = String(reservation.startDate).replace(/-/g, '');
  const outVal = String(reservation.endDate).replace(/-/g, '');
  const ref = reservation.referenceId;
  const todayIso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const priceDesc = reservation.totalPrice ? `\\nTotal: ₱${Math.round(reservation.totalPrice).toLocaleString('en-US')}` : '';

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Condo Booking//EN",
    "BEGIN:VEVENT",
    `UID:condo-${ref}@booking.local`,
    `DTSTAMP:${todayIso}T000000Z`,
    `DTSTART:${inVal}T150000`,
    `DTEND:${outVal}T110000`,
    `SUMMARY:Staycation: Unit 418 Serin East Tagaytay (Ref #${ref})`,
    `DESCRIPTION:Condo Staycation Ref #${ref}\\nGuest: ${reservation.guestName}\\nGuests: ${reservation.guestCount}${priceDesc}\\nAddress: ${FULL_CONDO_ADDRESS}`,
    `LOCATION:${FULL_CONDO_ADDRESS}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

/**
 * Validates the contact form fields on the client.
 *
 * @param {Object} payload - Contact fields
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateGuestFormPayload(payload) {
  if (!payload || !payload.guestName || !payload.startDate || !payload.endDate) {
    return { isValid: false, error: 'Please select valid check-in and check-out dates and provide your full name.' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasValidEmail = payload.guestEmail && emailPattern.test(String(payload.guestEmail).trim());
  const cleanPhone = String(payload.guestPhone || '').replace(/[\s-]/g, '');
  const hasValidPhone = cleanPhone && cleanPhone.length >= 10;

  if (!hasValidEmail && !hasValidPhone) {
    return { isValid: false, error: 'Please provide valid contact details (email and phone number).' };
  }

  return {
    isValid: true,
    error: null
  };
}
