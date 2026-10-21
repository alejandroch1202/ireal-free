import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIRealSongs } from '../deobfuscator';
import { parseIRealSong, parseChordToken, formatChordQuality } from '../parser';

const SAMPLE_HTML = `<a href="irealb://El%20Dios%20Que%20Adoramos%3DLa%20IBI%20%26%20GSM%3D%3DPop%3DG%3D4%3D1r34LbKcu7osre%2044%3C*6*%7BY%5D%20D%20GZLC%20-EQ%7CyXD%7CQyXG%3Eort%209v%3C*69Ti*%7CYp%7CQyXKcl%20L%20lcKQyXCZL%20lcKyQX-EZL%20lcKQyXDZ%20%7DY%7CCQyXG%3E-EZL%20DXyQKXDZL%20lcKQyXG%3Eoor%2096*%3CC*%7CY%5D%20%20lcyQKclZL-EpyXC%7CQXyQ%7CGL%20lcKQyXDZL%20lcQKyXG%7CQyXD%7CQyXB%2FZE-XyC%7CQyXyX-E%7CyQ%7CD%2FQyXC%3Elatnemurt%20s96*%3Ci*%7CY%5DQyX%23F%7CDXyQX-E%7CQcKQyX*03AlneuP(%20egdir%2096%3C*B*%7BY%5D%20%20%3EortnI%20te)%3EC%3C%20D%7CQOC33*XyQKcY%7D%20%20lcKQyX%23F%2FDLZ%20lcKQyXE%2FCZL%20l%7CXyQ%3CDZL%20lRO%3EXyQ%20LZXyQ%3C*36FINAL%3EXyQ%20%20Z%20%3DPop-Rock%3D115%3D3">El Dios Que Adoramos</a>`;

test('formatChordQuality converts minus sign to m', () => {
  assert.equal(formatChordQuality('-'), 'm');
  assert.equal(formatChordQuality('-7'), 'm7');
  assert.equal(formatChordQuality('-7b5'), 'm7b5');
  assert.equal(formatChordQuality('^7'), 'maj7');
});

test('parseChordToken extracts root, quality, bass, and displayText', () => {
  const g = parseChordToken('G')!;
  assert.ok(g);
  assert.equal(g.root, 'G');
  assert.equal(g.displayText, 'G');

  const em = parseChordToken('E-')!;
  assert.ok(em);
  assert.equal(em.root, 'E');
  assert.equal(em.quality, '-');
  assert.equal(em.displayText, 'Em');

  const dfsharp = parseChordToken('D/F#')!;
  assert.ok(dfsharp);
  assert.equal(dfsharp.root, 'D');
  assert.equal(dfsharp.bass, 'F#');
  assert.equal(dfsharp.displayText, 'D/F#');

  const gb = parseChordToken('G/B')!;
  assert.ok(gb);
  assert.equal(gb.root, 'G');
  assert.equal(gb.bass, 'B');
  assert.equal(gb.displayText, 'G/B');

  const ce = parseChordToken('C/E')!;
  assert.ok(ce);
  assert.equal(ce.root, 'C');
  assert.equal(ce.bass, 'E');
  assert.equal(ce.displayText, 'C/E');
});

