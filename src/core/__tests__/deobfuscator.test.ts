import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIRealSongs, deobfuscateChordString, hussle } from '../deobfuscator';

const SAMPLE_HTML = `<a href="irealb://El%20Dios%20Que%20Adoramos%3DLa%20IBI%20%26%20GSM%3D%3DPop%3DG%3D4%3D1r34LbKcu7osre%2044%3C*6*%7BY%5D%20D%20GZLC%20-EQ%7CyXD%7CQyXG%3Eort%209v%3C*69Ti*%7CYp%7CQyXKcl%20L%20lcKQyXCZL%20lcKyQX-EZL%20lcKQyXDZ%20%7DY%7CCQyXG%3E-EZL%20DXyQKXDZL%20lcKQyXG%3Eoor%2096*%3CC*%7CY%5D%20%20lcyQKclZL-EpyXC%7CQXyQ%7CGL%20lcKQyXDZL%20lcQKyXG%7CQyXD%7CQyXB%2FZE-XyC%7CQyXyX-E%7CyQ%7CD%2FQyXC%3Elatnemurt%20s96*%3Ci*%7CY%5DQyX%23F%7CDXyQX-E%7CQcKQyX*03AlneuP(%20egdir%2096%3C*B*%7BY%5D%20%20%3EortnI%20te)%3EC%3C%20D%7CQOC33*XyQKcY%7D%20%20lcKQyX%23F%2FDLZ%20lcKQyXE%2FCZL%20l%7CXyQ%3CDZL%20lRO%3EXyQ%20LZXyQ%3C*36FINAL%3EXyQ%20%20Z%20%3DPop-Rock%3D115%3D3">El Dios Que Adoramos</a>`;

test('extractIRealSongs should parse HTML song container into fields', () => {
  const songs = extractIRealSongs(SAMPLE_HTML);
  assert.equal(songs.length, 1);
  const song = songs[0];
  assert.equal(song.title, 'El Dios Que Adoramos');
  assert.equal(song.composer, 'La IBI & GSM');
  assert.equal(song.style, 'Pop');
  assert.equal(song.key, 'G');
  assert.equal(song.tempo, 115);
  assert.equal(song.repeats, 3);
  assert.equal(song.accompanimentStyle, 'Pop-Rock');
  assert.ok(song.obfuscatedChords.startsWith('1r34LbKcu7'));
});

test('hussle algorithm correctly swaps 50-char blocks', () => {
  // Check symmetry: applying hussle twice restores the original block
  const block = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN';
  assert.equal(block.length, 50);
  const hussled = hussle(block);
  assert.notEqual(hussled, block);
  const restored = hussle(hussled);
  assert.equal(restored, block);
});

test('deobfuscateChordString restores the expected lead sheet chord progression', () => {
  const songs = extractIRealSongs(SAMPLE_HTML);
  const deobfuscated = deobfuscateChordString(songs[0].obfuscatedChords);

  // Check critical milestones in the deobfuscated string
  assert.ok(deobfuscated.includes('*iT44<*69 tro>G'));
  assert.ok(deobfuscated.includes('*v<*69 erso>G'));
  assert.ok(deobfuscated.includes('*C<*69 oro>G'));
  assert.ok(deobfuscated.includes('G/B'));
  assert.ok(deobfuscated.includes('D/F#'));
  assert.ok(deobfuscated.includes('C/E'));
  assert.ok(deobfuscated.includes('Al Intro'));
  assert.ok(deobfuscated.includes('CORO'));
  assert.ok(deobfuscated.includes('FINAL'));
});
