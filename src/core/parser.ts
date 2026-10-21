import type { BarAST, ChordToken, RowAST, SectionAST, SongAST, ParsedIRealUrlResult, MeasureElement } from '../types/ireal';
import { deobfuscateChordString, normalizeComposerName } from './deobfuscator';

const CHORD_REGEX = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

/**
 * Maps standard iReal Pro chord representation to a clean user-facing format.
 * Specifically converts '-' to 'm' (e.g. E- -> Em, A-7 -> Am7, C-7b5 -> Cm7b5).
 */
export function formatChordQuality(quality: string): string {
  if (!quality) return '';
  let formatted = quality.replace(/-/g, 'm');
  if (formatted === '^') formatted = 'maj7';
  else if (formatted.startsWith('^')) formatted = 'maj' + formatted.slice(1);
  return formatted;
}

/**
 * Parses an individual chord token into root, quality, optional bass, and formatted text.
 */
export function parseChordToken(token: string): ChordToken | null {
  const cleanToken = token.trim();
  const match = cleanToken.match(CHORD_REGEX);
  if (!match) return null;

  const root = match[1];
  const quality = match[2] || '';
  const bass = match[3] || undefined;

  const displayQuality = formatChordQuality(quality);
  const displayText = bass
    ? `${root}${displayQuality}/${bass}`
    : `${root}${displayQuality}`;

  return {
    raw: cleanToken,
    root,
    quality,
    bass,
    displayText,
  };
}

/**
 * Resolves standard rehearsal marks and separates the boxed letter from its suffix.
 * e.g. *i + "tro" -> letter: 'I', suffix: 'tro', label: 'Intro'
 *      *v + "erso" -> letter: 'V', suffix: 'erso', label: 'Verso'
 *      *C + "oro" -> letter: 'C', suffix: 'oro', label: 'Coro'
 *      *B + "ridge (Puente)" -> letter: 'B', suffix: 'ridge (Puente)', label: 'Bridge (Puente)'
 */
function resolveSectionLabel(rawLetter: string, firstComment?: string): {
  label: string;
  letter: string;
  suffix: string;
  consumedComment: boolean;
} {
  const normLetter = rawLetter.toUpperCase();

  if (firstComment) {
    const cleanComment = firstComment.toLowerCase().trim();
    if (cleanComment.startsWith('oro final')) {
      return { label: 'Coro Final', letter: 'C', suffix: firstComment, consumedComment: true };
    }
    if (cleanComment.startsWith('puente')) {
      return { label: firstComment, letter: 'B', suffix: firstComment, consumedComment: true };
    }
    if (cleanComment.startsWith('intro solo')) {
      return { label: firstComment, letter: 'IN', suffix: firstComment, consumedComment: true };
    }
    if (normLetter === 'I' && (cleanComment.startsWith('tro') || cleanComment.startsWith('ntro'))) {
      return { label: 'Intro', letter: 'IN', suffix: 'tro', consumedComment: true };
    }
    if (normLetter === 'I' && (cleanComment.startsWith('strumental') || cleanComment.startsWith('nstrumental'))) {
      return { label: 'Instrumental', letter: 'IN', suffix: 'strumental', consumedComment: true };
    }
    if (normLetter === 'V' && (cleanComment.startsWith('erso') || cleanComment.startsWith('erse'))) {
      return { label: 'Verso', letter: 'V', suffix: 'erso', consumedComment: true };
    }
    if (normLetter === 'C' && (cleanComment.startsWith('oro') || cleanComment.startsWith('horus'))) {
      return { label: 'Coro', letter: 'C', suffix: 'oro', consumedComment: true };
    }
    if (normLetter === 'B' && (cleanComment.startsWith('ridge') || cleanComment.startsWith('uente'))) {
      return { label: 'Bridge (Puente)', letter: 'B', suffix: firstComment, consumedComment: true };
    }
    if ((normLetter === 'D' || normLetter === 'F') && (cleanComment.startsWith('inal') || cleanComment.startsWith('final'))) {
      const suffix = cleanComment.startsWith('inal') ? firstComment : cleanComment.startsWith('final') ? firstComment.slice(1) : firstComment;
      return { label: 'Final', letter: normLetter === 'D' ? 'D' : 'F', suffix: suffix, consumedComment: true };
    }
  }

  // Fallback defaults
  if (normLetter === 'I') return { label: 'Intro', letter: 'IN', suffix: 'tro', consumedComment: false };
  if (normLetter === 'V') return { label: 'Verso', letter: 'V', suffix: 'erso', consumedComment: false };
  if (normLetter === 'C') return { label: 'Coro', letter: 'C', suffix: 'oro', consumedComment: false };
  if (normLetter === 'D') return { label: 'Final', letter: 'D', suffix: 'Final', consumedComment: false };
  return { label: normLetter, letter: normLetter, suffix: '', consumedComment: false };
}