test('parseIRealSong correctly parses song into sections, rows (4 bars each), and bars', () => {
  const [songData] = extractIRealSongs(SAMPLE_HTML);
  const ast = parseIRealSong(songData);

  assert.equal(ast.title, 'El Dios Que Adoramos');
  assert.equal(ast.composer, 'La IBI & GSM');
  assert.equal(ast.originalKey, 'G');
  assert.equal(ast.timeSignature, '4/4');

  // Verify 4 bars per row rule
  for (let i = 0; i < ast.rows.length; i++) {
    const row = ast.rows[i];
    assert.ok(row.bars.length <= 4, `Row ${i} should have at most 4 bars`);
    if (i < ast.rows.length - 1) {
      assert.equal(row.bars.length, 4, `Row ${i} must have exactly 4 bars`);
    }
  }

  // Verify section names were correctly detected and completed
  const sectionLabels = ast.sections.map(s => s.label);
  assert.ok(sectionLabels.includes('Intro'));
  assert.ok(sectionLabels.includes('Verso'));
  assert.ok(sectionLabels.includes('Coro'));
  assert.ok(sectionLabels.includes('Instrumental'));
  assert.ok(sectionLabels.includes('Bridge (Puente)'));

  // Verify Bar 1: Intro, 4/4, Chord G
  const bar1 = ast.rows[0].bars[0];
  assert.equal(bar1.sectionLabel, 'Intro');
  assert.equal(bar1.timeSignature, '4/4');
  assert.equal(bar1.chords[0].displayText, 'G');

  // Verify Bar 3 has two chords: Em and C
  const bar3 = ast.rows[0].bars[2];
  assert.equal(bar3.chords.length, 2);
  assert.equal(bar3.chords[0].displayText, 'Em');
  assert.equal(bar3.chords[1].displayText, 'C');

  // Verify Bar 4 has two chords: G and D, and right barline ']'
  const bar4 = ast.rows[0].bars[3];
  assert.equal(bar4.chords.length, 2);
  assert.equal(bar4.chords[0].displayText, 'G');
  assert.equal(bar4.chords[1].displayText, 'D');
  assert.equal(bar4.rightBarline, ']');

  // Verify repeat measures: Bar 6 is a repeat measure (%)
  const bar6 = ast.rows[1].bars[1];
  assert.equal(bar6.isRepeatMeasure, true);

  // Verify repeat barlines: Bar 5 left barline is '{' (repeat start)
  const bar5 = ast.rows[1].bars[0];
  assert.equal(bar5.leftBarline, '{');

  // Verify Bar 12 right barline is '}' (repeat end)
  const bar12 = ast.rows[2].bars[3];
  assert.equal(bar12.rightBarline, '}');

  // Verify annotations: "Al Intro" in bar 36
  const bar36 = ast.rows[8].bars[3];
  assert.ok(bar36.annotations.includes('Al Intro'));
});

