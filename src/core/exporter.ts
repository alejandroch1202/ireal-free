/**
 * iReal Pro HTML Exporter Core Utility
 * 
 * Builds authentic, compliant XHTML/HTML documents matching the official iReal Pro export format,
 * preserving embedded `irealb://` links, metadata, and song headers.
 */

/**
 * Sanitizes a song title or composer for use as a filesystem filename across platforms.
 * Removes characters illegal on Android, iOS, Windows, and Linux.
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'cancion';
  const clean = name
    .replace(/[/\\?%*:|"<>#]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'cancion';
}

/**
 * Escapes HTML special characters in user-provided metadata (title, composer, playlist name)
 * so generated XHTML documents are always well-formed and safe.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Encodes unsafe URI characters (including '#', '?', '&', spaces, brackets, pipes, quotes,
 * angle brackets, and non-ASCII characters) inside an iReal Pro URL payload without
 * double-encoding already valid %XX percent-encoded sequences, while preserving '='
 * delimiters for standalone snippets and '===' playlist joins.
 */
export function encodeIRealPayloadSafely(payload: string): string {
  if (!payload) return '';
  return payload.replace(/%[0-9A-Fa-f]{2}|[^A-Za-z0-9\-_.!~*'()=;/:@+$,]/gu, (match) => {
    if (match.length === 3 && match[0] === '%') {
      return match;
    }
    return encodeURIComponent(match);
  });
}

/**
 * Ensures an iReal Pro URL string starts with a valid scheme (irealb://) and has all
 * unsafe characters (such as '#' in sharp keys/chords or spaces) properly percent-encoded.
 */
export function ensureIRealScheme(urlOrSnippet: string): string {
  const trimmed = urlOrSnippet.trim();
  if (/^irealbook:\/\//i.test(trimmed)) {
    const payload = trimmed.slice('irealbook://'.length);
    return `irealbook://${encodeIRealPayloadSafely(payload)}`;
  }
  if (/^irealb:\/\//i.test(trimmed)) {
    const payload = trimmed.slice('irealb://'.length);
    return `irealb://${encodeIRealPayloadSafely(payload)}`;
  }
  if (/^ireal:\/\//i.test(trimmed)) {
    const payload = trimmed.slice('ireal://'.length);
    return `irealb://${encodeIRealPayloadSafely(payload)}`;
  }
  return `irealb://${encodeIRealPayloadSafely(trimmed)}`;
}

/**
 * Builds an authentic iReal Pro .html document matching the format exported by the real app.
 * If rawContent is already a complete HTML document, it returns it cleaned and validated.
 * Otherwise, wraps the iReal URL / anchor in the standard iReal Pro XHTML shell.
 */
export function buildIRealHtml(
  title: string,
  composer: string,
  rawContent: string
): string {
  const trimmed = (rawContent || '').trim();

  // If already a full HTML document (e.g. from imported file or seed song), return intact
  if (
    trimmed.toLowerCase().includes('<html') &&
    trimmed.toLowerCase().includes('</html>')
  ) {
    return trimmed;
  }

  // If it already contains an <a> anchor tag with irealb://
  let anchorTag: string;
  if (trimmed.toLowerCase().includes('<a ') && trimmed.toLowerCase().includes('href=')) {
    anchorTag = trimmed;
  } else {
    // Plain URL or song string
    const safeField = (s: string) => (s || '').replace(/=/g, '-').trim();
    const cleanUrl = ensureIRealScheme(
      trimmed || `${safeField(title)}=${safeField(composer)}===Pop=C=1=`
    );
    anchorTag = `<a href="${cleanUrl}">${escapeHtml(title)}</a> - ${escapeHtml(composer)}`;
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
   <head>
      <meta name="viewport" content="width=device-width, minimum-scale=1, maximum-scale=1" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>iReal Pro</title>
      <style type="text/css">
         .help {
         font-size: small;
         color: #999999;
         }
      </style>
   </head>
   <body style="color: rgb(230, 227, 218); background-color: rgb(27, 39, 48); font-family: Helvetica,Arial,sans-serif;" alink="#b2e0ff" link="#94d5ff" vlink="#b2e0ff">
      <br/><br/>
      <h3>${anchorTag}<br/><br/></h3><br/>
      <p></p><br/>
      <br/>Made with iReal Pro 
      <a href="https://www.irealpro.com"><img src="https://www.irealb.com/forums/images/images/misc/ireal-pro-logo-50.png" width="25" height="25" hspace="10" alt=""/></a>
      <br/><br/><span class="help">- iOS: pulsa Compartir/Exportar y escoge iReal Pro.<br />- Mac: arrastra el fichero .html hasta el icono iReal Pro App.</span><br/>
   </body>
</html>\n`;
}
