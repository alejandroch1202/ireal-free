import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildIRealHtml, sanitizeFilename } from '../core/exporter';

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
