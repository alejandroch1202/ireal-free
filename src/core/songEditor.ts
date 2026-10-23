import type {
  BarAST,
  ChordToken,
  MeasureElement,
  RowAST,
  SectionAST,
  SongAST,
} from '../types/ireal';
import { parseChordToken } from './parser';
import { serializeSongToChordString } from './serializer';

/**
 * Resolves a human-readable section name (e.g. "Intro", "Verso 1", "Pre-Coro", "Coro Final")
 * into round-trip-safe iReal Pro section fields (sectionLabel, sectionLetter, sectionSuffix).
 */
export function resolveSectionMeta(rawLabel: string): {
  sectionLabel?: string;
  sectionLetter?: string;
  sectionSuffix?: string;
} {
  const clean = rawLabel.trim();
  if (!clean) {
    return {
      sectionLabel: undefined,
      sectionLetter: undefined,
      sectionSuffix: undefined,
    };
  }

  const lower = clean.toLowerCase();

  if (lower.startsWith('instrumental')) {
    const rest = clean.slice('instrumental'.length).trim();
    return {
      sectionLabel: rest ? `Instrumental ${rest}` : 'Instrumental',
      sectionLetter: 'IN',
      sectionSuffix: rest ? `nstrumental ${rest}` : 'nstrumental',
    };
  }

  if (lower.startsWith('intro')) {
    const rest = clean.slice('intro'.length).trim();
    return {
      sectionLabel: rest ? `Intro ${rest}` : 'Intro',
      sectionLetter: 'IN',
      sectionSuffix: rest ? `tro ${rest}` : 'tro',
    };
  }

  if (lower.startsWith('verso')) {
    const rest = clean.slice('verso'.length).trim();
    return {
      sectionLabel: rest ? `Verso ${rest}` : 'Verso',
      sectionLetter: 'V',
      sectionSuffix: rest ? `erso ${rest}` : 'erso',
    };
  }

  if (lower.startsWith('coro')) {
    const rest = clean.slice('coro'.length).trim();
    return {
      sectionLabel: rest ? `Coro ${rest}` : 'Coro',
      sectionLetter: 'C',
      sectionSuffix: rest ? `oro ${rest}` : 'oro',
    };
  }

  if (lower.startsWith('pre-coro') || lower.startsWith('precoro')) {
    return {
      sectionLabel: clean,
      sectionLetter: 'P',
      sectionSuffix: clean,
    };
  }

  if (lower.startsWith('puente') || lower.startsWith('bridge')) {
    return {
      sectionLabel: clean,
      sectionLetter: 'B',
      sectionSuffix: clean,
    };
  }

  if (lower.startsWith('final')) {
    const rest = clean.slice('final'.length).trim();
    return {
      sectionLabel: rest ? `Final ${rest}` : 'Final',
      sectionLetter: 'F',
      sectionSuffix: rest ? `Final ${rest}` : 'Final',
    };
  }

  if (lower.startsWith('outro')) {
    return {
      sectionLabel: clean,
      sectionLetter: 'O',
      sectionSuffix: clean,
    };
  }

  if (lower.startsWith('solo')) {
    return {
      sectionLabel: clean,
      sectionLetter: 'IN',
      sectionSuffix: clean,
    };
  }

  // Single rehearsal mark (A, B, C, D) or custom section title
  if (clean.length === 1 && /^[A-Za-z]$/.test(clean)) {
    const upper = clean.toUpperCase();
    return {
      sectionLabel: upper,
      sectionLetter: upper,
      sectionSuffix: '',
    };
  }

  return {
    sectionLabel: clean,
    sectionLetter: 'A',
    sectionSuffix: clean,
  };
}

/**
 * Creates a clean empty BarAST ready to be populated with chords or repeats.
 */
export function createEmptyBar(overrides: Partial<BarAST> = {}): BarAST {
  const rev = Math.random().toString(36).slice(2, 7);
  return {
    id: `bar-new-${rev}`,
    barNumber: 1,
    leftBarline: '|',
    rightBarline: '|',
    topAnnotations: [],
    bottomAnnotations: [],
    annotations: [],
    chords: [],
    elements: [],
    isRepeatMeasure: false,
    isDoubleRepeatMeasure: false,
    pulseCount: 0,
    rawContent: 'n',
    ...overrides,
  };
}

