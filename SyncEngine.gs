/**
 * SyncEngine.gs
 * Google Calendar <-> Google Sheets Ops Ledger Bidirectional Synchronization Engine
 * for Unit 418 Serin East Tagaytay.
 *
 * Sheet ID: 14n99htLUR-H09Vz9_tOmDUc9_8Zt9VZopJM5KAqPUgw
 */

var OPS_LEDGER_SHEET_ID = "14n99htLUR-H09Vz9_tOmDUc9_8Zt9VZopJM5KAqPUgw";

/**
 * Reconciles Google Calendar events (direct bookings + external Airbnb/Agoda iCal blocks)
 * with the Google Sheets Operations Ledger.
 * Can be run manually or via scheduled time-driven trigger (every 1-4 hours).
 */
function syncCalendarToSheetsLedger() {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    Logger.log('SyncEngine: Calendar not found: ' + CALENDAR_ID);
    return { success: false, message: 'Calendar not found' };
  }

  var ss = SpreadsheetApp.openById(OPS_LEDGER_SHEET_ID);
  var sheet = ss.getSheetByName('Reservations') || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();

  var existingRefIds = {};
  for (var i = 1; i < data.length; i++) {
    var ref = data[i][0];
    if (ref) existingRefIds[ref] = true;
  }

  var now = new Date();
  var futureLimit = new Date();
  futureLimit.setDate(now.getDate() + 180); // Sync 6 months ahead

  var events = calendar.getEvents(now, futureLimit);
  var insertedCount = 0;

  for (var j = 0; j < events.length; j++) {
    var ev = events[j];
    var title = ev.getTitle();
    var uid = ev.getId();

    // Check if this event corresponds to an existing reservation or external block
    var isExisting = false;
    for (var ref in existingRefIds) {
      if (title.indexOf(ref) !== -1 || uid.indexOf(ref) !== -1) {
        isExisting = true;
        break;
      }
    }

    if (!isExisting) {
      // Parse channel from title (e.g. Airbnb, Agoda, or Direct)
      var channel = 'direct';
      var lowerTitle = title.toLowerCase();
      if (lowerTitle.indexOf('airbnb') !== -1 || lowerTitle.indexOf('not available') !== -1) {
        channel = 'airbnb';
      } else if (lowerTitle.indexOf('agoda') !== -1) {
        channel = 'agoda';
      }

      var startStr = Utilities.formatDate(ev.getStartTime(), 'Asia/Manila', 'yyyy-MM-dd');
      var endStr = Utilities.formatDate(ev.getEndTime(), 'Asia/Manila', 'yyyy-MM-dd');
      var refId = 'CAL-' + uid.substring(0, 8);

      sheet.appendRow([
        refId,
        title || 'Calendar Block',
        startStr,
        endStr,
        2,
        channel,
        0,
        'AUTO_SYNCED',
        new Date()
      ]);
      existingRefIds[refId] = true;
      insertedCount++;
    }
  }

  Logger.log('SyncEngine: Calendar -> Sheets sync completed. Inserted: ' + insertedCount);
  return { success: true, inserted: insertedCount };
}

/**
 * Creates or updates a Google Calendar event from a verified Google Sheet reservation row.
 */
function syncSheetReservationToCalendar(reservation) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) return { success: false, message: 'Calendar not found' };

  var startDate = new Date(reservation.checkIn + 'T14:00:00'); // 2:00 PM Check-in
  var endDate = new Date(reservation.checkOut + 'T12:00:00');   // 12:00 NN Check-out

  var title = 'Unit 418: ' + reservation.guestName + ' (' + reservation.refId + ')';
  var desc = [
    'Unit: Unit 418 Serin East Tagaytay',
    'Guest: ' + reservation.guestName,
    'Reference: ' + reservation.refId,
    'Channel: ' + (reservation.channel || 'direct'),
    'Guests: ' + (reservation.guests || 2),
    'Covered Parking: ' + (reservation.coveredParking ? 'Yes (Slot B-18)' : 'No'),
    'Plate: ' + (reservation.plateNumber || 'N/A'),
    'Status: ' + (reservation.endorsementStatus || 'PENDING')
  ].join('\n');

  var event = calendar.createEvent(title, startDate, endDate, { description: desc });
  return { success: true, eventId: event.getId() };
}

