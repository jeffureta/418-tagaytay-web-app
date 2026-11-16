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

