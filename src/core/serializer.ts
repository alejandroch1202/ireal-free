import type { SongAST, BarAST, ChordToken } from '../types/ireal';
import { buildIRealHtml, ensureIRealScheme } from './exporter';

/**
 * Converts a user-friendly chord displayText (e.g. "Am7", "Cmaj7", "Bm7b5", "Fdim", "G/B")
 * back into standard iReal Pro chord notation (e.g. "A-7", "C^7", "Bh7", "Fo", "G/B").
 */
export function chordToIReal(displayText: string): string {
  if (!displayText) return '';
  const trimmed = displayText.trim();

  const slashIdx = trimmed.indexOf('/');
  const chordPart = slashIdx >= 0 ? trimmed.slice(0, slashIdx) : trimmed;
  const bassPart = slashIdx >= 0 ? trimmed.slice(slashIdx) : '';

  const match = chordPart.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return trimmed;

  const root = match[1];
  let quality = match[2] || '';

  // Minor-major 7: m(maj7) -> -^7
  if (quality === 'm(maj7)' || quality === '-(^7)') {
    quality = '-^7';
  } else if (quality.startsWith('maj')) {
    // maj7 -> ^7, maj9 -> ^9, maj -> ^
    quality = '^' + quality.slice(3);
  } else if (quality.startsWith('m7b5')) {
    // m7b5 -> h7
    quality = 'h7' + quality.slice(4);
  } else if (quality.startsWith('dim')) {
    // dim7 -> o7, dim -> o
    quality = 'o' + quality.slice(3);
  } else if (quality.startsWith('aug')) {
    // aug7 -> +7, aug -> +
    quality = '+' + quality.slice(3);
  } else if (quality.startsWith('sus2')) {
    // sus2 -> 2
    quality = '2' + quality.slice(4);
  } else if (quality.startsWith('m') && !quality.startsWith('maj')) {
    // m7 -> -7, m -> -
    quality = '-' + quality.slice(1);
  }

  return `${root}${quality}${bassPart}`;
}

/**
 * Serializes an individual BarAST into iReal Pro chord string syntax.
 */
