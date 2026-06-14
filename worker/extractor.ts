// ============================================================
// worker/extractor.ts — Extract values from HTML by monitor type
// ============================================================
// Phase 1: full_page  — strip non-content tags, normalize text
// Phase 2: css_selector, keyword_appears/disappears, price_drop
// ============================================================

import * as cheerio from 'cheerio';
import { createLogger } from './logger';

const log = createLogger('extractor');

// ── Types ───────────────────────────────────────────────────

/**
 * The five monitor types from the schema.
 * Phase 1 only implements 'full_page'.
 */
export type MonitorType =
  | 'full_page'
  | 'css_selector'
  | 'keyword_appears'
  | 'keyword_disappears'
  | 'price_drop';

/** Configuration needed for extraction, pulled from the monitor row. */
export interface ExtractorConfig {
  type: MonitorType;
  /** CSS selector — used by css_selector and price_drop types. */
  selector?: string | null;
  /** Keyword — used by keyword_appears/keyword_disappears types. */
  keyword?: string | null;
}

// ── Tags stripped in full_page mode ─────────────────────────
// These elements rarely contain user-visible "content" and would
// cause false-positive change detections on every nav/footer tweak.

const REMOVE_TAGS = [
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  'iframe',
  'svg',
  'link',
  'meta',
] as const;

// ── Full-page extraction ────────────────────────────────────

/**
 * Extracts the visible text content from an HTML page:
 * 1. Loads HTML into cheerio
 * 2. Removes non-content tags (scripts, styles, nav, etc.)
 * 3. Pulls the remaining text
 * 4. Collapses all whitespace (newlines, tabs, multiple spaces → single space)
 * 5. Trims leading/trailing whitespace
 *
 * The result is a single normalized string that can be reliably
 * compared between checks without noise from formatting changes.
 */
function extractFullPage(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  for (const tag of REMOVE_TAGS) {
    $(tag).remove();
  }

  // Also remove HTML comments
  $('*')
    .contents()
    .filter(function () {
      return this.type === 'comment';
    })
    .remove();

  // Extract text and normalize whitespace
  const rawText = $('body').text();
  const normalized = rawText
    .replace(/\s+/g, ' ')  // collapse all whitespace
    .trim();

  log.debug(`Extracted ${normalized.length} chars from full page`);
  return normalized;
}

// ── Phase 2 Placeholders ────────────────────────────────────

/** Phase 2: Extract text from a specific CSS selector. */
function extractCssSelector(html: string, selector: string): string {
  const $ = cheerio.load(html);
  const el = $(selector);
  if (el.length === 0) {
    throw new Error(`Selector "${selector}" matched no elements`);
  }
  const text = el.text().replace(/\s+/g, ' ').trim();
  log.debug(`CSS selector "${selector}" → ${text.length} chars`);
  return text;
}

/** Phase 2: Check if a keyword is present in the page text. */
function extractKeyword(html: string, keyword: string): string {
  const $ = cheerio.load(html);
  for (const tag of REMOVE_TAGS) {
    $(tag).remove();
  }
  const text = $('body').text().toLowerCase();
  const found = text.includes(keyword.toLowerCase());
  // We return "found" or "not_found" as the observed_value so the
  // detector can compare it with the previous state.
  return found ? 'found' : 'not_found';
}

/** Phase 2: Extract a numeric price from a CSS selector. */
function extractPrice(html: string, selector: string): string {
  const $ = cheerio.load(html);
  const el = $(selector);
  if (el.length === 0) {
    throw new Error(`Price selector "${selector}" matched no elements`);
  }
  const raw = el.text().replace(/[^0-9.,]/g, '');
  // Parse price — handles "1,299.99" and "1.299,99" (EU format)
  const price = parseFloat(raw.replace(/,/g, ''));
  if (isNaN(price)) {
    throw new Error(`Could not parse price from "${el.text().trim()}"`);
  }
  return price.toFixed(2);
}

// ── Public API ──────────────────────────────────────────────

/**
 * Routes extraction to the correct strategy based on monitor type.
 *
 * @param html   - Raw HTML fetched from the page
 * @param config - Monitor type and type-specific config
 * @returns Normalized string value for comparison
 * @throws  If extraction fails (bad selector, missing keyword, etc.)
 */
export function extractValue(html: string, config: ExtractorConfig): string {
  switch (config.type) {
    case 'full_page':
      return extractFullPage(html);

    case 'css_selector':
      if (!config.selector) throw new Error('css_selector type requires a selector');
      return extractCssSelector(html, config.selector);

    case 'keyword_appears':
    case 'keyword_disappears':
      if (!config.keyword) throw new Error(`${config.type} type requires a keyword`);
      return extractKeyword(html, config.keyword);

    case 'price_drop':
      if (!config.selector) throw new Error('price_drop type requires a selector');
      return extractPrice(html, config.selector);

    default:
      throw new Error(`Unknown monitor type: ${config.type}`);
  }
}