interface RawBarItem {
  leftBarline: '|' | '{' | '[';
  rightBarline: '|' | '}' | ']' | 'Z';
  raw: string;
  isRowBreakBefore?: boolean;
}

/**
 * Parses the deobfuscated chord string into raw measure tokens, tracking row breaks ('Y').
 */
function extractRawBars(cleaned: string): RawBarItem[] {
  let pos = 0;
  const len = cleaned.length;
  const bars: RawBarItem[] = [];
  let currentBar: RawBarItem | null = null;
  let pendingRowBreak = false;
  let inComment = false;

  function flushBar() {
    if (currentBar && (currentBar.raw.trim().length > 0 || currentBar.leftBarline !== '|' || currentBar.rightBarline !== '|')) {
      bars.push(currentBar);
    }
    currentBar = null;
  }

  while (pos < len) {
    const ch = cleaned[pos];
    if (ch === '<') {
      inComment = true;
      if (!currentBar) {
        currentBar = { leftBarline: '|', rightBarline: '|', raw: '', isRowBreakBefore: pendingRowBreak };
        pendingRowBreak = false;
      }
      currentBar.raw += ch;
      pos++;
      continue;
    }
    if (ch === '>') {
      inComment = false;
      if (!currentBar) {
        currentBar = { leftBarline: '|', rightBarline: '|', raw: '', isRowBreakBefore: pendingRowBreak };
        pendingRowBreak = false;
      }
      currentBar.raw += ch;
      pos++;
      continue;
    }
    if (inComment) {
      if (!currentBar) {
        currentBar = { leftBarline: '|', rightBarline: '|', raw: '', isRowBreakBefore: pendingRowBreak };
        pendingRowBreak = false;
      }
      currentBar.raw += ch;
      pos++;
      continue;
    }

    // 'Y' indicates a row break in iReal Pro
    if (ch === 'Y') {
      flushBar();
      pendingRowBreak = true;
      pos++;
      continue;
    }

    if (ch === '{' || ch === '[' || ch === '|') {
      flushBar();
      currentBar = {
        leftBarline: ch as '|' | '{' | '[',
        rightBarline: '|',
        raw: '',
        isRowBreakBefore: pendingRowBreak,
      };
      pendingRowBreak = false;
      pos++;
      continue;
    }

    if (ch === '}' || ch === ']' || ch === 'Z') {
      if (!currentBar) {
        currentBar = {
          leftBarline: '|',
          rightBarline: ch as '}' | ']' | 'Z',
          raw: '',
          isRowBreakBefore: pendingRowBreak,
        };
        pendingRowBreak = false;
      } else {
        currentBar.rightBarline = ch as '}' | ']' | 'Z';
      }
      flushBar();
      pos++;
      continue;
    }

    if (ch === '*') {
      if (currentBar && currentBar.raw.trim().length > 0) {
        flushBar();
        currentBar = { leftBarline: '|', rightBarline: '|', raw: '', isRowBreakBefore: pendingRowBreak };
        pendingRowBreak = false;
      }
    }

    if (!currentBar) {
      currentBar = {
        leftBarline: '|',
        rightBarline: '|',
        raw: '',
        isRowBreakBefore: pendingRowBreak,
      };
      pendingRowBreak = false;
    }
    currentBar.raw += ch;
    pos++;
  }
  flushBar();

  // Remove empty trailing bar if any
  return bars.filter((b, idx) => {
    if (idx === bars.length - 1 && b.raw.trim() === '' && b.rightBarline === '|') {
      return false;
    }
    return true;
  });
}

/**
 * Parses an individual bar content into structured BarAST with top & bottom annotations.
 */
