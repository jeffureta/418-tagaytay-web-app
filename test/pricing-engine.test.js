import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPERTY_INFO,
  ONLINE_AVERAGE_MARKET_RATE,
  COMPETITOR_UNDERCUT_PHP,
  getSeasonForDate,
  getHolidayOrEvent,
  calculateNightlyPrice,
  calculateStayQuote,
  formatPhp
} from '../pricing-engine.js';

describe('Zero-Latency Dynamic Pricing Engine with Live DB Average (TDD)', () => {
  test('PROPERTY_INFO holds accurate property, unit, and capacity metadata', () => {
    assert.equal(PROPERTY_INFO.unitNumber, 'Unit 418');
    assert.equal(PROPERTY_INFO.condoName, 'Serin East Tagaytay');
    assert.ok(PROPERTY_INFO.fullAddress.includes('Unit 418 Serin East Tagaytay'));
    assert.ok(PROPERTY_INFO.fullAddress.includes('Brgy. Silang Crossing East'));
    assert.ok(PROPERTY_INFO.fullAddress.includes('Tagaytay City'));
    assert.ok(PROPERTY_INFO.fullAddress.includes('4120'));
    assert.equal(PROPERTY_INFO.competitorRadiusKm, 10);
    assert.equal(PROPERTY_INFO.baseGuestsIncluded, 4);
    assert.equal(PROPERTY_INFO.maxGuests, 6);
    assert.equal(PROPERTY_INFO.extraGuestFeePerNight, 400);
  });

  test('formatPhp formats numbers as Philippine Peso strings', () => {
    assert.equal(formatPhp(3340), '₱3,340');
    assert.equal(formatPhp(0), '₱0');
    assert.equal(formatPhp(14292), '₱14,292');
  });

  test('ONLINE_AVERAGE_MARKET_RATE and COMPETITOR_UNDERCUT_PHP reflect DB pricing rules', () => {
    assert.equal(ONLINE_AVERAGE_MARKET_RATE, 3840);
    assert.equal(COMPETITOR_UNDERCUT_PHP, 0);
  });

  test('getSeasonForDate accurately classifies Tagaytay microclimate seasons', () => {
    const dec = getSeasonForDate('2026-12-15');
    assert.equal(dec.code, 'AMIHAN_COOL');

    const mar = getSeasonForDate('2026-03-10');
    assert.equal(mar.code, 'SUMMER_ESCAPE');

    const jul = getSeasonForDate('2026-07-15');
    assert.equal(jul.code, 'HABAGAT_RAINY');

    const nov = getSeasonForDate('2026-11-12');
    assert.equal(nov.code, 'BER_SHOULDER');
  });

  test('getHolidayOrEvent recognizes Philippine official holidays & Tagaytay peak dates', () => {
    assert.ok(getHolidayOrEvent('2026-12-25'));
    assert.ok(getHolidayOrEvent('2026-02-14'));
    assert.ok(getHolidayOrEvent('2026-04-03'));
    assert.ok(getHolidayOrEvent('2026-11-01'));
    assert.equal(getHolidayOrEvent('2026-11-18'), null);
  });

  test('calculateNightlyPrice sets marketRate to DB average (3840) and unitRate with 0 undercut', () => {
    const testDates = [
      '2026-11-10', // Weekday
      '2026-11-14', // Weekend
      '2026-12-25', // Holiday Peak
      '2027-01-01'  // New Year Peak
    ];

    for (const d of testDates) {
      const price = calculateNightlyPrice(d);
      assert.equal(price.marketRate, 3840, `marketRate for ${d} should match online average 3840`);
      assert.equal(price.savings, 0, `Savings for ${d} must be 0`);
      assert.equal(price.unitRate, 3840, `unitRate for ${d} should equal market rate 3840`);
    }
  });

  test('calculateNightlyPrice supports custom market average override', () => {
    const custom = calculateNightlyPrice('2026-11-10', 4000);
    assert.equal(custom.marketRate, 4000);
    assert.equal(custom.unitRate, 4000);
    assert.equal(custom.savings, 0);
  });

  test('calculateStayQuote calculates total, multi-night discount, and extra guest fees based on 3840/night', () => {
    // 2-night stay for 2 guests
    // Nightly rate: 3840. Subtotal: 7680. Market: 7680. Savings: 0.
    const quote2Nights = calculateStayQuote('2026-11-10', '2026-11-12', 2);
    assert.equal(quote2Nights.nights, 2);
    assert.equal(quote2Nights.guestCount, 2);
    assert.equal(quote2Nights.extraGuests, 0);
    assert.equal(quote2Nights.marketSubtotal, 7680);
    assert.equal(quote2Nights.baseUnitSubtotal, 7680);
    assert.equal(quote2Nights.competitorUndercutSavings, 0);
    assert.equal(quote2Nights.longStayDiscountAmount, 0);
    assert.equal(quote2Nights.extraGuestFeeTotal, 0);
    assert.equal(quote2Nights.totalPrice, 7680);
    assert.equal(quote2Nights.totalSavingsVsMarket, 0);

    // 4-night stay for 5 guests
    // Base unit subtotal: 4 * 3840 = 15360
    // Multi-night discount removed: 0
    // Extra guest fee: 1 extra guest * 400 * 4 nights = 1600
    // Total price = 15360 + 1600 = 16960
    const quote4Nights5Guests = calculateStayQuote('2026-11-10', '2026-11-14', 5);
    assert.equal(quote4Nights5Guests.nights, 4);
    assert.equal(quote4Nights5Guests.extraGuests, 1);
    assert.equal(quote4Nights5Guests.baseUnitSubtotal, 15360);
    assert.equal(quote4Nights5Guests.longStayDiscountRate, 0);
    assert.equal(quote4Nights5Guests.longStayDiscountAmount, 0);
    assert.equal(quote4Nights5Guests.longStayDiscountLabel, null);
    assert.equal(quote4Nights5Guests.extraGuestFeeTotal, 1600);
    assert.equal(quote4Nights5Guests.totalPrice, 16960);

    // 7-night stay (multi-night discounts removed)
    // Base: 7 * 3840 = 26880
    // Discount: 0
    // Total for 4 guests: 26880
    const quote7Nights = calculateStayQuote('2026-11-10', '2026-11-17', 4);
    assert.equal(quote7Nights.nights, 7);
    assert.equal(quote7Nights.baseUnitSubtotal, 26880);
    assert.equal(quote7Nights.longStayDiscountRate, 0);
    assert.equal(quote7Nights.longStayDiscountAmount, 0);
    assert.equal(quote7Nights.longStayDiscountLabel, null);
    assert.equal(quote7Nights.totalPrice, 26880);
  });
});
