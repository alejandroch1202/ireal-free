import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractIRealSongs } from '../deobfuscator';
import { parseIRealSong, parseChordToken } from '../parser';
import { serializeSongToIRealHtml } from '../serializer';
import { buildIRealHtml } from '../exporter';
import {
  insertBarsAround,
  appendBarsToSection,
  deleteBar,
  addSection,
  duplicateSection,
  deleteSectionOrRow,
  renameSectionAtRow,
  updateBarInSong,
  buildTemplateChordProgression,
} from '../songEditor';

function roundTripHtml(ast: ReturnType<typeof parseIRealSong>) {
  const html = serializeSongToIRealHtml(ast);
  const [extracted] = extractIRealSongs(html);
  return parseIRealSong(extracted);
}

test('Round-trip serialization preserves rhythmic pulses and passing chords in Celebraré and El Cordero Y El León', () => {
  const celHtml = fs.readFileSync(path.resolve(process.cwd(), 'charts/Celebraré.html'), 'utf-8');
  const [celData] = extractIRealSongs(celHtml);
  const celAst = parseIRealSong(celData);

  const celReloaded = roundTripHtml(celAst);
  // Row 1 Bar 0 in Celebraré has [E, /, /, F#m]
  const introBar0 = celReloaded.rows[1].bars[0];
  assert.equal(introBar0.elements.length, 4);
  assert.equal(introBar0.elements[0].type, 'chord');
  assert.equal(introBar0.elements[1].type, 'pulse');
  assert.equal(introBar0.elements[2].type, 'pulse');
  assert.equal(introBar0.elements[3].type, 'chord');
  // Row 1 Bar 1 has 4 pulses ////
  assert.equal(celReloaded.rows[1].bars[1].elements.length, 4);
  assert.ok(celReloaded.rows[1].bars[1].elements.every((e) => e.type === 'pulse'));

  const cordHtml = fs.readFileSync(
    path.resolve(process.cwd(), 'charts/El Cordero Y El León.html'),
    'utf-8'
  );
  const [cordData] = extractIRealSongs(cordHtml);
  const cordAst = parseIRealSong(cordData);

  const cordReloaded = roundTripHtml(cordAst);
  // Intro Bar 1 has [/, /, G, /(F#/D)]
  const bar1 = cordReloaded.rows[0].bars[1];
  assert.equal(bar1.elements.length, 4);
  assert.equal(bar1.elements[0].type, 'pulse');
  assert.equal(bar1.elements[1].type, 'pulse');
  assert.equal(bar1.elements[2].type, 'chord');
  assert.equal(bar1.elements[3].type, 'pulse');
  if (bar1.elements[3].type === 'pulse') {
    assert.ok(bar1.elements[3].passingChord);
  }
});

test('CreateSong templates preserve exact measure counts including blank measures across save/reload', () => {
  const prog = buildTemplateChordProgression('complete', 'G', '4/4');
  const url = `irealb://Mi%20Canci%C3%B3n=Autor==Worship=G=0=${prog}=Worship=128=3`;
  const html = buildIRealHtml('Mi Canción', 'Autor', url);
  const [songData] = extractIRealSongs(html);
  const ast = parseIRealSong(songData);

  // Intro (4) + Verso (8) + Coro (4) + Puente (4) = 20 bars, 5 rows
  assert.equal(ast.totalBars, 20);
  assert.equal(ast.rows.length, 5);
  assert.equal(ast.tempo, 128);
  assert.equal(ast.rows[0].bars[0].chords[0].displayText, 'G');
  assert.equal(ast.rows[0].bars[1].chords.length, 0);

  const reloaded = roundTripHtml(ast);
  assert.equal(reloaded.totalBars, 20);
  assert.equal(reloaded.rows.length, 5);
  assert.equal(reloaded.tempo, 128);
});

test('Adding and deleting measures updates rows cleanly and persists across serialization', () => {
  const prog = buildTemplateChordProgression('blank', 'C', '4/4');
  const html = buildIRealHtml('Test', 'Autor', `irealb://Test=Autor==Pop=C=0=${prog}=Pop=120=3`);
  const [songData] = extractIRealSongs(html);
  let ast = parseIRealSong(songData);

  assert.equal(ast.totalBars, 4);
  assert.equal(ast.rows.length, 1);

  // Append 4 bars to Intro section -> 8 bars across 2 rows
  ast = appendBarsToSection(ast, 0, 4);
  assert.equal(ast.totalBars, 8);
  assert.equal(ast.rows.length, 2);

  // Insert 1 bar before Bar 1 -> 9 bars, Intro header remains on Bar 1
  ast = insertBarsAround(ast, 1, 'before', 1);
  assert.equal(ast.totalBars, 9);
  assert.equal(ast.rows[0].sectionLabel, 'Intro');

  // Delete Bar 1 -> back to 8 bars, Intro header transfers to new Bar 1
  ast = deleteBar(ast, 1);
  assert.equal(ast.totalBars, 8);
  assert.equal(ast.rows[0].sectionLabel, 'Intro');

  const reloaded = roundTripHtml(ast);
  assert.equal(reloaded.totalBars, 8);
  assert.equal(reloaded.rows[0].sectionLabel, 'Intro');
});

