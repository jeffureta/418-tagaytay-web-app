import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SYNC_ENGINE_PATH = path.resolve('SyncEngine.gs');
const CODE_GS_PATH = path.resolve('Code.gs');

describe('SyncEngine.gs & Code.gs JSON-RPC Contracts (TDD)', () => {
  test('SyncEngine.gs exists and parses as valid JavaScript V8 syntax', () => {
    assert.ok(fs.existsSync(SYNC_ENGINE_PATH), 'SyncEngine.gs must exist');
    const content = fs.readFileSync(SYNC_ENGINE_PATH, 'utf8');
    assert.doesNotThrow(() => {
      new vm.Script(content);
    }, 'SyncEngine.gs must be syntactically valid in V8');
  });

  test('SyncEngine.gs contains core sync and ops ledger routines', () => {
    const content = fs.readFileSync(SYNC_ENGINE_PATH, 'utf8');
    assert.match(content, /function syncCalendarToSheetsLedger\(\)/, 'Must define syncCalendarToSheetsLedger');
    assert.match(content, /function syncSheetReservationToCalendar\(/, 'Must define syncSheetReservationToCalendar');
    assert.match(content, /function getSheetReservationsLedger\(\)/, 'Must define getSheetReservationsLedger');
  });

  test('Code.gs provides JSON-RPC endpoints for syncPull, lookupReservation, and syncPush', () => {
    const content = fs.readFileSync(CODE_GS_PATH, 'utf8');
    assert.match(content, /action === 'syncPull'/, 'Code.gs must handle syncPull action in doGet');
    assert.match(content, /action === 'lookupReservation'/, 'Code.gs must handle lookupReservation action in doGet');
    assert.match(content, /action === 'syncPush'/, 'Code.gs must handle syncPush action in doPost');
    assert.match(content, /action === 'releaseLockPin'/, 'Code.gs must handle releaseLockPin action in doPost');
  });

  test('SyncEngine.gs defines Google Calendar direct CRUD functions', () => {
    const content = fs.readFileSync(SYNC_ENGINE_PATH, 'utf8');
    assert.match(content, /function gcalCreateBookingEvent\(/, 'Must define gcalCreateBookingEvent');
    assert.match(content, /function gcalUpdateBookingEvent\(/, 'Must define gcalUpdateBookingEvent');
    assert.match(content, /function gcalDeleteBookingEvent\(/, 'Must define gcalDeleteBookingEvent');
    assert.match(content, /function gcalListEvents\(/, 'Must define gcalListEvents');
  });

  test('Code.gs routes gcalCreateEvent, gcalUpdateEvent, and gcalDeleteEvent in doPost', () => {
    const content = fs.readFileSync(CODE_GS_PATH, 'utf8');
    assert.match(content, /action === 'gcalCreateEvent'/, 'Must route gcalCreateEvent');
    assert.match(content, /action === 'gcalUpdateEvent'/, 'Must route gcalUpdateEvent');
    assert.match(content, /action === 'gcalDeleteEvent'/, 'Must route gcalDeleteEvent');
    assert.match(content, /action === 'gcalListEvents'/, 'Must route gcalListEvents');
  });
});
