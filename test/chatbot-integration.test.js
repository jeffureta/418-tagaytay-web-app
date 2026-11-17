import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const WIDGET_PATH = path.resolve('ChatBotWidget.html');
const CORE_GS_PATH = path.resolve('ChatBotCore.gs');
const STYLES_PATH = path.resolve('Styles.html');
const INDEX_PATH = path.resolve('Index.html');
const QR_PATH = path.resolve('QrGuide.html');

describe('418-serin-tagaytay-chat-bot Integration & 5 Responsive Viewport Contracts (TDD)', () => {
  const rawWidget = fs.readFileSync(WIDGET_PATH, 'utf8');
  const rawCoreGs = fs.readFileSync(CORE_GS_PATH, 'utf8');
  const rawStyles = fs.readFileSync(STYLES_PATH, 'utf8');
  const rawIndex = fs.readFileSync(INDEX_PATH, 'utf8');
  const rawQr = fs.readFileSync(QR_PATH, 'utf8');

  describe('Core ChatBot Architecture & V8 GS Contracts', () => {
    test('ChatBotCore.gs exists, defines ChatBotSdk with OptionTree and matchFaq', () => {
      assert.ok(fs.existsSync(CORE_GS_PATH));
      assert.match(rawCoreGs, /var\s+ChatBotSdk\s*=/);
      assert.match(rawCoreGs, /createCore:\s*function/);

      // Execute in V8 VM sandbox to verify syntax
      const sandbox = { console };
      vm.createContext(sandbox);
      vm.runInContext(rawCoreGs, sandbox);
      const core = sandbox.ChatBotSdk.createCore();
      assert.ok(core.getMenu('root'), 'Must return root menu');
      assert.equal(core.getMenu('root').id, 'root');

      // Test FAQ match
      const faq = core.matchFaq('pwede ba magluto ng tuyo?');
      assert.ok(faq, 'Must match cooking FAQ');
      assert.equal(faq.id, 'cooking');
    });

    test('ChatBotWidget.html defines #condo-chatbot-widget and core UI controls', () => {
      assert.ok(fs.existsSync(WIDGET_PATH));
      assert.match(rawWidget, /id="condo-chatbot-widget"/, 'Must contain #condo-chatbot-widget');
      assert.match(rawWidget, /id="chatbotMessages"/, 'Must contain #chatbotMessages');
      assert.match(rawWidget, /id="chatbotQuickActions"/, 'Must contain #chatbotQuickActions');
      assert.match(rawWidget, /id="chatbotInput"/, 'Must contain #chatbotInput');
      assert.match(rawWidget, /id="chatbotSendBtn"/, 'Must contain #chatbotSendBtn');
    });

    test('ChatBotWidget.html cleanly removes engine badge and header title', () => {
      assert.doesNotMatch(rawWidget, /id="engineBadge"/);
      assert.doesNotMatch(rawWidget, /id="chatbotHeaderTitle"/);
      assert.doesNotMatch(rawWidget, /Deterministic NLU/);
      assert.match(rawWidget, /aria-label="Chat Bot"/);
    });
  });

  describe('5 Responsive Form Factor Viewport Contracts', () => {
    test('1. Cellphones (<640px) enforce bottom drawer, safe-area inset, 48px tap targets, and swipe chip rail', () => {
      assert.match(rawStyles, /@media\s*\(\s*max-width:\s*640px\s*\)/, 'Styles.html must define max-width: 640px tier');
      assert.match(rawStyles, /env\(\s*safe-area-inset-bottom[^)]*\)/, 'Must respect safe-area-inset-bottom for mobile home bars');
      assert.match(rawStyles, /min-height:\s*48px/, 'Must enforce 48px touch targets for mobile accessibility');
      assert.match(rawStyles, /overflow-x:\s*auto/, 'Must support horizontal scroll / swipe rail for quick action chips');
    });

    test('2. Foldables support dual-screen spanning hinge via viewport-segment-width', () => {
      assert.match(rawStyles, /@media\s*\(\s*screen-spanning:\s*single-fold-vertical\s*\)/, 'Styles.html must define foldable media query');
      assert.match(rawStyles, /env\(\s*viewport-segment-width/, 'Styles.html must utilize viewport-segment-width for foldable layout');
    });

    test('3. Tablets (641px - 1024px) support floating docked window (380px) and wrap layout', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*641px\s*\)\s*and\s*\(\s*max-width:\s*1024px\s*\)/, 'Styles.html must define tablet breakpoint');
      assert.match(rawStyles, /width:\s*380px/, 'Tablet widget must have 380px fixed width');
    });

    test('4. Laptops (1025px - 1439px) support docked card and desktop styling', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*1025px\s*\)/, 'Styles.html must define laptop breakpoint');
    });

    test('5. Desktops enforce max-width containment (380px - 420px)', () => {
      assert.match(rawStyles, /@media\s*\(\s*min-width:\s*1440px\s*\)/, 'Styles.html must define desktop breakpoint');
    });
  });

  describe('Layout & Page Inclusion Contracts', () => {
    test('Index.html and QrGuide.html include ChatBotWidget and launcher trigger', () => {
      assert.match(rawIndex, /<\?!=\s*include\(['"]ChatBotWidget['"]\);\s*\?>/, 'Index.html must include ChatBotWidget');
      assert.match(rawIndex, /id="condoChatbotLauncher"/, 'Index.html must include #condoChatbotLauncher');

      assert.match(rawQr, /<\?!=\s*include\(['"]ChatBotWidget['"]\);\s*\?>/, 'QrGuide.html must include ChatBotWidget');
      assert.match(rawQr, /id="condoChatbotLauncher"/, 'QrGuide.html must include #condoChatbotLauncher');
    });

    test('Legacy chat drawer markup is cleanly removed from Index.html and QrGuide.html', () => {
      assert.doesNotMatch(rawIndex, /id="aiChatDrawer"/, 'Index.html must not contain legacy #aiChatDrawer');
      assert.doesNotMatch(rawIndex, /id="aiChatResumeBanner"/, 'Index.html must not contain legacy #aiChatResumeBanner');
      assert.doesNotMatch(rawQr, /id="aiChatDrawer"/, 'QrGuide.html must not contain legacy #aiChatDrawer');
    });
  });
});