test('parseIRealSong correctly parses Hay Libertad with authentic section breaks and annotations', () => {
  const HAY_LIBERTAD_HTML = `<a href="irealb://Hay%20Libertad%3DLa%20IBI%20%26%20GSM%3D%3DPop%3DD%3D2%3D1r34LbKcu7l%20ne%2044%3C*6nu%20etnemalos%20rcaoT(30*%3CD%3Eort%209a%20vezTi*%7BYXG%3Eos%20vuel*%3Cv*%7BY%7DQyXA%7CQy-XB%7CQyXG%7CQyX%3E)at69%20erad2%20a*%7BY%5D%20yQ%7CB-yXA%7CQyXD%7CQyXG%7C%20%7D%3Ex327*%3C%20%20A%7CQyXQKcl%20XD%7CQyaerB3%20oro%3E%20%20%3EortnI%20lA%3C%20AQ%7CyX-B%7CQyXG%7CQyXD%7D%7C%3C*096*%3CCcKQyXQKcl%20neuP(%20egdir%2096%3C*B*%7BY%20%20QyXQyX%5D%20te)%3EDyXD%3EkKQyXAXyQKcKQyXD%7CQyXA%7CQyX%7CDQyXG%7CQyX-BZL%20lcl%20LZAZL%20l-B%7CQyGXyQKXD%3Eoro%2096*%3CC*%7B%7DY%20%20lcKQyXDZL%20lcyQ%7CGXZL%20lc%20%20A%7CQ%20%20%3C*7QyXG%7CQyXD%3Elani%20F96*%3CD*%7BY%7D%20%3Ex42%7CB-XyA%7CQyX%3CFine%3E%20%7D%20%3DPop-Rock%3D115%3D1">Hay Libertad</a>`;
  const [songData] = extractIRealSongs(HAY_LIBERTAD_HTML);
  const ast = parseIRealSong(songData);

  assert.equal(ast.title, 'Hay Libertad');
  assert.equal(ast.originalKey, 'D');

  // Row 0: Intro (IN + tro)
  assert.equal(ast.rows[0].bars[0].sectionLetter, 'IN');
  assert.equal(ast.rows[0].bars[0].sectionSuffix, 'tro');
  assert.ok(ast.rows[0].bars[0].bottomAnnotations.some(a => a.includes('Tocar solamente')));

  // Row 1: Verso (V + erso) starts on fresh row ("punto y aparte")
  assert.equal(ast.rows[1].bars[0].sectionLetter, 'V');
  assert.equal(ast.rows[1].bars[0].sectionSuffix, 'erso');

  // Verso repeat end bar has topAnnotation "3x"
  assert.ok(ast.rows[1].bars[3].topAnnotations.includes('3x'));

  // Coro Break row has exactly 2 bars
  const breakRow = ast.rows[4];
  assert.equal(breakRow.bars.length, 2);
  assert.ok(breakRow.bars[0].bottomAnnotations.includes('Break'));

  // Bridge starts on fresh row ("punto y aparte")
  assert.equal(ast.rows[5].bars[0].sectionLetter, 'B');
  assert.equal(ast.rows[5].bars[0].sectionSuffix, 'ridge (Puente)');

  // Final Coro repeat end bar has topAnnotation "4x"
  assert.ok(ast.rows[9].bars[3].topAnnotations.includes('4x'));

  // Final section has "Fine" in bottomAnnotations
  assert.ok(ast.rows[10].bars[3].bottomAnnotations.includes('Fine'));
});

