// ============================================================
// worker/detector.ts — Compare extracted values to detect changes
// ============================================================
// Produces a human-readable diff summary when content changes.
// Handles first-check (baseline) as a special case.
// ============================================================

import { createLogger } from './logger';
import type { MonitorType } from './extractor';

const log = createLogger('detector');

// ── Types ───────────────────────────────────────────────────

export interface ChangeResult {
  /** Whether the value changed from the previous check. */
  changed: boolean;
  /** Human-readable diff summary (present only when changed=true). */
  diff?: string;
  /** True when this is the first-ever check (baseline capture). */
  isFirstCheck?: boolean;
}

// ── Diff helpers ────────────────────────────────────────────

/** Max characters in the diff summary — keeps alert emails readable. */
const MAX_DIFF_LENGTH = 500;

/**
 * Produces a simple word-level diff between two strings.
 *
 * Strategy: split both into word arrays, find added and removed words.
 * This is deliberately simple — we don't need a full Myers diff for
 * a change-detection notification. Keeps runtime O(n).
 */
function generateSimpleDiff(oldValue: string, newValue: string): string {
  const oldWords = new Set(oldValue.split(/\s+/).filter(Boolean));
  const newWords = new Set(newValue.split(/\s+/).filter(Boolean));

  const added: string[] = [];
  const removed: string[] = [];

  for (const word of newWords) {
    if (!oldWords.has(word)) added.push(word);
  }
  for (const word of oldWords) {
    if (!newWords.has(word)) removed.push(word);
  }

  const parts: string[] = [];

  if (removed.length > 0) {
    const removedText = removed.join(' ');
    parts.push(`Removed: ${truncate(removedText, MAX_DIFF_LENGTH / 2)}`);
  }
  if (added.length > 0) {
    const addedText = added.join(' ');
    parts.push(`Added: ${truncate(addedText, MAX_DIFF_LENGTH / 2)}`);
  }

  if (parts.length === 0) {
    // Words are the same but ordering changed — note that
    return 'Content order changed (same words, different arrangement)';
  }

  return truncate(parts.join('\n'), MAX_DIFF_LENGTH);
}

/** Truncates a string to `max` chars with an ellipsis marker. */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

// ── Public API ──────────────────────────────────────────────

/**
 * Compares the newly extracted value with the previously stored value.
 *
 * @param newValue - Value extracted from the current check
 * @param oldValue - Value from the previous check (null on first run)
 * @param type     - Monitor type (for type-specific comparison in Phase 2)
 * @returns Change result with diff summary if content changed
 */
export function detectChange(
  newValue: string,
  oldValue: string | null,
  type: MonitorType,
): ChangeResult {
  // ── First check: capture baseline, don't alert ──
  if (oldValue === null) {
    log.info('First check — capturing baseline snapshot');
    return { changed: false, isFirstCheck: true };
  }

  // ── Normalize for comparison ──
  // Already normalized in the extractor, but belt-and-suspenders
  const oldNorm = oldValue.replace(/\s+/g, ' ').trim();
  const newNorm = newValue.replace(/\s+/g, ' ').trim();

  if (oldNorm === newNorm) {
    log.debug('No change detected');
    return { changed: false };
  }

  // ── Change detected — generate diff summary ──
  log.info(`Change detected (${type}): old=${oldNorm.length} chars, new=${newNorm.length} chars`);

  const diff = generateDiffByType(oldNorm, newNorm, type);

  return { changed: true, diff };
}

/**
 * Dispatches to type-specific diff generators.
 * Phase 1 uses simple word diff for all types.
 */
function generateDiffByType(
  oldValue: string,
  newValue: string,
  type: MonitorType,
): string {
  switch (type) {
    case 'full_page':
    case 'css_selector':
      return generateSimpleDiff(oldValue, newValue);

    case 'keyword_appears':
      // Value is "found" or "not_found"
      return newValue === 'found'
        ? 'Keyword appeared on the page'
        : 'Keyword disappeared from the page';

    case 'keyword_disappears':
      return newValue === 'not_found'
        ? 'Keyword disappeared from the page'
        : 'Keyword reappeared on the page';

    case 'price_drop': {
      const oldPrice = parseFloat(oldValue);
      const newPrice = parseFloat(newValue);
      const delta = newPrice - oldPrice;
      const pct = ((delta / oldPrice) * 100).toFixed(1);
      return delta < 0
        ? `Price dropped: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${pct}%)`
        : `Price increased: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)} (+${pct}%)`;
    }

    default:
      return generateSimpleDiff(oldValue, newValue);
  }
}
