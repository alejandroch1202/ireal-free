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

test('Updating song metadata (title, composer, original key) persists upon serialization and reparse', () => {
  const htmlPath = path.resolve(process.cwd(), 'charts/Hosanna.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const [songData] = extractIRealSongs(html);
  const ast = parseIRealSong(songData);

  // Update metadata
  const updatedAst = {
    ...ast,
    title: 'Hosanna (En Vivo)',
    composer: 'Hillsong Worship',
    originalKey: 'D',
    currentKey: 'D',
    style: 'Worship',
    tempo: 72,
  };

  const serializedHtml = serializeSongToIRealHtml(updatedAst);
  const [reparsedSongData] = extractIRealSongs(serializedHtml);
  const reparsed = parseIRealSong(reparsedSongData);

  assert.equal(reparsed.title, 'Hosanna (En Vivo)');
  assert.equal(reparsed.composer, 'Hillsong Worship');
  assert.equal(reparsed.originalKey, 'D');
  assert.equal(reparsed.style, 'Worship');
  assert.equal(reparsed.tempo, 72);
});

test('Multiple songs in a playlist HTML export can be extracted and reloaded accurately', () => {
  const songs = [
    {
      title: 'Cancion Uno',
      composer: 'Compositor 1',
      rawInput: '<a href="irealb://Cancion%20Uno=Compositor%201==Pop=C=0=Y%5B*iT44%20C%20%7CG%20%5D=Pop=120=3">Cancion Uno</a>',
    },
    {
      title: 'Cancion Dos',
      composer: 'Compositor 2',
      rawInput: '<a href="irealb://Cancion%20Dos=Compositor%202==Ballad=G=0=Y%5B*vT44%20G%20%7CD%20%5D=Ballad=80=3">Cancion Dos</a>',
    },
  ];

  const songPayloads = songs.map((s) => {
    const match = s.rawInput.match(/irealb:\/\/([^"'>]+)/);
    return match ? match[1] : '';
  });

  const playlistUrl = `irealb://${songPayloads.join('===')}===Mi%20Repertorio`;
  const fullHtml = `<html><body><h3><a href="${playlistUrl}">Mi Repertorio</a></h3></body></html>`;

  const extracted = extractIRealSongs(fullHtml);
  assert.equal(extracted.length, 2);
  assert.equal(extracted[0].title, 'Cancion Uno');
  assert.equal(extracted[0].key, 'C');
  assert.equal(extracted[1].title, 'Cancion Dos');
  assert.equal(extracted[1].key, 'G');
});