test('parseIRealSong correctly extracts rhythmic pulses and sequential chord elements', () => {
  const CELEBRARE_HTML = `<a href="irealb://Celebrar%C3%A9%3DWorship%20Gateway%3D%3DPop%3DE%3D4%3D1r34LbKcu7Ei*%7B%5DyQ%20%20%3CQyXQyX%3Ea%C3%ADretaBo%20loS%20ortnI%20%2063*XyQ%20%20X44T%5B%20osre%23-%2C%7CpoT(30*%3Cv*%7BY%7Dpppp%7C%2CApp%2C-%23Cl%7Cpppcar%20VFspp%2CcKQyXuna%20v%20lcKQyXE%3E)atlevu%20adnuges%20al%20zeLZF%23-%20olosZL%20lc%23-XyQZL%20lcKQyXEC*%7BY%20%7D%20lcKQyXAZL%20lcKBXyQKCZL%20luP%2096ZB%20LZY%5D%20%20%3EortnI%20lA%3CA%202N%7D%20%20-%23F1NZL%20A%7B*B%3C*L%20-%23CKQyXD(PrimKQyXE%3E)latnemutrsni%20atleuv%20arecl%20LZ%20etneniF%20oC%23-Xy*%3CC*%7BY%7D%20%3Ex427*%20%3ClcKQyXAZL%20lcKQ69%20orZL%20lcZL%20lc*06(PZL%20lcKQyX%3E)zovo%20l%C3%B3s%20zev%20aremirBXyQK%3CE%3ElaX-%23C%7CFull%20N%7D%20%20-%23F1NZL%20AZ%20LBZL%20-%23C%3E)adnab2AXyQ(30*%3Cppp%7C%2CyQ%7CAX%23Cl%7Cpppp%7C%2C-%23Fspp%2CEi*%7BY%5D%20%20lcKQy-%2CppAXB%7CQy%3CFine%3Ep%7D%20%3DPop-Rock%3D115%3D1">Celebraré</a>`;
  const [songData] = extractIRealSongs(CELEBRARE_HTML);
  const ast = parseIRealSong(songData);

  // In Celebraré:
  // Row 0 is the dedicated opening preamble measure [ 4/4  Intro Solo Batería  ]
  assert.equal(ast.rows[0].bars.length, 1);
  assert.equal(ast.rows[0].bars[0].bottomAnnotations[0], 'Intro Solo Batería');
  assert.equal(ast.rows[0].bars[0].timeSignature, '4/4');

  // Row 1 is Intro:
  // Bar 0: E / / F#m (chord, pulse, pulse, chord) with 4/4 at start of measure
  const bar0 = ast.rows[1].bars[0];
  assert.equal(bar0.timeSignature, '4/4');
  assert.equal(bar0.elements.length, 4);
  assert.equal(bar0.elements[0].type, 'chord');
  if (bar0.elements[0].type === 'chord') {
    assert.equal(bar0.elements[0].chord.displayText, 'E');
  }
  assert.equal(bar0.elements[1].type, 'pulse');
  assert.equal(bar0.elements[2].type, 'pulse');
  assert.equal(bar0.elements[3].type, 'chord');
  if (bar0.elements[3].type === 'chord') {
    assert.equal(bar0.elements[3].chord.displayText, 'F#m');
  }

  // Bar 1: / / / / (4 rhythmic slashes)
  const bar1 = ast.rows[1].bars[1];
  assert.equal(bar1.elements.length, 4);
  assert.ok(bar1.elements.every(e => e.type === 'pulse'));

  // Coro (Row 5): 5 bars ending with N1 and N2
  const coroEndingRow = ast.rows[5];
  assert.equal(coroEndingRow.bars.length, 5);
  // Bar 3 has 1. ending F#m
  assert.equal(coroEndingRow.bars[3].ending, '1');
  assert.equal(coroEndingRow.bars[3].chords[0].displayText, 'F#m');
  assert.equal(coroEndingRow.bars[3].rightBarline, '}');
  // Bar 4 has 2. ending A with Al Intro
  assert.equal(coroEndingRow.bars[4].ending, '2');
  assert.equal(coroEndingRow.bars[4].chords[0].displayText, 'A');
  assert.equal(coroEndingRow.bars[4].rightBarline, ']');
  assert.ok(coroEndingRow.bars[4].bottomAnnotations.includes('Al Intro'));
});