/**
 * Rebuilds a full SongAST (rows, sections, barNumbers, rawDeobfuscated) from an ordered BarAST array.
 */
export function rebuildSongFromBars(song: SongAST, inputBars: BarAST[]): SongAST {
  const safeBars = inputBars.length > 0 ? inputBars : [createEmptyBar({ rightBarline: 'Z' })];
  const rev = Date.now().toString(36);

  // Ensure initial bar carries song timeSignature
  const normalizedBars: BarAST[] = safeBars.map((b, idx) => {
    const barNumber = idx + 1;
    const pulseCount = b.elements
      ? b.elements.filter((e) => e.type === 'pulse').length
      : 0;
    const allAnns = Array.from(new Set([...(b.topAnnotations || []), ...(b.bottomAnnotations || [])]));
    return {
      ...b,
      id: `bar-${barNumber}-${rev}`,
      barNumber,
      timeSignature: idx === 0 ? b.timeSignature || song.timeSignature || '4/4' : b.timeSignature,
      topAnnotations: b.topAnnotations || [],
      bottomAnnotations: b.bottomAnnotations || [],
      annotations: allAnns,
      pulseCount,
    };
  });

  // Group into phrases by section start or explicit row break
  const phrases: BarAST[][] = [];
  let curP: BarAST[] = [];
  for (let i = 0; i < normalizedBars.length; i++) {
    const b = normalizedBars[i];
    const isNewSection = i > 0 && Boolean(b.sectionLabel);
    const hasRowBreak = i > 0 && Boolean(b.isRowBreakBefore);
    if ((isNewSection || hasRowBreak) && curP.length > 0) {
      phrases.push(curP);
      curP = [];
    }
    curP.push(b);
  }
  if (curP.length > 0) phrases.push(curP);

  // Chunk phrases into rows of up to 4 bars, marking row breaks on wrapped rows
  const rowBarGroups: BarAST[][] = [];
  for (let pIdx = 0; pIdx < phrases.length; pIdx++) {
    const p = phrases[pIdx];
    if (
      p.length === 1 &&
      pIdx + 1 < phrases.length &&
      phrases[pIdx + 1].length === 1 &&
      p[0].chords.length === 0 &&
      phrases[pIdx + 1][0].chords.length === 0 &&
      p[0].annotations.length > 0 &&
      phrases[pIdx + 1][0].annotations.length > 0
    ) {
      rowBarGroups.push([p[0], phrases[pIdx + 1][0]]);
      pIdx++;
      continue;
    }

    let rem = [...p];
    let chunkIdx = 0;
    while (rem.length > 0) {
      const chunk = rem.slice(0, 4);
      if (chunkIdx > 0 && chunk.length > 0) {
        chunk[0] = { ...chunk[0], isRowBreakBefore: true };
      }
      rowBarGroups.push(chunk);
      rem = rem.slice(4);
      chunkIdx++;
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

  const flatBars = rows.flatMap((r) => r.bars);

  // Build sections list
  const sections: SectionAST[] = [];
  let currentSection: SectionAST = {
    id: 'sec-0',
    letter: '',
    label: 'Main',
    bars: [],
  };

  flatBars.forEach((bar, idx) => {
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

  const rebuilt: SongAST = {
    ...song,
    rows,
    sections,
    totalBars: flatBars.length,
  };

  rebuilt.rawDeobfuscated = serializeSongToChordString(rebuilt);
  return rebuilt;
}

/**
 * Inserts `count` blank measures before or after `targetBarNumber`.
 */
export function insertBarsAround(
  song: SongAST,
  targetBarNumber: number,
  position: 'before' | 'after',
  count = 1
): SongAST {
  const allBars = song.rows.flatMap((r) => r.bars.map((b) => ({ ...b })));
  const targetIdx = allBars.findIndex((b) => b.barNumber === targetBarNumber);
  if (targetIdx < 0) return song;

  const targetBar = allBars[targetIdx];
  const createdBars: BarAST[] = Array.from({ length: Math.max(1, count) }, () => createEmptyBar());

  if (position === 'before') {
    // If inserting before a bar that starts a section or row, transfer those markers to the first inserted bar
    const firstNew = createdBars[0];
    if (targetBar.sectionLabel) {
      firstNew.sectionLabel = targetBar.sectionLabel;
      firstNew.sectionLetter = targetBar.sectionLetter;
      firstNew.sectionSuffix = targetBar.sectionSuffix;
      targetBar.sectionLabel = undefined;
      targetBar.sectionLetter = undefined;
      targetBar.sectionSuffix = undefined;
    }
    if (targetBar.isRowBreakBefore) {
      firstNew.isRowBreakBefore = true;
      targetBar.isRowBreakBefore = false;
    }
    if (targetBar.leftBarline === '[' || targetBar.leftBarline === '{') {
      firstNew.leftBarline = targetBar.leftBarline;
      targetBar.leftBarline = '|';
    }
    if (targetIdx === 0 && targetBar.timeSignature) {
      firstNew.timeSignature = targetBar.timeSignature;
      targetBar.timeSignature = undefined;
    }
    allBars.splice(targetIdx, 0, ...createdBars);
  } else {
    // Inserting after targetBar: if targetBar closed a section/song (']' or 'Z'), shift that closing barline to the last inserted bar
    if (targetBar.rightBarline === ']' || targetBar.rightBarline === 'Z') {
      const closing = targetBar.rightBarline;
      targetBar.rightBarline = '|';
      createdBars[createdBars.length - 1].rightBarline = closing;
    }
    allBars.splice(targetIdx + 1, 0, ...createdBars);
  }

  return rebuildSongFromBars(song, allBars);
}

/**
 * Appends `count` blank measures to the end of the section starting at `sectionRowIndex`
 * (including any continuation rows belonging to that section).
 */
export function appendBarsToSection(
  song: SongAST,
  sectionRowIndex: number,
  count = 1
): SongAST {
  if (sectionRowIndex < 0 || sectionRowIndex >= song.rows.length) return song;

  // Find the last row belonging to this section (stop before the next row with a sectionLabel)
  let endRowIdx = sectionRowIndex;
  while (
    endRowIdx + 1 < song.rows.length &&
    !song.rows[endRowIdx + 1].sectionLabel
  ) {
    endRowIdx++;
  }

  const endRow = song.rows[endRowIdx];
  const lastBarInSection = endRow.bars[endRow.bars.length - 1];
  if (!lastBarInSection) return song;

  // Clear explicit row breaks inside this section so phrases reflow into clean 4-bar lines naturally
  const sectionFirstBarNum = song.rows[sectionRowIndex].bars[0]?.barNumber;
  const sectionLastBarNum = lastBarInSection.barNumber;

  const updatedSong = insertBarsAround(song, sectionLastBarNum, 'after', count);

  if (sectionFirstBarNum !== undefined) {
    const reflowedBars = updatedSong.rows.flatMap((r) =>
      r.bars.map((b) => {
        if (
          b.barNumber > sectionFirstBarNum &&
          b.barNumber <= sectionLastBarNum + count &&
          !b.sectionLabel
        ) {
          return { ...b, isRowBreakBefore: false };
        }
        return b;
      })
    );
    return rebuildSongFromBars(updatedSong, reflowedBars);
  }

  return updatedSong;
}

/**
 * Appends `count` blank measures directly to a specific row (`rowIndex`).
 */
export function appendBarsToRow(song: SongAST, rowIndex: number, count = 1): SongAST {
  const row = song.rows[rowIndex];
  if (!row || row.bars.length === 0) return song;
  const lastBar = row.bars[row.bars.length - 1];
  return insertBarsAround(song, lastBar.barNumber, 'after', count);
}

/**
 * Deletes a single measure (`targetBarNumber`), preserving section headers and closing barlines.
 */
export function deleteBar(song: SongAST, targetBarNumber: number): SongAST {
  const allBars = song.rows.flatMap((r) => r.bars.map((b) => ({ ...b })));
  if (allBars.length <= 1) return song;

  const idx = allBars.findIndex((b) => b.barNumber === targetBarNumber);
  if (idx < 0) return song;

  const removed = allBars[idx];
  const prevBar = idx > 0 ? allBars[idx - 1] : null;
  const nextBar = idx + 1 < allBars.length ? allBars[idx + 1] : null;

  // If removed bar started a section and nextBar does NOT already start another section, transfer section info
  if (removed.sectionLabel && nextBar && !nextBar.sectionLabel) {
    nextBar.sectionLabel = removed.sectionLabel;
    nextBar.sectionLetter = removed.sectionLetter;
    nextBar.sectionSuffix = removed.sectionSuffix;
    nextBar.isRowBreakBefore = removed.isRowBreakBefore;
    if (
      (removed.leftBarline === '[' || removed.leftBarline === '{') &&
      nextBar.leftBarline === '|'
    ) {
      nextBar.leftBarline = removed.leftBarline;
    }
  } else if (removed.isRowBreakBefore && nextBar && !nextBar.sectionLabel) {
    // Reflow phrase cleanly when deleting the first bar of a continuation row
    nextBar.isRowBreakBefore = false;
  }

  if (idx === 0 && nextBar && removed.timeSignature && !nextBar.timeSignature) {
    nextBar.timeSignature = removed.timeSignature;
  }

  // If removed bar had a closing barline ('}', ']', 'Z') and prevBar is in the same section, preserve closing barline
  if (
    (removed.rightBarline === '}' ||
      removed.rightBarline === ']' ||
      removed.rightBarline === 'Z') &&
    prevBar &&
    !removed.sectionLabel
  ) {
    if (prevBar.rightBarline === '|') {
      prevBar.rightBarline = removed.rightBarline;
    }
  } else if (idx === allBars.length - 1 && prevBar && removed.rightBarline === 'Z') {
    prevBar.rightBarline = 'Z';
  }

  allBars.splice(idx, 1);
  return rebuildSongFromBars(song, allBars);
}

/**
 * Appends a brand-new section (e.g. "Verso", "Coro", "Puente") with `barCount` measures at the end of the song.
 */
export function addSection(
  song: SongAST,
  sectionName: string,
  barCount = 4,
  withRepeat = false
): SongAST {
  const allBars = song.rows.flatMap((r) => r.bars.map((b) => ({ ...b })));
  const count = Math.max(1, barCount);
  const meta = resolveSectionMeta(sectionName || 'Sección');

  // Replace 'Z' final barline on previous last bar with section end ']' (unless it was repeat '}')
  if (allBars.length > 0) {
    const prevLast = allBars[allBars.length - 1];
    if (prevLast.rightBarline === 'Z' || prevLast.rightBarline === '|') {
      prevLast.rightBarline = ']';
    }
  }

  const newSectionBars: BarAST[] = Array.from({ length: count }, (_, i) =>
    createEmptyBar({
      isRowBreakBefore: i === 0 && allBars.length > 0,
      leftBarline: i === 0 ? (withRepeat ? '{' : '[') : '|',
      rightBarline:
        i === count - 1 ? (withRepeat ? '}' : 'Z') : '|',
      sectionLabel: i === 0 ? meta.sectionLabel : undefined,
      sectionLetter: i === 0 ? meta.sectionLetter : undefined,
      sectionSuffix: i === 0 ? meta.sectionSuffix : undefined,
    })
  );

  return rebuildSongFromBars(song, [...allBars, ...newSectionBars]);
}

function cloneBarDeep(bar: BarAST): BarAST {
  return {
    ...bar,
    topAnnotations: [...(bar.topAnnotations || [])],
    bottomAnnotations: [...(bar.bottomAnnotations || [])],
    annotations: [...(bar.annotations || [])],
    chords: (bar.chords || []).map((c) => ({ ...c })),
    elements: (bar.elements || []).map((el) =>
      el.type === 'chord'
        ? { ...el, chord: { ...el.chord } }
        : { ...el, passingChord: el.passingChord ? { ...el.passingChord } : undefined }
    ),
  };
}

/**
 * Duplicates an entire section (starting at `sectionRowIndex`, including all its continuation rows)
 * along with its chords, rhythmic pulses, barlines, endings, and annotations.
 * `placement`:
 * - `'after'`: inserts the duplicated section immediately below the original section.
 * - `'end'`: appends the duplicated section at the very end of the song.
 */
export function duplicateSection(
  song: SongAST,
  sectionRowIndex: number,
  placement: 'after' | 'end' = 'after',
  customLabel?: string
): SongAST {
  if (sectionRowIndex < 0 || sectionRowIndex >= song.rows.length) return song;

  let endRowIdx = sectionRowIndex;
  while (
    endRowIdx + 1 < song.rows.length &&
    !song.rows[endRowIdx + 1].sectionLabel
  ) {
    endRowIdx++;
  }

  const sourceBars: BarAST[] = [];
  for (let r = sectionRowIndex; r <= endRowIdx; r++) {
    for (const b of song.rows[r].bars) {
      sourceBars.push(b);
    }
  }
  if (sourceBars.length === 0) return song;

  const clonedBars = sourceBars.map(cloneBarDeep);
  const baseLabel =
    customLabel?.trim() ||
    sourceBars[0].sectionLabel ||
    song.rows[sectionRowIndex].sectionLabel ||
    'Sección';
  const meta = resolveSectionMeta(baseLabel);

  clonedBars[0].sectionLabel = meta.sectionLabel;
  clonedBars[0].sectionLetter = meta.sectionLetter;
  clonedBars[0].sectionSuffix = meta.sectionSuffix;
  clonedBars[0].isRowBreakBefore = true;
  if (sectionRowIndex === 0) {
    clonedBars[0].timeSignature = undefined;
  }
  if (clonedBars[0].leftBarline === '|') {
    clonedBars[0].leftBarline = '[';
  }

  const allBars = song.rows.flatMap((r) => r.bars.map(cloneBarDeep));
  const isAtSongEnd = placement === 'end' || endRowIdx === song.rows.length - 1;

  if (isAtSongEnd) {
    if (allBars.length > 0) {
      const prevLast = allBars[allBars.length - 1];
      if (prevLast.rightBarline === 'Z' || prevLast.rightBarline === '|') {
        prevLast.rightBarline = ']';
      }
    }
    const clonedLast = clonedBars[clonedBars.length - 1];
    if (clonedLast.rightBarline === '|' || clonedLast.rightBarline === ']') {
      clonedLast.rightBarline = 'Z';
    }
    return rebuildSongFromBars(song, [...allBars, ...clonedBars]);
  }

  const lastSourceBarNum =
    song.rows[endRowIdx].bars[song.rows[endRowIdx].bars.length - 1].barNumber;
  const insertAfterIdx = allBars.findIndex((b) => b.barNumber === lastSourceBarNum);
  if (insertAfterIdx < 0) return song;

  if (
    allBars[insertAfterIdx].rightBarline === '|' ||
    allBars[insertAfterIdx].rightBarline === 'Z'
  ) {
    allBars[insertAfterIdx].rightBarline = ']';
  }
  const clonedLast = clonedBars[clonedBars.length - 1];
  if (clonedLast.rightBarline === '|' || clonedLast.rightBarline === 'Z') {
    clonedLast.rightBarline = ']';
  }
  if (insertAfterIdx + 1 < allBars.length) {
    allBars[insertAfterIdx + 1].isRowBreakBefore = true;
  }

  allBars.splice(insertAfterIdx + 1, 0, ...clonedBars);
  return rebuildSongFromBars(song, allBars);
}

/**
 * Deletes an entire section (starting at `rowIndex` plus its continuation rows)
 * OR a single row (`mode === 'row'`).
 */
export function deleteSectionOrRow(
  song: SongAST,
  rowIndex: number,
  mode: 'section' | 'row'
): SongAST {
  if (rowIndex < 0 || rowIndex >= song.rows.length) return song;

  let endRowIdx = rowIndex;
  if (mode === 'section') {
    while (
      endRowIdx + 1 < song.rows.length &&
      !song.rows[endRowIdx + 1].sectionLabel
    ) {
      endRowIdx++;
    }
  }

  const barNumbersToRemove = new Set<number>();
  for (let r = rowIndex; r <= endRowIdx; r++) {
    song.rows[r].bars.forEach((b) => barNumbersToRemove.add(b.barNumber));
  }

  const allBars = song.rows.flatMap((r) => r.bars.map((b) => ({ ...b })));
  if (barNumbersToRemove.size >= allBars.length) {
    // Never leave the song with 0 bars: reset to 4 clean blank bars in the first section
    const meta = resolveSectionMeta('Intro');
    const fallbackBars = Array.from({ length: 4 }, (_, i) =>
      createEmptyBar({
        leftBarline: i === 0 ? '[' : '|',
        rightBarline: i === 3 ? 'Z' : '|',
        timeSignature: i === 0 ? song.timeSignature || '4/4' : undefined,
        sectionLabel: i === 0 ? meta.sectionLabel : undefined,
        sectionLetter: i === 0 ? meta.sectionLetter : undefined,
        sectionSuffix: i === 0 ? meta.sectionSuffix : undefined,
      })
    );
    return rebuildSongFromBars(song, fallbackBars);
  }

  // If mode === 'row' and the deleted row started a section whose continuation row follows, transfer the section header
  if (
    mode === 'row' &&
    song.rows[rowIndex].sectionLabel &&
    rowIndex + 1 < song.rows.length &&
    !song.rows[rowIndex + 1].sectionLabel
  ) {
    const nextFirstBarNum = song.rows[rowIndex + 1].bars[0]?.barNumber;
    const removedFirstBar = song.rows[rowIndex].bars[0];
    if (nextFirstBarNum !== undefined && removedFirstBar) {
      const target = allBars.find((b) => b.barNumber === nextFirstBarNum);
      if (target) {
        target.sectionLabel = removedFirstBar.sectionLabel;
        target.sectionLetter = removedFirstBar.sectionLetter;
        target.sectionSuffix = removedFirstBar.sectionSuffix;
        target.leftBarline = removedFirstBar.leftBarline;
      }
    }
  }

  const remaining = allBars.filter((b) => !barNumbersToRemove.has(b.barNumber));
  if (remaining.length > 0) {
    const last = remaining[remaining.length - 1];
    if (last.rightBarline === '|') {
      last.rightBarline = 'Z';
    }
  }

  return rebuildSongFromBars(song, remaining);
}

/**
 * Renames or removes the section header at `rowIndex`.
 */
export function renameSectionAtRow(
  song: SongAST,
  rowIndex: number,
  newLabel: string
): SongAST {
  const row = song.rows[rowIndex];
  if (!row || row.bars.length === 0) return song;

  const firstBarNum = row.bars[0].barNumber;
  const meta = resolveSectionMeta(newLabel);

  const allBars = song.rows.flatMap((r) =>
    r.bars.map((b) => {
      if (b.barNumber !== firstBarNum) return { ...b };
      return {
        ...b,
        sectionLabel: meta.sectionLabel,
        sectionLetter: meta.sectionLetter,
        sectionSuffix: meta.sectionSuffix,
        isRowBreakBefore: b.barNumber > 1 ? true : b.isRowBreakBefore,
      };
    })
  );

  return rebuildSongFromBars(song, allBars);
}

/**
 * Updates a single measure by barNumber and rebuilds the SongAST cleanly.
 */
export function updateBarInSong(
  song: SongAST,
  barNumber: number,
  updater: (bar: BarAST) => BarAST
): SongAST {
  const allBars = song.rows.flatMap((r) =>
    r.bars.map((b) => (b.barNumber === barNumber ? updater({ ...b }) : { ...b }))
  );
  return rebuildSongFromBars(song, allBars);
}

/**
 * Builds an initial iReal Pro chord progression string for CreateSongModal templates.
 */
export function buildTemplateChordProgression(
  template: 'blank' | 'basic' | 'complete',
  key: string,
  timeSignature: string
): string {
  const tsToken =
    timeSignature === '3/4'
      ? 'T34'
      : timeSignature === '6/8'
      ? 'T68'
      : timeSignature === '2/4'
      ? 'T24'
      : 'T44';

  const root = parseChordToken(key) ? key : 'C';

  if (template === 'blank') {
    return `[*i${tsToken}<*69 tro> ${root}   | n   | n   | n   Z`;
  }

  if (template === 'complete') {
    return (
      `[*i${tsToken}<*69 tro> ${root}   | n   | n   | n   ]` +
      `Y[*v<*69 erso> n   | n   | n   | n   | n   | n   | n   | n   ]` +
      `Y{*c<*69 oro> n   | n   | n   | n   }` +
      `Y[*b<*69 Puente> n   | n   | n   | n   Z`
    );
  }

  // Default 'basic': Intro (4 bars) + Verso (4 bars)
  return `[*i${tsToken}<*69 tro> ${root}   | n   | n   | n   ]Y[*v<*69 erso> n   | n   | n   | n   Z`;
}
