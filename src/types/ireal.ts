/**
 * Types representing the iReal Pro song structure and AST
 */

export interface ChordToken {
  /** Original chord representation from iReal Pro (e.g. "E-", "D/F#", "C^7") */
  raw: string;
  /** Transposed root note (e.g. "E" -> "F#") */
  root: string;
  /** Chord quality & extensions (e.g. "-", "7", "^7", "-7b5", "sus") */
  quality: string;
  /** Transposed bass note for slash chords, if any (e.g. "F#" in "D/F#") */
  bass?: string;
  /** Human-readable display string with '-' converted to 'm' (e.g. "Em", "D/F#", "F#m7") */
  displayText: string;
}

export type MeasureElement =
  | { type: 'chord'; chord: ChordToken }
  | { type: 'pulse' };

export interface BarAST {
  id: string;
  barNumber: number;
  /** Left barline token: '|', '{' (repeat start), '[' (section start) */
  leftBarline: '|' | '{' | '[';
  /** Right barline token: '|', '}' (repeat end), ']' (section end), 'Z' (final barline) */
  rightBarline: '|' | '}' | ']' | 'Z';
  /** Rehearsal mark / section label if this bar starts a section (e.g. "Intro", "Verso", "Coro", "A", "B") */
  sectionLabel?: string;
  /** Section letter for boxed icon (e.g. "I", "V", "C", "B") */
  sectionLetter?: string;
  /** Section suffix text next to the boxed letter (e.g. "tro", "erso", "oro", "ridge (Puente)") */
  sectionSuffix?: string;
  /** Time signature if declared at this bar (e.g. "4/4", "3/4", "6/8") */
  timeSignature?: string;
  /** Top annotations / directions (e.g. "3x", "4x") */
  topAnnotations: string[];
  /** Bottom annotations / staff text (e.g. "Break", "Al Intro", "Fine") */
  bottomAnnotations: string[];
  /** Text annotations or directions (legacy/combined) */
  annotations: string[];
  /** Chords in this bar */
  chords: ChordToken[];
  /** Sequential beat elements (chords and rhythmic pulses in exact performance order) */
  elements: MeasureElement[];
  /** Whether this bar repeats the previous measure ('x' / '%') */
  isRepeatMeasure: boolean;
  /** Whether this bar repeats the previous 2 measures ('r' / '//') */
  isDoubleRepeatMeasure?: boolean;
  /** Alternate ending marker if this bar is part of a 1st, 2nd, etc. ending (e.g. '1', '2') */
  ending?: string;
  /** Musical navigation sign at this bar (e.g. 'segno' for S, 'coda' for Q) */
  navigationSign?: 'segno' | 'coda';
  /** Whether a row break / new line occurred before this bar */
  isRowBreakBefore?: boolean;
  /** Beat/pulse marks count ('p' token) */
  pulseCount: number;
  /** Raw bar content */
  rawContent: string;
}

export interface RowAST {
  rowIndex: number;
  /** Section label if this row starts a rehearsal section */
  sectionLabel?: string;
  sectionLetter?: string;
  sectionSuffix?: string;
  /** Navigation sign for the row section header (e.g. 'segno' for S, 'coda' for Q) */
  sectionSign?: 'segno' | 'coda';
  /** Up to 4 or 5 bars per row */
  bars: BarAST[];
}

export interface SectionAST {
  id: string;
  letter: string;
  label: string;
  bars: BarAST[];
}

export interface SongAST {
  title: string;
  composer: string;
  style: string;
  originalKey: string;
  currentKey: string;
  transposeAmount: number; // -11 to +11 semitones
  tempo?: number;
  repeats?: number;
  timeSignature: string;
  sections: SectionAST[];
  rows: RowAST[];
  totalBars: number;
  rawObfuscated?: string;
  rawDeobfuscated: string;
}

export interface ParsedIRealUrlResult {
  title: string;
  composer: string;
  reserved: string;
  style: string;
  key: string;
  tempoField: string;
  obfuscatedChords: string;
  accompanimentStyle?: string;
  tempo?: number;
  repeats?: number;
}
