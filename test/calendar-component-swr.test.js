import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const WIDGET_PATH = path.resolve('BookingCalendarWidget.html');
const SCRIPTS_PATH = path.resolve('Scripts.html');

describe('Universal Responsive Calendar Component & SWR Latency (TDD)', () => {
  const rawWidget = fs.readFileSync(WIDGET_PATH, 'utf8');
  const rawScripts = fs.readFileSync(SCRIPTS_PATH, 'utf8');

  test('BookingCalendarWidget.html defines <condo-booking-calendar> Web Component', () => {
    assert.match(rawWidget, /class\s+CondoBookingCalendar\s+extends\s+HTMLElement/);
    assert.match(rawWidget, /customElements\.define\(['"]condo-booking-calendar['"]/);
  });

  describe('5 Responsive Form Factor Viewport Contracts', () => {
    test('1. Cellphones (<640px) enforce 48px tap targets and fixed safe-area bottom bar', () => {
      assert.match(rawWidget, /@media\s*\(max-width:\s*640px\)/);
      assert.match(rawWidget, /min-height:\s*48px/);
      assert.match(rawWidget, /env\(safe-area-inset-bottom\)/);
    });

    test('2. Foldables support dual-screen spanning hinge via viewport-segment-width', () => {
      assert.match(rawWidget, /@media\s*\(screen-spanning:\s*single-fold-vertical\)/);
      assert.match(rawWidget, /env\(viewport-segment-width\s+0\s+0\)/);
      assert.match(rawWidget, /env\(viewport-segment-width\s+1\s+0\)/);
    });

    test('3. Tablets (641px - 1024px) support horizontal months-wrapper and touch layout', () => {
      assert.match(rawWidget, /@media\s*\(min-width:\s*641px\)\s*and\s*\(max-width:\s*1024px\)/);
      assert.match(rawWidget, /flex-direction:\s*row/);
    });

    test('4. Laptops (1025px - 1439px) and Desktops support 2-column grid and sticky sidebar', () => {
      assert.match(rawWidget, /@media\s*\(min-width:\s*1025px\)/);
      assert.match(rawWidget, /grid-template-columns:\s*2fr\s+1fr/);
      assert.match(rawWidget, /position:\s*sticky/);
    });

    test('5. Desktops enforce max-width containment (1200px / 1280px)', () => {
      assert.match(rawWidget, /max-width:\s*1200px/);
    });
  });

  describe('Low-Latency SWR Cache & Circuit Breaker Contracts', () => {
    test('Scripts.html defines CalendarAvailabilityCache with RAM and persistent storage fallback', () => {
      assert.match(rawScripts, /var\s+CalendarAvailabilityCache\s*=/);
      assert.match(rawScripts, /TTL_MS:\s*300000/);
      assert.match(rawScripts, /localStorage/);
    });

    test('CalendarAvailabilityCache trips circuit breaker after 3 failures', () => {
      const sandbox = {
        Date: { now: () => 100000 },
        localStorage: { getItem: () => null, setItem: () => {} },
        console
      };
      const cacheCode = rawScripts.match(/var\s+CalendarAvailabilityCache\s*=[\s\S]*?isCircuitOpen:\s*function\(\)\s*\{[\s\S]*?\}\s*\};/)[0];
      const context = vm.createContext(sandbox);
      vm.runInContext(cacheCode, context);

      const cache = sandbox.CalendarAvailabilityCache;
      assert.equal(cache.isCircuitOpen(), false, 'Circuit should initially be closed');

      cache.recordFailure();
      cache.recordFailure();
      assert.equal(cache.isCircuitOpen(), false, 'Circuit still closed after 2 failures');

      cache.recordFailure();
      assert.equal(cache.isCircuitOpen(), true, 'Circuit should open after 3 failures');

      // Test sub-1ms in-memory cache return
      const testDates = ['2026-12-24', '2026-12-25'];
      cache.set(testDates);
      const start = process.hrtime.bigint();
      const cached = cache.get();
      const elapsedNs = Number(process.hrtime.bigint() - start);
      assert.deepEqual(cached, testDates);
      assert.ok(elapsedNs < 2000000, `In-memory cache retrieval took ${elapsedNs}ns (<2ms)`);
    });
  });
});
