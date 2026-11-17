#!/usr/bin/env node
/**
 * Synchronizes ChatBotCore.gs and ChatBotWidget.html from sibling repo
 * /Users/jeffureta/repos/418-serin-tagaytay-chat-bot/dist
 * into 418-tagaytay-web-app.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SIBLING_DIST = path.resolve('/Users/jeffureta/repos/418-serin-tagaytay-chat-bot/dist');

if (!fs.existsSync(SIBLING_DIST)) {
  console.error(`[Sync ChatBot] Sibling dist directory not found: ${SIBLING_DIST}`);
  process.exit(1);
}

const files = ['ChatBotCore.gs', 'ChatBotWidget.html'];
let copied = 0;

for (const file of files) {
  const src = path.join(SIBLING_DIST, file);
  const dest = path.join(ROOT_DIR, file);

  if (fs.existsSync(src)) {
    const content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`[Sync ChatBot] Synchronized ${file} -> ${path.relative(ROOT_DIR, dest)} (${content.length} bytes)`);
    copied++;
  } else {
    console.warn(`[Sync ChatBot] Source file not found: ${src}`);
  }
}

console.log(`[Sync ChatBot] Completed. ${copied}/${files.length} files synchronized.`);