export function serializeBar(
  bar: BarAST,
  index: number,
  allBars: BarAST[],
  songTimeSig?: string
): string {
  let out = '';

  // 1. Vertical Row Break 'Y'
  if (bar.isRowBreakBefore) {
    out += 'Y';
  }

  // 2. Left Barline: '{' (repeat start), '[' (section start), or '|'
  if (bar.leftBarline && bar.leftBarline !== '|') {
    out += bar.leftBarline;
  } else if (index === 0 && !out.endsWith('Y')) {
    out += '|';
  }

  // 3. Section Rehearsal Mark (e.g. *i, *v, *c, *b, *d)
  if (bar.sectionLetter) {
    const code = bar.sectionLetter === 'IN' ? 'i' : bar.sectionLetter.toLowerCase();
    out += `*${code}`;
  }

  // 4. Time Signature (e.g. T44, T34, T68)
  if (bar.timeSignature && (index === 0 || bar.timeSignature !== songTimeSig)) {
    const cleanTs = bar.timeSignature.replace('/', '');
    out += `T${cleanTs}`;
  }

  // 5. Section label suffix in top coordinate comment (e.g. <*69 tro>, <*69 erso>, <*69 oro>)
  if (bar.sectionSuffix) {
    out += `<*69 ${bar.sectionSuffix}>`;
  }

  // 6. Navigation Signs (Segno 'S', Coda 'Q')
  if (bar.navigationSign === 'segno') {
    out += 'S';
  } else if (bar.navigationSign === 'coda') {
    out += 'Q';
  }

  // 7. Alternate Endings (N1, N2, N3)
  if (bar.ending) {
    out += `N${bar.ending}`;
  }

  // 8. Chords, Pulses, Repeat Measure '%', or Spacers
  if (bar.isRepeatMeasure) {
    out += ' x   ';
  } else if (bar.isDoubleRepeatMeasure) {
    out += ' r   ';
  } else if (
    bar.elements &&
    bar.elements.length > 0 &&
    bar.elements.some(
      (e) => e.type === 'pulse' || (e.type === 'chord' && (e.isPassing || e.isSmall))
    )
  ) {
    const elemTokens = bar.elements.map((el) => {
      if (el.type === 'pulse') {
        if (el.passingChord) {
          return `p(${chordToIReal(el.passingChord.displayText || el.passingChord.raw)})`;
        }
        return 'p';
      }
      const cStr = chordToIReal(el.chord.displayText || el.chord.raw);
      if (el.isPassing) return `(${cStr})`;
      if (el.isSmall) return `s${cStr}`;
      return cStr;
    });
    out += ` ${elemTokens.join(',')} `;
  } else if (bar.chords && bar.chords.length > 0) {
    const chordStrings = bar.chords.map((c) => chordToIReal(c.displayText || c.raw));
    if (chordStrings.length === 1) {
      out += ` ${chordStrings[0]}   `;
    } else {
      out += ` ${chordStrings.join(' ')} `;
    }
  } else {
    // Official iReal Pro blank / no-chord measure token ('n') so empty measures persist across save/reload
    out += ' n   ';
  }

  // 9a. Top Annotations (e.g. <*724x>, <*72Intro Solo Batería>)
  if (bar.topAnnotations && bar.topAnnotations.length > 0) {
    for (const ann of bar.topAnnotations) {
      const safeAnn = ann.replace(/=/g, '-').replace(/[<>]/g, '');
      out += `<*72${safeAnn}> `;
    }
  }

  // 9b. Bottom Annotations (e.g. <*03Al Verso>, <*03Fine>, <*03Break>)
  if (bar.bottomAnnotations && bar.bottomAnnotations.length > 0) {
    for (const ann of bar.bottomAnnotations) {
      const safeAnn = ann.replace(/=/g, '-').replace(/[<>]/g, '');
      out += `<*03${safeAnn}> `;
    }
  }

  // 10. Right Barline: '||' (double), '}' (repeat end), ']' (section end), 'Z' (final), or '|'
  if (bar.rightBarline === '||') {
    out += '||';
  } else if (bar.rightBarline === ']' || bar.rightBarline === '}' || bar.rightBarline === 'Z') {
    out += bar.rightBarline;
  } else {
    // Normal single barline (if final bar of song has plain '|', close with 'Z' so empty trailing bars persist)
    if (index + 1 < allBars.length) {
      const next = allBars[index + 1];
      if (!next.isRowBreakBefore && next.leftBarline === '|') {
        out += '|';
      }
    } else {
      out += 'Z';
    }
  }

  return out;
}

/**
 * Serializes an entire SongAST back into a compliant iReal Pro chord string.
 */
export function serializeSongToChordString(song: SongAST): string {
  const allBars = song.rows.flatMap((r) => r.bars);
  let result = '';

  for (let i = 0; i < allBars.length; i++) {
    result += serializeBar(allBars[i], i, allBars, song.timeSignature);
  }

  return result.trim();
}

/**
 * Builds an authentic iReal Pro URL (irealb://) from a SongAST with updated chords and metadata.
 */
export function serializeSongToIRealUrl(song: SongAST): string {
  const sanitizeField = (val: string, fallback: string) =>
    (val || '').replace(/=/g, '-').trim() || fallback;

  const chordString = serializeSongToChordString(song);
  const title = sanitizeField(song.title, 'Untitled');
  const composer = sanitizeField(song.composer, 'Unknown');
  const style = sanitizeField(song.style, 'Pop');
  const key = sanitizeField(song.originalKey || song.currentKey, 'C');
  const tempo = song.tempo || 115;
  const repeats = song.repeats || 3;

  const urlPayload = `${title}=${composer}==${style}=${key}=0=${chordString}=${style}=${tempo}=${repeats}`;
  return ensureIRealScheme(`irealb://${encodeURIComponent(urlPayload)}`);
}

/**
 * Builds a complete iReal Pro HTML export document embedding the updated chord chart.
 */
export function serializeSongToIRealHtml(song: SongAST): string {
  const url = serializeSongToIRealUrl(song);
  return buildIRealHtml(song.title, song.composer, url);
}
