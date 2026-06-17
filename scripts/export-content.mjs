/* ============================================================
   export-content.mjs — seed exporter for the portfolio CMS.

   Reads the named exports from ../src/data/content.js (the single
   source of truth for all site copy) and writes them to
   ../api/content.seed.json, keyed by the 18 canonical SECTION_KEYS.

   install.php loads that JSON to seed the `sections` table on first
   install. Any export NOT in SECTION_KEYS is ignored; any SECTION_KEY
   missing from content.js is reported as a warning (but still produces
   a valid file so the install can proceed).

   Run from the repo root (package.json has "type":"module"):
     node scripts/export-content.mjs
   ============================================================ */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// The 18 top-level content sections the CMS stores, in canonical order.
const SECTION_KEYS = [
  'meta', 'nav', 'hero', 'ticker', 'stats', 'clients', 'about',
  'services', 'engagements', 'cases', 'workIndex', 'spotlight',
  'stack', 'journey', 'process', 'voices', 'faq', 'contact',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src/data/content.js');
const OUT = resolve(__dirname, '../api/content.seed.json');

// Pull in every named export; we cherry-pick the 18 keys below.
const content = await import(SRC);

const seed = {};
const missing = [];
for (const key of SECTION_KEYS) {
  if (Object.prototype.hasOwnProperty.call(content, key) && content[key] !== undefined) {
    seed[key] = content[key];
  } else {
    missing.push(key);
  }
}

// Note any exports that exist but aren't part of the CMS contract.
const ignored = Object.keys(content).filter(
  (k) => k !== 'default' && !SECTION_KEYS.includes(k)
);

writeFileSync(OUT, JSON.stringify(seed, null, 2) + '\n', 'utf8');

const found = Object.keys(seed);
console.log(`Wrote ${OUT}`);
console.log(`Sections written (${found.length}/${SECTION_KEYS.length}): ${found.join(', ')}`);
if (ignored.length) {
  console.log(`Ignored non-section exports: ${ignored.join(', ')}`);
}
if (missing.length) {
  console.warn(`WARNING — missing SECTION_KEYS (not exported by content.js): ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('All 18 SECTION_KEYS present.');
}
