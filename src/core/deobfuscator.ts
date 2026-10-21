import type { ParsedIRealUrlResult } from '../types/ireal';

export const OBFUSCATION_PREFIX = '1r34LbKcu7';

/**
 * Applies the iReal Pro hussle algorithm to a 50-character block.
 * Swaps:
 *  - indices 0..4 with 49..45 (char[0] <-> char[49], char[1] <-> char[48], etc.)
 *  - indices 10..23 with 39..26 (char[10] <-> char[39], char[11] <-> char[38], etc.)
 */
export function hussle(block: string): string {
  if (block.length < 50) {
    return block;
  }

  const chars = block.split('');

  // Swap 0..4 with 49..45
  for (let i = 0; i < 5; i++) {
    const temp = chars[i];
    chars[i] = chars[49 - i];
    chars[49 - i] = temp;
  }

  // Swap 10..23 with 39..26
  for (let i = 0; i < 14; i++) {
    const temp = chars[10 + i];
    chars[10 + i] = chars[39 - i];
    chars[39 - i] = temp;
  }

  return chars.join('');
}

/**
 * Deobfuscates field 7 (obfuscated chord string) from iReal Pro.
 */
export function deobfuscateChordString(obfuscated: string): string {
  if (!obfuscated) return '';

  let text = obfuscated;

  // 1. Remove obfuscation prefix if present
  if (text.startsWith(OBFUSCATION_PREFIX)) {
    text = text.slice(OBFUSCATION_PREFIX.length);

    // 2. Process in chunks of 50 characters
    let unhussled = '';
    for (let i = 0; i < text.length; i += 50) {
      const chunk = text.slice(i, i + 50);
      unhussled += hussle(chunk);
    }
    text = unhussled;
  }

  // 3. Sequential token replacements
  text = text.replace(/XyQ/g, '   ');
  text = text.replace(/LZ/g, ' |');
  text = text.replace(/Kcl/g, '|x ');

  return text;
}

const KNOWN_ARTIST_MAP: Record<string, string> = {
  'Worship Gateway': 'Gateway Worship',
  'Music Bethel': 'Bethel Music',
  'Marquez Gerry': 'Gerry Marquez',
  'United Hillsong': 'Hillsong United',
  'Baloche Paul': 'Paul Baloche',
  'Tomlin Chris': 'Chris Tomlin',
  'Redman Matt': 'Matt Redman',
};

/**
 * Normalizes inverted artist/composer names (e.g. "Worship Gateway" -> "Gateway Worship",
 * "Music Bethel" -> "Bethel Music", "Marquez Gerry" -> "Gerry Marquez").
 * Also extracts clean display name from HTML export container if present.
 */
export function normalizeComposerName(raw: string, htmlContext?: string): string {
  if (!raw) return 'Unknown';
  let trimmed = raw.trim();

  // If HTML context provided, prefer the authentic export display name after `</a> - `
  if (htmlContext) {
    const htmlArtistMatch = htmlContext.match(/<a[^>]*>[^<]+<\/a>\s*-\s*([^<\n\r]+)/i);
    if (htmlArtistMatch && htmlArtistMatch[1]) {
      const extracted = htmlArtistMatch[1].replace(/<[^>]+>/g, '').trim();
      if (extracted.length > 0) {
        trimmed = extracted;
      }
    }
  }

  // Check known inverted mappings
  if (KNOWN_ARTIST_MAP[trimmed]) {
    return KNOWN_ARTIST_MAP[trimmed];
  }

  // Check if comma-separated "Lastname, Firstname"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return `${parts[1]} ${parts[0]}`;
    }
  }

  return trimmed;
}

/**
 * Extracts raw song fields from an iReal Pro HTML snippet, irealb:// URL, or decoded string.
 */
export function extractIRealSongs(input: string): ParsedIRealUrlResult[] {
  if (!input) return [];

  let raw = input.trim();

  // Unescape HTML entities like &amp; or &quot;
  raw = raw.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

  // If inside an HTML <a> tag or href attribute
  const hrefMatch = raw.match(/href=["']([^"']*(?:irealb|irealbook):\/\/[^"']+)["']/i);
  if (hrefMatch) {
    raw = hrefMatch[1];
  } else {
    // If irealb:// appears somewhere in the text, extract from it
    const schemeIdx = raw.search(/(?:irealb|irealbook):\/\//i);
    if (schemeIdx !== -1) {
      // Extract until next quote, whitespace or end of string
      const remainder = raw.slice(schemeIdx);
      const endMatch = remainder.match(/(?:irealb|irealbook):\/\/[^\s"'>]+/i);
      if (endMatch) {
        raw = endMatch[0];
      }
    } else if (raw.includes('<html') || raw.includes('<!DOCTYPE') || raw.includes('<head') || raw.includes('<body')) {
      // It is an HTML document without any iReal Pro songs!
      return [];
    }
  }

  // Strip scheme prefix
  if (raw.startsWith('irealb://')) {
    raw = raw.slice('irealb://'.length);
  } else if (raw.startsWith('irealbook://')) {
    raw = raw.slice('irealbook://'.length);
  }

  // Decode URI components (safely)
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    try {
      // In case of stray % signs, replace lone % with %25
      decoded = decodeURIComponent(raw.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
    } catch {
      decoded = raw;
    }
  }

  // Split multiple songs separated by ===
  const rawSongs = decoded.split('===').map(s => s.trim()).filter(s => s.length > 0);

  const songs: ParsedIRealUrlResult[] = [];

  for (const songStr of rawSongs) {
    const fields = songStr.split('=');
    if (fields.length < 7) continue;

    const chords = fields[6] || '';
    // Must contain authentic iReal chord scramble (1r34) or measure barlines (|, [, {)
    if (!chords.includes('1r34') && !chords.includes('|') && !chords.includes('[') && !chords.includes('{')) {
      continue;
    }

    const tempoNum = fields[8] ? parseInt(fields[8], 10) : undefined;
    const repeatsNum = fields[9] ? parseInt(fields[9], 10) : undefined;

    const rawComposer = fields[1]?.trim() || 'Unknown';
    const normalizedComposer = normalizeComposerName(rawComposer, input);

    songs.push({
      title: fields[0]?.trim() || 'Untitled',
      composer: normalizedComposer,
      reserved: fields[2]?.trim() || '',
      style: fields[3]?.trim() || 'Medium Swing',
      key: fields[4]?.trim() || 'C',
      tempoField: fields[5]?.trim() || '',
      obfuscatedChords: fields[6] || '',
      accompanimentStyle: fields[7]?.trim() || '',
      tempo: Number.isNaN(tempoNum) ? undefined : tempoNum,
      repeats: Number.isNaN(repeatsNum) ? undefined : repeatsNum,
    });
  }

  return songs;
}
