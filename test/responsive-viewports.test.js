import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPTS_PATH = path.resolve('Scripts.html');
const STYLES_PATH = path.resolve('Styles.html');
const INDEX_PATH = path.resolve('Index.html');
const QR_PATH = path.resolve('QrGuide.html');
const CODE_GS_PATH = path.resolve('Code.gs');
const CODE_JS_PATH = path.resolve('Code.js');

describe('Universal Responsive Viewports & QR Guide Contracts (TDD)', () => {
  const rawStyles = fs.readFileSync(STYLES_PATH, 'utf8');
  const rawIndex = fs.readFileSync(INDEX_PATH, 'utf8');
  const rawCodeGs = fs.readFileSync(CODE_GS_PATH, 'utf8');
  const rawCodeJs = fs.existsSync(CODE_JS_PATH) ? fs.readFileSync(CODE_JS_PATH, 'utf8') : '';

  describe('Breakpoint Static Contracts & Layout Modularity', () => {
    test('Styles.html defines CSS custom properties for container max-width and responsive spacing', () => {
      assert.match(rawStyles, /--container-max-width:\s*1280px/, 'Styles.html should define --container-max-width: 1280px');
      assert.match(rawStyles, /--space-xs:/, 'Styles.html should define --space-xs');
      assert.match(rawStyles, /--space-lg:/, 'Styles.html should define --space-lg');
    });

    test('Styles.html supports Mobile (<600px) with single-column layout and >=44px touch targets', () => {
      assert.match(rawStyles, /@media\s*\(\s*max-width:\s*599px\s*\)|@media\s*\(\s*max-width:\s*600px\s*\)/, 'Should contain mobile breakpoint (<600px)');
      assert.match(rawStyles, /min-height:\s*44px/, 'Should enforce 44px min-height for touch targets');
    });

    test('Styles.html supports Foldables and Small Tablets (600px - 768px)', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*600px\s*\)/, 'Should contain foldable/tablet min-width: 600px breakpoint');
    });

    test('Styles.html supports Tablets (768px - 1024px) with multi-column booking layout', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*768px\s*\)/, 'Should contain tablet min-width: 768px breakpoint');
      assert.match(rawStyles, /grid-template-columns:\s*[^;]*(1fr\s+1fr|1\.2fr\s+0\.8fr|minmax)/, 'Should declare multi-column grid at tablet/laptop tier');
    });

    test('Styles.html supports Laptops & Desktops (>=1024px and >=1440px)', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*1024px\s*\)/, 'Should contain laptop min-width: 1024px breakpoint');
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*1440px\s*\)/, 'Should contain wide desktop min-width: 1440px breakpoint');
    });

    test('Styles.html adapts AI Concierge chat widget between bottom drawer and floating docked card', () => {
      // Mobile drawer vs Desktop docked
      assert.match(rawStyles, /\.ai-chat-drawer\s*\{[^}]*position:\s*fixed/, 'ai-chat-drawer must be fixed');
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*\.ai-chat-drawer\s*\{[\s\S]*width:\s*380px/, 'Tablet/desktop must style drawer as floating docked card');
    });
  });

  describe('doGet Routing for ?view=qr and In-Unit QR Appliance Guide', () => {
    test('Code.gs and Code.js route view=qr to QrGuide template', () => {
      assert.match(rawCodeGs, /createTemplateFromFile\(['"]QrGuide['"]\)/, 'Code.gs must route view=qr to QrGuide');
      if (rawCodeJs) {
        assert.match(rawCodeJs, /createTemplateFromFile\(['"]QrGuide['"]\)/, 'Code.js must route view=qr to QrGuide');
      }
    });

    test('QrGuide.html exists and contains comprehensive appliance guides and emergency contacts', () => {
      assert.ok(fs.existsSync(QR_PATH), 'QrGuide.html file must exist');
      const rawQr = fs.readFileSync(QR_PATH, 'utf8');

      // Wi-Fi details
      assert.match(rawQr, /Serin418_Guest_5G/, 'QrGuide must include Wi-Fi SSID');
      // Appliance sections
      assert.match(rawQr, /Induction Cooker|Induction Stove/i, 'QrGuide must include Induction cooker guide');
      assert.match(rawQr, /Shower Water Heater|Water Heater/i, 'QrGuide must include Water heater guide');
      assert.match(rawQr, /Smart Lock|Keyless Check-In/i, 'QrGuide must include Smart Lock instructions');
      assert.match(rawQr, /Check-out Checklist|Checkout Checklist/i, 'QrGuide must include Checkout checklist');
      // Pre-arrival clearance link
      assert.match(rawQr, /serineasttagaytayendorsement\.carrd\.co/, 'QrGuide must link to pre-arrival endorsement gate');
      // Responsive viewport meta tag
      assert.match(rawQr, /viewport-fit=cover/, 'QrGuide must include viewport-fit=cover');
    });
  });
});

describe('Responsive Layout Grid Integration Contracts', () => {
  const rawIndex = fs.readFileSync(INDEX_PATH, 'utf8');
  const rawQr = fs.readFileSync(QR_PATH, 'utf8');

  test('Index.html wraps booking calendar and guest inputs with responsive layout hooks', () => {
    assert.match(rawIndex, /class="booking-wrapper/, 'Index.html must have booking-wrapper');
    assert.match(rawIndex, /class="booking-main/, 'Index.html must have booking-main');
    assert.match(rawIndex, /id="bookingForm"/, 'Index.html must have bookingForm');
  });

  test('QrGuide.html includes quick-nav pills and all appliance sections with semantic IDs', () => {
    assert.match(rawQr, /id="wifiSection"/, 'QrGuide must have wifiSection');
    assert.match(rawQr, /id="smartLockSection"/, 'QrGuide must have smartLockSection');
    assert.match(rawQr, /id="inductionSection"/, 'QrGuide must have inductionSection');
    assert.match(rawQr, /id="waterHeaterSection"/, 'QrGuide must have waterHeaterSection');
    assert.match(rawQr, /id="amenitiesSection"/, 'QrGuide must have amenitiesSection');
    assert.match(rawQr, /id="checkoutSection"/, 'QrGuide must have checkoutSection');
  });
});