test('Adding, renaming, and deleting sections works accurately including multi-row sections', () => {
  const prog = buildTemplateChordProgression('basic', 'D', '4/4');
  const html = buildIRealHtml('Test2', 'Autor', `irealb://Test2=Autor==Pop=D=0=${prog}=Pop=100=3`);
  const [songData] = extractIRealSongs(html);
  let ast = parseIRealSong(songData);

  // Initially Intro (4) + Verso (4) = 8 bars
  assert.equal(ast.rows.length, 2);

  // Rename Verso -> Verso 1 and verify round-trip
  ast = renameSectionAtRow(ast, 1, 'Verso 1');
  ast = roundTripHtml(ast);
  assert.equal(ast.rows[1].sectionLabel, 'Verso 1');

  // Expand Verso 1 to 8 bars (+4 bars)
  ast = appendBarsToSection(ast, 1, 4);
  assert.equal(ast.totalBars, 12);
  assert.equal(ast.rows.length, 3); // Intro (row 0), Verso 1 (rows 1 & 2)

  // Add Coro with 4 bars and repeat barlines
  ast = addSection(ast, 'Coro Final', 4, true);
  ast = roundTripHtml(ast);
  assert.equal(ast.totalBars, 16);
  assert.equal(ast.rows.length, 4);
  assert.equal(ast.rows[3].sectionLabel, 'Coro Final');
  assert.equal(ast.rows[3].bars[0].leftBarline, '{');
  assert.equal(ast.rows[3].bars[3].rightBarline, '}');

  // Delete entire Verso 1 section (rows 1 & 2 = 8 bars removed!)
  ast = deleteSectionOrRow(ast, 1, 'section');
  assert.equal(ast.totalBars, 8);
  assert.equal(ast.rows.length, 2);
  assert.equal(ast.rows[0].sectionLabel, 'Intro');
  assert.equal(ast.rows[1].sectionLabel, 'Coro Final');

  // Update a bar with beat pulses (/ / A)
  const aChord = parseChordToken('A')!;
  ast = updateBarInSong(ast, 5, (b) => ({
    ...b,
    chords: [aChord],
    elements: [{ type: 'pulse' }, { type: 'pulse' }, { type: 'chord', chord: aChord }],
  }));
  const finalReloaded = roundTripHtml(ast);
  assert.equal(finalReloaded.rows[1].bars[0].elements.length, 3);
  assert.equal(finalReloaded.rows[1].bars[0].elements[0].type, 'pulse');
  assert.equal(finalReloaded.rows[1].bars[0].elements[2].type, 'chord');
});

test('Duplicating a multi-row section supports both immediate ("after") and song-end ("end") placement with full HTML round-trip', () => {
  const prog = buildTemplateChordProgression('complete', 'E', '4/4');
  const html = buildIRealHtml('DupTest', 'Autor', `irealb://DupTest=Autor==Worship=E=0=${prog}=Worship=120=3`);
  const [songData] = extractIRealSongs(html);
  let ast = parseIRealSong(songData);

  // Put distinct chords in Verso (row 1, bar 5) and Coro (row 3, bar 13)
  const fSharpMin = parseChordToken('F#m')!;
  const bChord = parseChordToken('B')!;
  ast = updateBarInSong(ast, 5, (b) => ({
    ...b,
    chords: [fSharpMin],
    elements: [{ type: 'chord', chord: fSharpMin }],
  }));
  ast = updateBarInSong(ast, 13, (b) => ({
    ...b,
    chords: [bChord],
    elements: [{ type: 'chord', chord: bChord }],
  }));

  // 1) Duplicate 8-bar Verso (starting at row 1) right below as "Verso 2"
  ast = duplicateSection(ast, 1, 'after', 'Verso 2');
  ast = roundTripHtml(ast);

  // Intro (4) + Verso (8) + Verso 2 (8) + Coro (4) + Puente (4) = 28 bars across 7 rows
  assert.equal(ast.totalBars, 28);
  assert.equal(ast.rows.length, 7);
  assert.equal(ast.rows[1].sectionLabel, 'Verso');
  assert.equal(ast.rows[3].sectionLabel, 'Verso 2');
  assert.equal(ast.rows[3].bars[0].chords[0].displayText, 'F#m');
  assert.equal(ast.rows[5].sectionLabel, 'Coro');

  // 2) Duplicate Coro (now at row 5) to the very end of the song as "Coro Final"
  ast = duplicateSection(ast, 5, 'end', 'Coro Final');
  ast = roundTripHtml(ast);

  assert.equal(ast.totalBars, 32);
  assert.equal(ast.rows.length, 8);
  assert.equal(ast.rows[7].sectionLabel, 'Coro Final');
  assert.equal(ast.rows[7].bars[0].chords[0].displayText, 'B');
  assert.equal(ast.rows[7].bars[0].leftBarline, '{');
  assert.equal(ast.rows[7].bars[3].rightBarline, '}');
});