function parseBarContent(rawBar: RawBarItem, barNumber: number): BarAST {
  let text = rawBar.raw;
  const allAnnotations: string[] = [];
  const topAnnotations: string[] = [];
  const bottomAnnotations: string[] = [];
  let sectionLabel: string | undefined;
  let sectionLetter: string | undefined;
  let sectionSuffix: string | undefined;
  let timeSignature: string | undefined;
  let ending: string | undefined;
  let navigationSign: 'segno' | 'coda' | undefined;

  // 1. Extract text and directions enclosed in <...>
  // In iReal Pro, comments can start with a 2-digit coordinate code:
  // *00-*39: bottom staff (below chords, e.g. <*03Break>, <*03(Tocar...)>)
  // *40-*99: top staff (above chords, e.g. <*69 tro>, <*723x>)
  const commentMatches = [...text.matchAll(/<([^>]*)>/g)];
  for (const cm of commentMatches) {
    const rawTag = cm[1];
    // Strip strictly 2-digit position code (*03, *69, *72) so repetition counts like 3x or 4x remain intact
    const cleaned = rawTag.replace(/^\*\d{2}/, '').trim();

    const isBottom =
      /^\*[0-3]\d/.test(rawTag) ||
      /^Al\s+/i.test(cleaned) ||
      /^Fine$/i.test(cleaned) ||
      /^Break/i.test(cleaned) ||
      /^\(/.test(cleaned) ||
      /^D\.S\./i.test(cleaned);

    if (cleaned) {
      allAnnotations.push(cleaned);
      if (isBottom) {
        bottomAnnotations.push(cleaned);
      } else {
        topAnnotations.push(cleaned);
      }
    }
  }
  text = text.replace(/<([^>]*)>/g, ' ');

  // 2. Navigation signs: Segno (S) and Coda (Q)
  if (/\*([A-Za-z])S/.test(text)) {
    navigationSign = 'segno';
    text = text.replace(/(\*[A-Za-z])S/, '$1');
  } else if (/\*([A-Za-z])Q/.test(text)) {
    navigationSign = 'coda';
    text = text.replace(/(\*[A-Za-z])Q/, '$1');
  } else if (/\bS\b/.test(text)) {
    navigationSign = 'segno';
    text = text.replace(/\bS\b/, ' ');
  } else if (/\bQ\b/.test(text)) {
    navigationSign = 'coda';
    text = text.replace(/\bQ\b/, ' ');
  }

  // 3. Rehearsal marks / Section tags (e.g. *i, *v, *A, *B, *C, *D)
  const secMatch = text.match(/\*([A-Za-z])/);
  if (secMatch) {
    const rawLetter = secMatch[1];
    text = text.replace(/\*([A-Za-z])/, ' ');
    const firstTop = topAnnotations[0] || allAnnotations[0];
    const { label, letter, suffix, consumedComment } = resolveSectionLabel(rawLetter, firstTop);

    sectionLabel = label;
    sectionLetter = letter;
    sectionSuffix = suffix;

    if (consumedComment) {
      // Remove from top/all annotations so it renders as part of section header
      const topIdx = topAnnotations.indexOf(firstTop);
      if (topIdx >= 0) topAnnotations.splice(topIdx, 1);
      const allIdx = allAnnotations.indexOf(firstTop);
      if (allIdx >= 0) allAnnotations.splice(allIdx, 1);
    }
  }

  // 4. Time Signature (e.g. T44 -> 4/4, T34 -> 3/4, T68 -> 6/8)
  const tsMatch = text.match(/T(\d{2})/);
  if (tsMatch) {
    timeSignature = `${tsMatch[1][0]}/${tsMatch[1][1]}`;
    text = text.replace(/T\d{2}/, ' ');
  }

  // 5. Alternate Endings / Voltas (e.g. N1, N2, N3)
  const endMatch = text.match(/N([0-9])/);
  if (endMatch) {
    ending = endMatch[1];
    text = text.replace(/N[0-9]/g, ' ');
  }

  // 6. Repeat measure symbols
  const isRepeatMeasure =
    /\b[sln]?x\b|\b%\b/i.test(text.trim()) ||
    /^([sln]?x|%)$/i.test(text.trim());

  // Two-measure repeat 'r'
  const isDoubleRepeatMeasure =
    /\br\b/i.test(text.trim()) ||
    text.trim() === 'r';

  // 7. Sequential rhythmic extraction (chords and pulses)
  // Commas in iReal Pro separate beats or small chords
  const cleanTokensText = text.replace(/,/g, ' ');
  const rawTokens = cleanTokensText
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^([sln]?x|%|r)$/i.test(t));

  const elements: MeasureElement[] = [];
  const chords: ChordToken[] = [];
  let pulseCount = 0;

  for (const token of rawTokens) {
    if (/^p+$/.test(token)) {
      for (let i = 0; i < token.length; i++) {
        elements.push({ type: 'pulse' });
        pulseCount++;
      }
    } else {
      // Check for pulse prefixes like 'ppE-' or 'ppsE-' or 'p(D/F#)'
      const pulsePrefixMatch = token.match(/^(p+)(.*)$/);
      if (pulsePrefixMatch) {
        for (let i = 0; i < pulsePrefixMatch[1].length; i++) {
          elements.push({ type: 'pulse' });
          pulseCount++;
        }
        const remaining = pulsePrefixMatch[2]
          .replace(/^[sln()SQ]+/, '')
          .replace(/[sln()SQ]+$/, '');
        if (remaining) {
          const parsed = parseChordToken(remaining);
          if (parsed) {
            elements.push({ type: 'chord', chord: parsed });
            chords.push(parsed);
          }
        }
      } else {
        const clean = token.replace(/^[sln()SQ]+/, '').replace(/[sln()SQ]+$/, '');
        const parsed = parseChordToken(clean);
        if (parsed) {
          elements.push({ type: 'chord', chord: parsed });
          chords.push(parsed);
        }
      }
    }
  }

  return {
    id: `bar-${barNumber}`,
    barNumber,
    leftBarline: rawBar.leftBarline,
    rightBarline: rawBar.rightBarline,
    sectionLabel,
    sectionLetter,
    sectionSuffix,
    timeSignature,
    ending,
    navigationSign,
    topAnnotations,
    bottomAnnotations,
    annotations: allAnnotations,
    chords,
    elements,
    isRepeatMeasure,
    isDoubleRepeatMeasure,
    isRowBreakBefore: rawBar.isRowBreakBefore,
    pulseCount,
    rawContent: rawBar.raw.trim(),
  };
}