/**
 * Reads all rows from the Google Sheets Reservations ledger and returns an array of reservation objects.
 */
function getSheetReservationsLedger() {
  try {
    var ss = SpreadsheetApp.openById(OPS_LEDGER_SHEET_ID);
    var sheet = ss.getSheetByName('Reservations') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var reservations = [];

    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        reservations.push({
          refId: row[0],
          guestName: row[1],
          checkIn: row[2],
          checkOut: row[3],
          guests: row[4],
          channel: row[5],
          amount: row[6],
          status: row[7],
          createdAt: row[8]
        });
      }
    }
    return { success: true, reservations: reservations };
  } catch (err) {
    Logger.log('SyncEngine getSheetReservationsLedger error: ' + err.toString());
    return { success: false, reservations: [], error: err.toString() };
  }
}

/**
 * Creates a direct Google Calendar booking event with standard Unit 418 PHT hours (14:00 Check-In / 12:00 Check-Out).
 */
function gcalCreateBookingEvent(reservation) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return { success: false, message: 'Calendar not found: ' + CALENDAR_ID };

    var guests = reservation.guests || 2;
    var guestName = reservation.guestName || 'Guest';
    var refId = reservation.refId || ('CND-' + Math.floor(1000 + Math.random() * 9000));
    var isTest = reservation.isTest || (typeof refId === 'string' && refId.indexOf('TEST-') === 0);
    var prefix = isTest ? '[TEST] ' : '';

    var startDate = new Date(reservation.checkIn + 'T14:00:00+08:00');
    var endDate = new Date(reservation.checkOut + 'T12:00:00+08:00');

    var title = prefix + 'Booking: ' + guestName + ' (' + guests + ' guests) - Ref #' + refId;
    var descLines = [
      'Booking Reference: ' + refId,
      'Guest Name: ' + guestName,
      'Email: ' + (reservation.guestEmail || 'N/A'),
      'Phone: ' + (reservation.guestPhone || 'N/A'),
      'Guests: ' + guests,
      'Channel: ' + (reservation.channel || 'direct'),
      'Check-in: ' + reservation.checkIn,
      'Check-out: ' + reservation.checkOut,
      'Parking: ' + (reservation.coveredParking ? ('Covered Slot (Plate: ' + (reservation.plateNumber || 'TBD') + ')') : 'None/Street'),
      'Status: ' + (reservation.bookingStatus || 'Confirmed')
    ];

    var event = calendar.createEvent(title, startDate, endDate, {
      description: descLines.join('\n'),
      location: CONDO_FULL_ADDRESS
    });

    var eventId = event.getId();
    var htmlLink = 'https://calendar.google.com/calendar/u/0?cid=' + encodeURIComponent(CALENDAR_ID);

    return {
      success: true,
      refId: refId,
      gcalEventId: eventId,
      htmlLink: htmlLink
    };
  } catch (err) {
    Logger.log('gcalCreateBookingEvent error: ' + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Updates an existing Google Calendar event matching eventId or reservation refId.
 */
function gcalUpdateBookingEvent(eventId, reservation) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return { success: false, message: 'Calendar not found: ' + CALENDAR_ID };

    var event = null;
    if (eventId) {
      try {
        event = calendar.getEventById(eventId);
      } catch (e) {
        event = null;
      }
    }

    // Fallback: search by refId
    if (!event && reservation.refId) {
      var checkInDate = new Date(reservation.checkIn + 'T00:00:00+08:00');
      var checkOutDate = new Date(reservation.checkOut + 'T23:59:59+08:00');
      var events = calendar.getEvents(checkInDate, checkOutDate);
      for (var i = 0; i < events.length; i++) {
        if (events[i].getTitle().indexOf(reservation.refId) !== -1 ||
            events[i].getDescription().indexOf(reservation.refId) !== -1) {
          event = events[i];
          break;
        }
      }
    }

    if (!event) {
      return { success: false, message: 'Event not found for update' };
    }

    var guests = reservation.guests || 2;
    var guestName = reservation.guestName || 'Guest';
    var refId = reservation.refId || 'N/A';
    var isTest = reservation.isTest || (typeof refId === 'string' && refId.indexOf('TEST-') === 0);
    var prefix = isTest ? '[TEST] ' : '';

    var startDate = new Date(reservation.checkIn + 'T14:00:00+08:00');
    var endDate = new Date(reservation.checkOut + 'T12:00:00+08:00');

    var title = prefix + 'Booking: ' + guestName + ' (' + guests + ' guests) - Ref #' + refId;
    var descLines = [
      'Booking Reference: ' + refId,
      'Guest Name: ' + guestName,
      'Email: ' + (reservation.guestEmail || 'N/A'),
      'Phone: ' + (reservation.guestPhone || 'N/A'),
      'Guests: ' + guests,
      'Channel: ' + (reservation.channel || 'direct'),
      'Check-in: ' + reservation.checkIn,
      'Check-out: ' + reservation.checkOut,
      'Parking: ' + (reservation.coveredParking ? ('Covered Slot (Plate: ' + (reservation.plateNumber || 'TBD') + ')') : 'None/Street'),
      'Status: ' + (reservation.bookingStatus || 'Confirmed')
    ];

    event.setTitle(title);
    event.setDescription(descLines.join('\n'));
    event.setTime(startDate, endDate);

    return {
      success: true,
      refId: refId,
      gcalEventId: event.getId(),
      htmlLink: 'https://calendar.google.com/calendar/u/0?cid=' + encodeURIComponent(CALENDAR_ID)
    };
  } catch (err) {
    Logger.log('gcalUpdateBookingEvent error: ' + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Deletes a Google Calendar booking event matching eventId or reservation refId.
 */
function gcalDeleteBookingEvent(eventId, refId) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return { success: false, message: 'Calendar not found: ' + CALENDAR_ID };

    var event = null;
    if (eventId) {
      try {
        event = calendar.getEventById(eventId);
      } catch (e) {
        event = null;
      }
    }

    if (!event && refId) {
      var now = new Date();
      var futureLimit = new Date();
      futureLimit.setFullYear(now.getFullYear() + 2);
      var pastLimit = new Date();
      pastLimit.setFullYear(now.getFullYear() - 1);

      var events = calendar.getEvents(pastLimit, futureLimit);
      for (var i = 0; i < events.length; i++) {
        if (events[i].getTitle().indexOf(refId) !== -1 ||
            events[i].getDescription().indexOf(refId) !== -1) {
          event = events[i];
          break;
        }
      }
    }

    if (!event) {
      // If already gone, return success idempotently
      return { success: true, deletedEventId: eventId || refId, note: 'Event already removed or not found' };
    }

    var deletedId = event.getId();
    event.deleteEvent();
    return { success: true, deletedEventId: deletedId };
  } catch (err) {
    Logger.log('gcalDeleteBookingEvent error: ' + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Lists Google Calendar events for availability calculation.
 */
function gcalListEvents(fromDateStr, toDateStr) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return { success: false, events: [], message: 'Calendar not found' };

    var start = fromDateStr ? new Date(fromDateStr + 'T00:00:00+08:00') : new Date();
    var end = toDateStr ? new Date(toDateStr + 'T23:59:59+08:00') : new Date(start.getTime() + 180 * 86400000);

    var rawEvents = calendar.getEvents(start, end);
    var events = rawEvents.map(function(e) {
      return {
        id: e.getId(),
        summary: e.getTitle(),
        start: { dateTime: e.getStartTime().toISOString() },
        end: { dateTime: e.getEndTime().toISOString() },
        htmlLink: 'https://calendar.google.com/calendar/u/0?cid=' + encodeURIComponent(CALENDAR_ID)
      };
    });

    return { success: true, events: events };
  } catch (err) {
    Logger.log('gcalListEvents error: ' + err.toString());
    return { success: false, events: [], error: err.toString() };
  }
}

