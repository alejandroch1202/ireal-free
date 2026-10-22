import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chordToIReal, serializeSongToChordString, serializeSongToIRealUrl, serializeSongToIRealHtml } from '../serializer';
import { extractIRealSongs } from '../deobfuscator';
import { parseIRealSong, parseChordToken } from '../parser';

test('chordToIReal converts user-friendly chord strings to iReal Pro format', () => {
  assert.equal(chordToIReal('Am'), 'A-');
  assert.equal(chordToIReal('Am7'), 'A-7');
  assert.equal(chordToIReal('Cmaj7'), 'C^7');
  assert.equal(chordToIReal('Cmaj9'), 'C^9');
  assert.equal(chordToIReal('Bm7b5'), 'Bh7');
  assert.equal(chordToIReal('Fdim'), 'Fo');
  assert.equal(chordToIReal('Gaug'), 'G+');
  assert.equal(chordToIReal('Csus4'), 'Csus4');
  assert.equal(chordToIReal('Csus2'), 'C2');
  assert.equal(chordToIReal('G/B'), 'G/B');
  assert.equal(chordToIReal('C/E'), 'C/E');
  assert.equal(chordToIReal('F#m7b5'), 'F#h7');
});

test('serializeSongToChordString round-trips Hosanna preserving structure', () => {
  const htmlPath = path.resolve(process.cwd(), 'charts/Hosanna.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const [songData] = extractIRealSongs(html);
  const ast = parseIRealSong(songData);

  assert.equal(ast.rows.length, 10);
  assert.equal(ast.totalBars, 40);

  const serialized = serializeSongToChordString(ast);
  assert.ok(serialized.length > 50);

  // Reparse serialized string
  const reparsed = parseIRealSong({
    ...songData,
    obfuscatedChords: serialized,
  });

  assert.equal(reparsed.rows.length, 10);
  assert.equal(reparsed.totalBars, 40);
  assert.equal(reparsed.rows[0].sectionLabel, 'Intro');
  assert.equal(reparsed.rows[1].sectionLabel, 'Verso');
  assert.equal(reparsed.rows[3].sectionLabel, 'Coro');
  assert.equal(reparsed.rows[5].sectionLabel, 'Bridge (Puente)');
  assert.equal(reparsed.rows[7].sectionLabel, 'Instrumental');
  assert.equal(reparsed.rows[8].sectionLabel, 'Coro Final');
});

test('Editing a chord in Hosanna updates the serialized song and persists upon reparse', () => {
  const htmlPath = path.resolve(process.cwd(), 'charts/Hosanna.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const [songData] = extractIRealSongs(html);
  const ast = parseIRealSong(songData);

  // Measure 1 in Hosanna was Am (Intro first chord)
  const introBar1 = ast.rows[0].bars[0];
  assert.equal(introBar1.chords[0].displayText, 'Am');

  // Change Am to A7
  const newChord = parseChordToken('A7')!;
  introBar1.chords = [newChord];
  introBar1.elements = [{ type: 'chord', chord: newChord }];

  // Serialize updated song
  const updatedHtml = serializeSongToIRealHtml(ast);
  assert.ok(updatedHtml.includes('irealb://'));

  // Extract and re-parse
  const [reloadedSongData] = extractIRealSongs(updatedHtml);
  const reloadedAst = parseIRealSong(reloadedSongData);

  // Verify measure 1 now has A7!
  assert.equal(reloadedAst.rows[0].bars[0].chords[0].displayText, 'A7');
  assert.equal(reloadedAst.rows.length, 10);
  assert.equal(reloadedAst.totalBars, 40);
});