/**
 * Main parser: transforms a parsed song container and its obfuscated chord string
 * into a complete SongAST with Sections and authentic iReal Pro row breaks.
 */
export function parseIRealSong(songData: ParsedIRealUrlResult): SongAST {
  const deobfuscated = deobfuscateChordString(songData.obfuscatedChords);
  const rawBars = extractRawBars(deobfuscated);

  const bars: BarAST[] = [];
  let globalTimeSig = '4/4';

  rawBars.forEach((rawBar, idx) => {
    const bar = parseBarContent(rawBar, idx + 1);
    if (bar.timeSignature && idx === 0) {
      globalTimeSig = bar.timeSignature;
    }
    bars.push(bar);
  });

  // Ensure initial measure always has the song time signature declared
  if (bars.length > 0 && !bars[0].timeSignature) {
    bars[0].timeSignature = globalTimeSig;
  }

  // If opening measure is a closed preamble banner [ ... ] (like Celebraré),
  // propagate the time signature to the first chord section measure as well so 4/4 is present at the start of both
  if (bars.length > 1 && bars[0].rightBarline === ']' && !bars[1].timeSignature) {
    bars[1].timeSignature = bars[0].timeSignature || globalTimeSig;
  }

  // Merge opening preamble bar (e.g. time signature or title before repeat start '{')
  const cleanedBars: BarAST[] = [];
  for (let i = 0; i < bars.length; i++) {
    const cur = bars[i];
    const isPreamble =
      i === 0 &&
      cur.chords.length === 0 &&
      cur.elements.length === 0 &&
      !cur.isRepeatMeasure &&
      !cur.isDoubleRepeatMeasure &&
      cur.rightBarline !== ']' &&
      i + 1 < bars.length &&
      (bars[i + 1].leftBarline === '{' ||
        bars[i + 1].chords.length > 0 ||
        bars[i + 1].isRepeatMeasure);

    if (isPreamble) {
      const next = bars[i + 1];
      if (cur.timeSignature) next.timeSignature = cur.timeSignature;
      if (cur.sectionLabel && !next.sectionLabel) {
        next.sectionLabel = cur.sectionLabel;
        next.sectionLetter = cur.sectionLetter;
        next.sectionSuffix = cur.sectionSuffix;
      }
      if (cur.navigationSign && !next.navigationSign) {
        next.navigationSign = cur.navigationSign;
      }
      if (cur.topAnnotations.length > 0) {
        next.topAnnotations = [...cur.topAnnotations, ...next.topAnnotations];
      }
      if (cur.bottomAnnotations.length > 0) {
        next.bottomAnnotations = [...cur.bottomAnnotations, ...next.bottomAnnotations];
      }
      if (cur.annotations.length > 0) {
        next.annotations = [...cur.annotations, ...next.annotations];
      }
      continue;
    }
    cleanedBars.push(cur);
  }

  // Partition cleanedBars into natural musical phrases
  const phrases: BarAST[][] = [];
  let curP: BarAST[] = [];
  for (let i = 0; i < cleanedBars.length; i++) {
    const b = cleanedBars[i];
    const isNewSection = i > 0 && Boolean(b.sectionLabel);
    const hasRowBreak = i > 0 && Boolean(b.isRowBreakBefore);
    if ((isNewSection || hasRowBreak) && curP.length > 0) {
      phrases.push(curP);
      curP = [];
    }
    curP.push(b);
  }
  if (curP.length > 0) phrases.push(curP);

  // Convert phrases into rows of up to 4 or 5 bars
  const rowBarGroups: BarAST[][] = [];
  for (let pIdx = 0; pIdx < phrases.length; pIdx++) {
    const p = phrases[pIdx];

    // Check if this and next phrase are both single-bar direction blocks (e.g. VERSO + CORO Fine at song end)
    if (
      p.length === 1 &&
      pIdx + 1 < phrases.length &&
      phrases[pIdx + 1].length === 1 &&
      p[0].chords.length === 0 &&
      phrases[pIdx + 1][0].chords.length === 0
    ) {
      rowBarGroups.push([p[0], phrases[pIdx + 1][0]]);
      pIdx++; // skip next
      continue;
    }

    if (p.length <= 5) {
      rowBarGroups.push(p);
    } else if (p.length === 8) {
      rowBarGroups.push(p.slice(0, 4));
      rowBarGroups.push(p.slice(4));
    } else if (p.length === 6) {
      rowBarGroups.push(p.slice(0, 4));
      rowBarGroups.push(p.slice(4));
    } else if (p.length === 9) {
      const endIdx = p.findIndex((b) => Boolean(b.ending));
      if (endIdx >= 4) {
        rowBarGroups.push(p.slice(0, 4));
        rowBarGroups.push(p.slice(4));
      } else {
        rowBarGroups.push(p.slice(0, 5));
        rowBarGroups.push(p.slice(5));
      }
    } else {
      let rem = [...p];
      while (rem.length > 0) {
        if (rem.length <= 5) {
          rowBarGroups.push(rem);
          break;
        }
        rowBarGroups.push(rem.slice(0, 4));
        rem = rem.slice(4);
      }
    }
  }

  const rows: RowAST[] = rowBarGroups.map((barsInRow, idx) => {
    const firstBar = barsInRow[0];
    return {
      rowIndex: idx,
      sectionLabel: firstBar.sectionLabel,
      sectionLetter: firstBar.sectionLetter,
      sectionSuffix: firstBar.sectionSuffix,
      sectionSign: firstBar.navigationSign,
      bars: barsInRow,
    };
  });

  // Structure into sections based on sectionLabel
  const sections: SectionAST[] = [];
  let currentSection: SectionAST = {
    id: 'sec-0',
    letter: '',
    label: 'Main',
    bars: [],
  };

  bars.forEach((bar, idx) => {
    if (bar.sectionLabel) {
      if (currentSection.bars.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        id: `sec-${idx}`,
        letter: bar.sectionLetter || bar.sectionLabel[0] || 'A',
        label: bar.sectionLabel,
        bars: [bar],
      };
    } else {
      currentSection.bars.push(bar);
    }
  });

  if (currentSection.bars.length > 0) {
    sections.push(currentSection);
  }

  return {
    title: songData.title,
    composer: normalizeComposerName(songData.composer),
    style: songData.style,
    originalKey: songData.key,
    currentKey: songData.key,
    transposeAmount: 0,
    tempo: songData.tempo,
    repeats: songData.repeats,
    timeSignature: globalTimeSig,
    sections,
    rows,
    totalBars: bars.length,
    rawObfuscated: songData.obfuscatedChords,
    rawDeobfuscated: deobfuscated,
  };
}
