import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  buildIRealHtml,
  ensureIRealScheme,
  escapeHtml,
  sanitizeFilename,
} from '../core/exporter';

export interface ExportResult {
  success: boolean;
  type: 'file' | 'web-download' | 'text-fallback';
  fileName: string;
  error?: string;
}

/**
 * Exports an iReal Pro song as a genuine .html file and opens the device's native share sheet
 * (allowing sending directly via WhatsApp, Telegram, Files, AirDrop, etc.),
 * or downloads it in browser environments.
 */
export async function exportAndShareSongHtml(
  title: string,
  composer: string,
  rawInput: string,
  key?: string
): Promise<ExportResult> {
  const fileName = `${sanitizeFilename(title)}.html`;
  const htmlContent = buildIRealHtml(title, composer, rawInput);

  // 1. Web Platform: Instant browser download
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true, type: 'web-download', fileName };
      }
    } catch (err: unknown) {
      return {
        success: false,
        type: 'web-download',
        fileName,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Mobile Platforms (Android & iOS)
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('Directorio temporal del dispositivo no disponible.');
    }

    const fileUri = `${cacheDir}${fileName}`;

    // Write HTML file to device cache directory
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check if system file sharing is available
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: `Compartir ${fileName}`,
        UTI: 'public.html',
      });
      return { success: true, type: 'file', fileName };
    }

    // Fallback: Native text share
    await Share.share({
      title: fileName,
      message: `${title} (${key || ''}) - iReal Pro\n\n${htmlContent}`,
    });
    return { success: true, type: 'text-fallback', fileName };
  } catch (err: unknown) {
    // Secondary fallback: Native text share
    try {
      await Share.share({
        title: fileName,
        message: `${title} (${key || ''})\n\n${htmlContent}`,
      });
      return { success: true, type: 'text-fallback', fileName };
    } catch {
      return {
        success: false,
        type: 'file',
        fileName,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Exports multiple songs or the entire library as a single authentic iReal Pro playlist .html document.
 * Enables complete repertoire backup and sharing.
 */
export async function exportAndShareLibraryHtml(
  songs: Array<{ title: string; composer: string; rawInput: string; key?: string }>,
  playlistName: string = 'Repertorio iReal Free'
): Promise<ExportResult> {
  if (songs.length === 0) {
    return {
      success: false,
      type: 'file',
      fileName: '',
      error: 'No hay canciones para exportar.',
    };
  }

  const songPayloads: string[] = [];
  const songAnchorTags: string[] = [];

  for (const s of songs) {
    const raw = (s.rawInput || '').trim();
    const safeTitle = escapeHtml(s.title);
    const safeComposer = escapeHtml(s.composer || 'Unknown');

    // Prefer extracting full href="..." first (safely captures legacy links even if they had spaces)
    const hrefMatch = raw.match(/href=["']([^"']*(?:ireal|irealb|irealbook):\/\/[^"']+)["']/i);
    const directMatch = !hrefMatch
      ? raw.match(/((?:ireal|irealb|irealbook):\/\/[^\s"'>]+)/i)
      : null;
    const rawSchemeUrl = hrefMatch ? hrefMatch[1] : directMatch ? directMatch[1] : null;

    if (rawSchemeUrl) {
      const normalizedUrl = ensureIRealScheme(rawSchemeUrl);
      const strippedPayload = normalizedUrl.replace(/^ireal(?:b|book)?:\/\//i, '');
      songPayloads.push(strippedPayload);
      songAnchorTags.push(
        `<a href="irealb://${strippedPayload}">${safeTitle}</a> - ${safeComposer}`
      );
    } else {
      const cleanField = (val: string) => val.replace(/=/g, '-').trim();
      const encTitle = encodeURIComponent(cleanField(s.title || 'Untitled'));
      const encComposer = encodeURIComponent(cleanField(s.composer || 'Unknown'));
      const encKey = encodeURIComponent(cleanField(s.key || 'C'));
      const payload = `${encTitle}=${encComposer}==Pop=${encKey}=1=`;
      songPayloads.push(payload);
      songAnchorTags.push(
        `<a href="irealb://${payload}">${safeTitle}</a> - ${safeComposer}`
      );
    }
  }

  const encodedPlaylistName = encodeURIComponent(playlistName.replace(/=/g, '-').trim());
  const safePlaylistName = escapeHtml(playlistName);
  const combinedPlaylistUrl = `irealb://${songPayloads.join('===')}===${encodedPlaylistName}`;

  const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
   <head>
      <meta name="viewport" content="width=device-width, minimum-scale=1, maximum-scale=1" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>iReal Pro - ${safePlaylistName}</title>
      <style type="text/css">
         .help {
         font-size: small;
         color: #999999;
         }
      </style>
   </head>
   <body style="color: rgb(230, 227, 218); background-color: rgb(27, 39, 48); font-family: Helvetica,Arial,sans-serif;" alink="#b2e0ff" link="#94d5ff" vlink="#b2e0ff">
      <br/><br/>
      <h3><a href="${combinedPlaylistUrl}">${safePlaylistName} (${songs.length} canciones)</a><br/><br/></h3>
      <div style="margin-top: 10px; margin-bottom: 20px;">
        ${songAnchorTags.map((tag) => `<div>${tag}</div><br/>`).join('\n        ')}
      </div>
      <br/>Made with iReal Pro 
      <a href="https://www.irealpro.com"><img src="https://www.irealb.com/forums/images/images/misc/ireal-pro-logo-50.png" width="25" height="25" hspace="10" alt=""/></a>
      <br/><br/><span class="help">- iOS: pulsa Compartir/Exportar y escoge iReal Pro.<br />- Mac: arrastra el fichero .html hasta el icono iReal Pro App.</span><br/>
   </body>
</html>\n`;

  const fileName = `${sanitizeFilename(playlistName)}_${songs.length}_canciones.html`;

  // 1. Web Platform: Instant browser download
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true, type: 'web-download', fileName };
      }
    } catch (err: unknown) {
      return {
        success: false,
        type: 'web-download',
        fileName,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Mobile Platforms (Android & iOS)
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('Directorio temporal del dispositivo no disponible.');
    }

    const fileUri = `${cacheDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: `Exportar ${fileName}`,
        UTI: 'public.html',
      });
      return { success: true, type: 'file', fileName };
    }

    await Share.share({
      title: fileName,
      message: `${playlistName} (${songs.length} canciones)\n\n${htmlContent}`,
    });
    return { success: true, type: 'text-fallback', fileName };
  } catch (err: unknown) {
    try {
      await Share.share({
        title: fileName,
        message: `${playlistName} (${songs.length} canciones)\n\n${htmlContent}`,
      });
      return { success: true, type: 'text-fallback', fileName };
    } catch {
      return {
        success: false,
        type: 'file',
        fileName,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