test('parseIRealSong correctly parses Venid, Glorificad A Dios with Segno, Coda, and endings', () => {
  const VENID_HTML = `<a href="irealb://Venid%2C%20Glorificad%20A%20Dios%3DGracia%20Soberana%20M%C3%BAsica%3D%3DBallad%3DG%3D7%3D1r34LbKcu7%20xs%20Z68%3C*3lZLxs%20ZL%20G%7B%20Qy%3EXa%C3%ADretaB%20oloS%206C%2FG%20LTi*%7CYCZLG%20SlGXyXCZLG%20-E%7C%7DQyXGQ%7CyXG%2FC%7CQyXG%2FF%7CQyQ%7CE-v*%7BY%7DQyXC%7C%20LZD-QyXD%7CQyX-EC*%7CY%20%5D%20x%20ZL%20GZL%20CZL%20%7CGXyQG%7CQyX%7Cr%20%3EaQ%7CDXya%20.S.D%20%3C%20%20%7CQyXiG*Y%7CQyXGZLC%20F%7CQl%20CodyX-E%7C%20lcKQ%7CXyQ%20yXC2N%7D%20%20CZL%20-BN1ZL%20DZL%20-EQi*%7BYQ%7CGXy%5D%20QyXyX%3EORLZ%20x%20%3CQyXC*ZL%20QyX%3EORSEV33*%3CQyXv*YZL*33CO%20x%20ZLQ%3C*69XyQXyQ2x%3E%20%3C*03Fine%3E%20Z%20%3DJazz-Ballad%20Swing%3D60%3D3">Venid, Glorificad A Dios</a>`;
  const [songData] = extractIRealSongs(VENID_HTML);
  const ast = parseIRealSong(songData);

  assert.equal(ast.title, 'Venid, Glorificad A Dios');
  assert.equal(ast.originalKey, 'G');

  // Row 0: Intro (Solo Batería, 6/8 time signature, G | % | C/G | %)
  assert.equal(ast.rows[0].bars.length, 4);
  assert.equal(ast.rows[0].bars[0].timeSignature, '6/8');
  assert.equal(ast.rows[0].bars[0].leftBarline, '{');
  assert.equal(ast.rows[0].bars[0].chords[0].displayText, 'G');
  assert.ok(ast.rows[0].bars[1].isRepeatMeasure);
  assert.equal(ast.rows[0].bars[2].chords[0].displayText, 'C/G');
  assert.ok(ast.rows[0].bars[3].isRepeatMeasure);
  assert.equal(ast.rows[0].bars[3].rightBarline, '}');

  // Row 1: Verso with Segno (S)
  assert.equal(ast.rows[1].sectionSign, 'segno');
  assert.equal(ast.rows[1].bars[0].chords[0].displayText, 'G');
  assert.equal(ast.rows[1].bars[1].chords[0].displayText, 'F/G');
  assert.equal(ast.rows[1].bars[2].chords[0].displayText, 'C/G');
  assert.equal(ast.rows[1].bars[3].chords[0].displayText, 'G');

  // Row 6: D.S. al Coda with two-measure repeat (r)
  const dsRow = ast.rows[6];
  assert.ok(dsRow.bars.some(b => b.isDoubleRepeatMeasure));
  assert.ok(dsRow.bars.some(b => b.bottomAnnotations.includes('D.S. al Coda')));

  // Row 7: Intro Coda (Q) with N1 and N2 endings
  const codaRow = ast.rows[7];
  assert.equal(codaRow.sectionSign, 'coda');
  assert.equal(codaRow.bars[0].chords[0].displayText, 'Em');
  assert.equal(codaRow.bars[2].ending, '1');
  assert.equal(codaRow.bars[2].chords[0].displayText, 'Bm');
  assert.equal(codaRow.bars[4].ending, '2');
  assert.equal(codaRow.bars[4].chords[0].displayText, 'C');

  // Final Row: VERSO and CORO direction blocks with Fine at bottom
  const finalRow = ast.rows[ast.rows.length - 1];
  assert.equal(finalRow.bars.length, 2);
  assert.ok(finalRow.bars[0].bottomAnnotations.some(a => a.includes('VERSO')) || finalRow.bars[0].annotations.some(a => a.includes('VERSO')));
  assert.ok(finalRow.bars[1].bottomAnnotations.some(a => a.includes('CORO')) || finalRow.bars[1].annotations.some(a => a.includes('CORO')));
  assert.ok(finalRow.bars[1].bottomAnnotations.includes('Fine'));
  assert.equal(finalRow.bars[1].rightBarline, 'Z');
});

test('normalizeComposerName correctly inverts artist names to natural forward order', () => {
  const { normalizeComposerName } = require('../deobfuscator');
  assert.equal(normalizeComposerName('Worship Gateway'), 'Gateway Worship');
  assert.equal(normalizeComposerName('Music Bethel'), 'Bethel Music');
  assert.equal(normalizeComposerName('Marquez Gerry'), 'Gerry Marquez');
  assert.equal(normalizeComposerName('United Hillsong'), 'Hillsong United');
  assert.equal(normalizeComposerName('Marquez, Gerry'), 'Gerry Marquez');
  assert.equal(normalizeComposerName('Gracia Soberana Música'), 'Gracia Soberana Música');
  assert.equal(normalizeComposerName('La IBI & GSM'), 'La IBI & GSM');

  const html = '<a href="irealb://Song=Composer==">Song</a> - Gateway Worship';
  assert.equal(normalizeComposerName('Worship Gateway', html), 'Gateway Worship');
});
