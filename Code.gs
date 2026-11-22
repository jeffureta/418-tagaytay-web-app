/**
 * Google Apps Script Web App Entrypoint & JSON RPC Gateway for Unit 418 Serin East Tagaytay.
 * Handles HTTP GET and POST requests for client web apps, python sync, and HTML rendering.
 */

/**
 * Serves HTML or handles JSON-RPC GET actions
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'index';

  if (action === 'getAvailableDates' || action === 'getAvailability') {
    var bookedRanges = typeof getBookedRanges === 'function' ? getBookedRanges() : [];
    return ContentService.createTextOutput(JSON.stringify({ success: true, busy: bookedRanges }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'syncPull') {
    var data = typeof getSheetReservationsLedger === 'function' ? getSheetReservationsLedger() : { reservations: [] };
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'lookupReservation') {
    var refId = e.parameter.refId;
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: { refId: refId, status: 'CONFIRMED', endorsementStatus: 'PENDING' }
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getFaq') {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      property: "Unit 418 Serin East Tagaytay",
      checkIn: "14:00 (2:00 PM PHT)",
      checkOut: "12:00 (12:00 NN PHT)",
      wifi: "Serin418_Guest_5G"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Route to In-Unit QR Appliance Guide (?view=qr) or standard Booking Web App
  var view = (e && e.parameter && e.parameter.view) || '';
  if (view === 'qr') {
    var qrTemplate = HtmlService.createTemplateFromFile('QrGuide');
    return qrTemplate.evaluate()
      .setTitle('Unit 418 Serin East Tagaytay - In-Unit Appliance & Guest Guide')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }

  // Serve the interactive web app HTML interface
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Unit 418 Serin East Tagaytay - Booking & Calendar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/**
 * Handles JSON-RPC POST actions: createReservation, submitEndorsement, syncPush, releaseLockPin
 */
function doPost(e) {
  var payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var action = payload.action || 'createReservation';
  var result = { success: true, action: action, timestamp: new Date().toISOString() };

  if (action === 'createReservation') {
    result.data = createBooking(payload);
    if (result.data.success && typeof syncSheetReservationToCalendar === 'function') {
      syncSheetReservationToCalendar(payload);
    }
  } else if (action === 'submitEndorsement') {
    result.data = { refId: payload.refId, status: 'CLEARED' };
  } else if (action === 'releaseLockPin') {
    result.data = { refId: payload.refId, pin: payload.pin || '654321', released: true };
  } else if (action === 'syncPush') {
    result.data = { updated: (payload.reservations || []).length };
  } else if (action === 'gcalCreateEvent') {
    result.data = typeof gcalCreateBookingEvent === 'function' ? gcalCreateBookingEvent(payload.reservation || payload) : { success: false, message: 'gcalCreateBookingEvent not loaded' };
    result.success = result.data.success;
  } else if (action === 'gcalUpdateEvent') {
    result.data = typeof gcalUpdateBookingEvent === 'function' ? gcalUpdateBookingEvent(payload.eventId, payload.reservation || payload) : { success: false, message: 'gcalUpdateBookingEvent not loaded' };
    result.success = result.data.success;
  } else if (action === 'gcalDeleteEvent') {
    result.data = typeof gcalDeleteBookingEvent === 'function' ? gcalDeleteBookingEvent(payload.eventId, payload.refId) : { success: false, message: 'gcalDeleteBookingEvent not loaded' };
    result.success = result.data.success;
  } else if (action === 'gcalListEvents') {
    result.data = typeof gcalListEvents === 'function' ? gcalListEvents(payload.from, payload.to) : { success: false, events: [] };
    result.success = result.data.success;
  } else {
    result.data = { received: true };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper function to include HTML subfiles (Styles, Scripts) into Index.html.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
