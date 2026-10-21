import type { ChordToken, SongAST } from '../types/ireal';
import { formatChordQuality } from './parser';

export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const STANDARD_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const PITCH_MAP: Record<string, number> = {
  'B#': 0, 'C': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'E#': 5, 'F': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/**
 * Keys that naturally use flats (and their relative minor equivalents).
 */
const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
  'D-', 'G-', 'C-', 'F-', 'Bb-', 'Eb-', 'Ab-',
]);

/**
 * Checks whether a given key uses flats for enharmonics.
 */
export function isFlatKey(key: string): boolean {
  return FLAT_KEYS.has(key);
}

/**
 * Extracts note root from key string (e.g. "G" -> "G", "E-" -> "E", "Bb" -> "Bb").
 */
export function getKeyRoot(key: string): string {
  const match = key.match(/^([A-G][#b]?)/);
  return match ? match[1] : key;
}

/**
 * Determines whether the key is minor (e.g. "E-", "Am", "Dm").
 */
export function isKeyMinor(key: string): boolean {
  return key.includes('-') || key.endsWith('m') || key.endsWith('min');
}

/**
 * Transposes a single musical note by a given number of semitones,
 * applying intelligent enharmonics based on the target key.
 */
export function transposeNote(note: string, semitones: number, targetKey: string): string {
  const pitch = PITCH_MAP[note];
  if (pitch === undefined) return note;

  const newPitch = ((pitch + semitones) % 12 + 12) % 12;
  const useFlats = isFlatKey(targetKey);

  return useFlats ? FLATS[newPitch] : SHARPS[newPitch];
}

/**
 * Transposes a single ChordToken (root note, bass note) and formats displayText.
 */
export function transposeChord(chord: ChordToken, semitones: number, targetKey: string): ChordToken {
  if (semitones === 0) {
    const displayQuality = formatChordQuality(chord.quality);
    const displayText = chord.bass
      ? `${chord.root}${displayQuality}/${chord.bass}`
      : `${chord.root}${displayQuality}`;
    return {
      ...chord,
      displayText,
    };
  }

  const transposedRoot = transposeNote(chord.root, semitones, targetKey);
  const transposedBass = chord.bass ? transposeNote(chord.bass, semitones, targetKey) : undefined;
  const displayQuality = formatChordQuality(chord.quality);

  const displayText = transposedBass
    ? `${transposedRoot}${displayQuality}/${transposedBass}`
    : `${transposedRoot}${displayQuality}`;

  return {
    ...chord,
    root: transposedRoot,
    bass: transposedBass,
    displayText,
  };
}

/**
 * Calculates the target key name given the original key and semitone delta.
 */
export function calculateTargetKey(originalKey: string, semitones: number): string {
  const root = getKeyRoot(originalKey);
  const isMinor = isKeyMinor(originalKey);

  const pitch = PITCH_MAP[root];
  if (pitch === undefined) return originalKey;

  const newPitch = ((pitch + semitones) % 12 + 12) % 12;

  // Check whether target pitch class typically prefers sharps or flats
  // Standard major key choices:
  // 0: C, 1: Db, 2: D, 3: Eb, 4: E, 5: F, 6: F#/Gb, 7: G, 8: Ab, 9: A, 10: Bb, 11: B
  const flatPitchClasses = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb
  const useFlats = flatPitchClasses.has(newPitch);

  const targetRoot = useFlats ? FLATS[newPitch] : SHARPS[newPitch];
  return isMinor ? `${targetRoot}m` : targetRoot;
}

/**
 * Computes the semitone delta (-11 to +11) from originalKey to a targetKey.
 */
export function getSemitoneDelta(originalKey: string, targetKey: string): number {
  const rootFrom = getKeyRoot(originalKey);
  const rootTo = getKeyRoot(targetKey);

  const pitchFrom = PITCH_MAP[rootFrom];
  const pitchTo = PITCH_MAP[rootTo];

  if (pitchFrom === undefined || pitchTo === undefined) return 0;

  let delta = (pitchTo - pitchFrom) % 12;
  if (delta > 6) delta -= 12;
  if (delta < -5) delta += 12;
  return delta;
}

/**
 * Transposes an entire SongAST by a given number of semitones or to a target key.
 * Creates an immutable transposed clone.
 */
export function transposeSong(song: SongAST, target: number | string): SongAST {
  let semitones: number;
  let newKey: string;

  if (typeof target === 'number') {
    semitones = target;
    newKey = calculateTargetKey(song.originalKey, semitones);
  } else {
    newKey = target;
    semitones = getSemitoneDelta(song.originalKey, target);
  }

  // Clone rows and bars with transposed chords and elements
  const transposedRows = song.rows.map(row => ({
    ...row,
    bars: row.bars.map(bar => ({
      ...bar,
      chords: bar.chords.map(chord => transposeChord(chord, semitones, newKey)),
      elements: bar.elements
        ? bar.elements.map(el =>
            el.type === 'chord'
              ? {
                  ...el,
                  chord: transposeChord(el.chord, semitones, newKey),
                }
              : {
                  ...el,
                  passingChord: el.passingChord
                    ? transposeChord(el.passingChord, semitones, newKey)
                    : undefined,
                }
          )
        : [],
    })),
  }));

  // Clone sections with updated bars
  const transposedSections = song.sections.map(section => ({
    ...section,
    bars: section.bars.map(bar => ({
      ...bar,
      chords: bar.chords.map(chord => transposeChord(chord, semitones, newKey)),
      elements: bar.elements
        ? bar.elements.map(el =>
            el.type === 'chord'
              ? {
                  ...el,
                  chord: transposeChord(el.chord, semitones, newKey),
                }
              : {
                  ...el,
                  passingChord: el.passingChord
                    ? transposeChord(el.passingChord, semitones, newKey)
                    : undefined,
                }
          )
        : [],
    })),
  }));

  return {
    ...song,
    currentKey: newKey,
    transposeAmount: semitones,
    rows: transposedRows,
    sections: transposedSections,
  };
}
