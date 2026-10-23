import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename, ensureIRealScheme, buildIRealHtml } from '../exporter';

test('sanitizeFilename removes illegal filesystem characters', () => {
  assert.equal(sanitizeFilename('El Dios Que Adoramos'), 'El Dios Que Adoramos');
  assert.equal(sanitizeFilename('Song / With : Bad * Chars?'), 'Song _ With _ Bad _ Chars_');
  assert.equal(sanitizeFilename('Sólo Cristo <Live> #1'), 'Sólo Cristo _Live_ _1');
  assert.equal(sanitizeFilename(''), 'cancion');
});

test('ensureIRealScheme handles URLs and raw strings', () => {
  assert.equal(
    ensureIRealScheme('irealb://El%20Dios=Pop'),
    'irealb://El%20Dios=Pop'
  );
  assert.equal(
    ensureIRealScheme('irealbook://El%20Dios=Pop'),
    'irealbook://El%20Dios=Pop'
  );
  assert.equal(
    ensureIRealScheme('Song=Composer'),
    'irealb://Song=Composer'
  );
  // Encodes raw spaces, '#' (sharp keys/chords), and brackets even when irealb:// is already present
  assert.equal(
    ensureIRealScheme('irealb://Cancion #1=Autor==Pop=F#-=0=[*i F#- | C#- ]'),
    'irealb://Cancion%20%231=Autor==Pop=F%23-=0=%5B*i%20F%23-%20%7C%20C%23-%20%5D'
  );
});

test('buildIRealHtml escapes HTML special characters in title and composer', () => {
  const result = buildIRealHtml('Canción <En Vivo> & #1', 'Autor "A"', 'irealb://Test=Autor');
  assert.ok(result.includes('Canción &lt;En Vivo&gt; &amp; #1</a> - Autor &quot;A&quot;'));
});

test('buildIRealHtml preserves existing full HTML documents', () => {
  const fullHtml = `<!DOCTYPE html><html><head><title>iReal Pro</title></head><body><h3><a href="irealb://test">Song</a></h3></body></html>`;
  const result = buildIRealHtml('Song', 'Artist', fullHtml);
  assert.equal(result, fullHtml);
});

test('buildIRealHtml wraps <a> tags in authentic iReal Pro XHTML shell', () => {
  const aTag = `<a href="irealb://MySong%3DArtist">MySong</a> - Artist`;
  const result = buildIRealHtml('MySong', 'Artist', aTag);

  assert.ok(result.includes('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"'));
  assert.ok(result.includes('<title>iReal Pro</title>'));
  assert.ok(result.includes('<h3><a href="irealb://MySong%3DArtist">MySong</a> - Artist<br/><br/></h3>'));
  assert.ok(result.includes('Made with iReal Pro'));
  assert.ok(result.includes('arrastra el fichero .html hasta el icono iReal Pro App'));
});

test('buildIRealHtml constructs a complete HTML document from raw irealb:// URL', () => {
  const rawUrl = 'irealb://Hay%20Libertad%3DLa%20IBI%3D%3DPop%3DD%3D2%3D...';
  const result = buildIRealHtml('Hay Libertad', 'La IBI', rawUrl);

  assert.ok(result.includes('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"'));
  assert.ok(result.includes('<a href="irealb://Hay%20Libertad%3DLa%20IBI%3D%3DPop%3DD%3D2%3D...">Hay Libertad</a> - La IBI'));
  assert.ok(result.includes('iReal Pro'));
});
