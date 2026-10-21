import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIRealSongs } from '../deobfuscator';
import { parseIRealSong, parseChordToken } from '../parser';
import {
  transposeNote,
  transposeChord,
  transposeSong,
  calculateTargetKey,
  getSemitoneDelta,
  isFlatKey,
} from '../transposer';

const SAMPLE_HTML = `<a href="irealb://El%20Dios%20Que%20Adoramos%3DLa%20IBI%20%26%20GSM%3D%3DPop%3DG%3D4%3D1r34LbKcu7osre%2044%3C*6*%7BY%5D%20D%20GZLC%20-EQ%7CyXD%7CQyXG%3Eort%209v%3C*69Ti*%7CYp%7CQyXKcl%20L%20lcKQyXCZL%20lcKyQX-EZL%20lcKQyXDZ%20%7DY%7CCQyXG%3E-EZL%20DXyQKXDZL%20lcKQyXG%3Eoor%2096*%3CC*%7CY%5D%20%20lcyQKclZL-EpyXC%7CQXyQ%7CGL%20lcKQyXDZL%20lcQKyXG%7CQyXD%7CQyXB%2FZE-XyC%7CQyXyX-E%7CyQ%7CD%2FQyXC%3Elatnemurt%20s96*%3Ci*%7CY%5DQyX%23F%7CDXyQX-E%7CQcKQyX*03AlneuP(%20egdir%2096%3C*B*%7BY%5D%20%20%3EortnI%20te)%3EC%3C%20D%7CQOC33*XyQKcY%7D%20%20lcKQyX%23F%2FDLZ%20lcKQyXE%2FCZL%20l%7CXyQ%3CDZL%20lRO%3EXyQ%20LZXyQ%3C*36FINAL%3EXyQ%20%20Z%20%3DPop-Rock%3D115%3D3">El Dios Que Adoramos</a>`;

test('isFlatKey correctly identifies flat vs sharp keys', () => {
  assert.equal(isFlatKey('F'), true);
  assert.equal(isFlatKey('Bb'), true);
  assert.equal(isFlatKey('Eb'), true);
  assert.equal(isFlatKey('Ab'), true);
  assert.equal(isFlatKey('Db'), true);
  assert.equal(isFlatKey('Dm'), true);
  assert.equal(isFlatKey('Gm'), true);

  assert.equal(isFlatKey('G'), false);
  assert.equal(isFlatKey('D'), false);
  assert.equal(isFlatKey('A'), false);
  assert.equal(isFlatKey('E'), false);
  assert.equal(isFlatKey('B'), false);
  assert.equal(isFlatKey('F#'), false);
});

test('transposeNote uses correct enharmonics based on target key', () => {
  // Transposing C up 1 semitone:
  // In key of Db (flat key) -> Db
  assert.equal(transposeNote('C', 1, 'Db'), 'Db');
  // In key of D (sharp key) -> C#
  assert.equal(transposeNote('C', 1, 'D'), 'C#');

  // In key of F (flat key: Bb)
  assert.equal(transposeNote('A', 1, 'F'), 'Bb');
  // In key of G (sharp key)
  assert.equal(transposeNote('A', 1, 'G'), 'A#');

  // In key of A (3 sharps: F#, C#, G#)
  assert.equal(transposeNote('F', 1, 'A'), 'F#');
});

test('transposeChord transposes root and bass in slash chords, formatting - to m', () => {
  const em = parseChordToken('E-')!;
  const transposedEm = transposeChord(em, 2, 'A');
  assert.equal(transposedEm.root, 'F#');
  assert.equal(transposedEm.displayText, 'F#m');

  const dfsharp = parseChordToken('D/F#')!;
  // Transpose +2 into key of A (sharp key)
  const dfsharpToA = transposeChord(dfsharp, 2, 'A');
  assert.equal(dfsharpToA.root, 'E');
  assert.equal(dfsharpToA.bass, 'G#');
  assert.equal(dfsharpToA.displayText, 'E/G#');

  // Transpose -2 into key of F (flat key)
  const dfsharpToF = transposeChord(dfsharp, -2, 'F');
  assert.equal(dfsharpToF.root, 'C');
  assert.equal(dfsharpToF.bass, 'E');
  assert.equal(dfsharpToF.displayText, 'C/E');

  // Slash chord C/E transposed -2 into key of F
  const ce = parseChordToken('C/E')!;
  const ceToF = transposeChord(ce, -2, 'F');
  assert.equal(ceToF.root, 'Bb');
  assert.equal(ceToF.bass, 'D');
  assert.equal(ceToF.displayText, 'Bb/D');
});

test('calculateTargetKey and getSemitoneDelta work across all 12 keys', () => {
  assert.equal(calculateTargetKey('G', 2), 'A');
  assert.equal(calculateTargetKey('G', -2), 'F');
  assert.equal(calculateTargetKey('G', 1), 'Ab');
  assert.equal(calculateTargetKey('C', 0), 'C');
  assert.equal(calculateTargetKey('C', 7), 'G');

  assert.equal(getSemitoneDelta('G', 'A'), 2);
  assert.equal(getSemitoneDelta('G', 'F'), -2);
  assert.equal(getSemitoneDelta('C', 'G'), -5); // or +7 mod 12
});

test('transposeSong transposes entire SongAST with all rows and bars', () => {
  const [songData] = extractIRealSongs(SAMPLE_HTML);
  const ast = parseIRealSong(songData);

  // Transpose original key G (+2 semitones -> A)
  const transposedToA = transposeSong(ast, 2);
  assert.equal(transposedToA.currentKey, 'A');
  assert.equal(transposedToA.transposeAmount, 2);

  // Bar 1 chord: G -> A
  assert.equal(transposedToA.rows[0].bars[0].chords[0].displayText, 'A');

  // Bar 2 chord: D -> E
  assert.equal(transposedToA.rows[0].bars[1].chords[0].displayText, 'E');

  // Bar 3 chords: Em C -> F#m D
  assert.equal(transposedToA.rows[0].bars[2].chords[0].displayText, 'F#m');
  assert.equal(transposedToA.rows[0].bars[2].chords[1].displayText, 'D');

  // Slash chords:
  // Bar 23: G/B -> A/C#
  const bar23 = transposedToA.rows[5].bars[2];
  assert.equal(bar23.chords[0].displayText, 'A/C#');

  // Bar 32: D/F# -> E/G#
  const bar32 = transposedToA.rows[7].bars[3];
  assert.equal(bar32.chords[0].displayText, 'E/G#');

  // Bar 41: C/E -> D/F#
  const bar41 = transposedToA.rows[10].bars[0];
  assert.equal(bar41.chords[0].displayText, 'D/F#');
});
