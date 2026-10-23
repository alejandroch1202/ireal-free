import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { extractIRealSongs } from '../core/deobfuscator';
import { parseIRealSong } from '../core/parser';
import { buildIRealHtml } from '../core/exporter';
import { DEFAULT_IREAL_HTML } from '../samples/defaultSong';
import type { SongAST, ParsedIRealUrlResult } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface ImportModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onSongLoaded: (song: SongAST, rawContent: string) => void;
  onMultipleSongsLoaded?: (items: Array<{ song: SongAST; rawContent: string }>) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  theme,
  onClose,
  onSongLoaded,
  onMultipleSongsLoaded,
}) => {
  const [inputText, setInputText] = useState('');
  const [rawSourceContent, setRawSourceContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [playlistSongs, setPlaylistSongs] = useState<ParsedIRealUrlResult[]>([]);

  const handleResetModal = () => {
    setError(null);
    setInputText('');
    setRawSourceContent('');
    setPlaylistSongs([]);
  };

  const handleClose = () => {
    handleResetModal();
    onClose();
  };

  const buildStandaloneContent = (songData: ParsedIRealUrlResult): string => {
    const cleanField = (val: string, fallback: string) =>
      (val || '').replace(/=/g, '-').trim() || fallback;
    const payload = `${cleanField(songData.title, 'Untitled')}=${cleanField(
      songData.composer,
      'Unknown'
    )}==${cleanField(songData.style, 'Pop')}=${cleanField(
      songData.key,
      'C'
    )}=${cleanField(songData.tempoField || '0', '0')}=${
      songData.obfuscatedChords
    }=${cleanField(songData.accompanimentStyle || songData.style, 'Pop')}=${
      songData.tempo || 120
    }=${songData.repeats || 3}`;
    const songUrl = `irealb://${encodeURIComponent(payload)}`;
    return buildIRealHtml(songData.title, songData.composer, songUrl);
  };

  // Open native file picker to pick one or more .html files
  const handlePickFile = async () => {
    setError(null);
    setLoadingFile(true);
    setPlaylistSongs([]);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/html', 'text/plain', 'application/xhtml+xml', '*/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoadingFile(false);
        return;
      }

      const allExtractedSongs: ParsedIRealUrlResult[] = [];
      let firstSingleFileContent = '';

      for (const asset of result.assets) {
        try {
          let fileContent = '';

          if (Platform.OS === 'web') {
            const fileObj = (asset as unknown as { file?: File }).file;
            if (fileObj) {
              fileContent = await fileObj.text();
            } else {
              const res = await fetch(asset.uri);
              fileContent = await res.text();
            }
          } else {
            try {
              fileContent = await FileSystem.readAsStringAsync(asset.uri);
            } catch {
              const res = await fetch(asset.uri);
              fileContent = await res.text();
            }
          }

          if (fileContent && fileContent.trim()) {
            const extracted = extractIRealSongs(fileContent);
            if (extracted.length > 0) {
              allExtractedSongs.push(...extracted);
              if (!firstSingleFileContent) {
                firstSingleFileContent = fileContent;
              }
            }
          }
        } catch (assetErr) {
          console.warn(`Error al leer archivo ${asset.name}:`, assetErr);
        }
      }

      if (allExtractedSongs.length === 0) {
        setError(
          result.assets.length === 1
            ? `No se encontró ninguna canción válida de iReal Pro en "${result.assets[0].name}". Asegúrate de que sea un archivo exportado de iReal Pro (.html).`
            : `No se encontraron canciones válidas de iReal Pro en los ${result.assets.length} archivos seleccionados.`
        );
        setLoadingFile(false);
        return;
      }

      // If multiple songs found (from a playlist file or multiple selected files)
      if (allExtractedSongs.length > 1) {
        setPlaylistSongs(allExtractedSongs);
        setLoadingFile(false);
        return;
      }

      // Single song: load immediately
      const songAST = parseIRealSong(allExtractedSongs[0]);
      onSongLoaded(songAST, firstSingleFileContent || buildStandaloneContent(allExtractedSongs[0]));
      handleClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al leer los archivos del dispositivo.'
      );
    } finally {
      setLoadingFile(false);
    }
  };

  // Import from manually pasted text
  const handleImportText = () => {
    setError(null);
    if (!inputText.trim()) {
      setError('Por favor pega un enlace irealb:// o el código HTML de iReal Pro.');
      return;
    }

    try {
      setRawSourceContent(inputText);
      const songs = extractIRealSongs(inputText);
      if (songs.length === 0) {
        setError('No se pudo detectar ninguna canción válida en el formato de iReal Pro.');
        return;
      }

      if (songs.length > 1) {
        setPlaylistSongs(songs);
        return;
      }

      const songAST = parseIRealSong(songs[0]);
      onSongLoaded(songAST, inputText);
      handleClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error inesperado al procesar la canción.'
      );
    }
  };

  // Select a single song from multi-song file/playlist
  const handleSelectPlaylistSong = (songData: ParsedIRealUrlResult) => {
    const songAST = parseIRealSong(songData);
    const standaloneHtml = buildStandaloneContent(songData);
    onSongLoaded(songAST, standaloneHtml);
    handleClose();
  };

  // Import all songs from multi-song file/playlist at once
  const handleImportAllPlaylistSongs = () => {
    if (playlistSongs.length === 0) return;
    const items = playlistSongs.map((songData) => ({
      song: parseIRealSong(songData),
      rawContent: buildStandaloneContent(songData),
    }));

    if (onMultipleSongsLoaded) {
      onMultipleSongsLoaded(items);
    } else {
      onSongLoaded(items[0].song, items[0].rawContent);
    }
    handleClose();
  };

  const handleLoadSample = () => {
    setInputText(DEFAULT_IREAL_HTML);
    setRawSourceContent(DEFAULT_IREAL_HTML);
    setError(null);
    setPlaylistSongs([]);
  };

  const isDark = theme.mode === 'dark';
  const cardBg = isDark ? '#243442' : '#ffffff';
  const inputBg = isDark ? '#1b2730' : '#f8fafc';
  const inputBorder = isDark ? '#374b5c' : '#cbd5e1';
  const dividerColor = isDark ? '#334454' : '#e2e8f0';
  const descColor = isDark ? '#cbd5e1' : '#475569';
  const sampleBtnBg = isDark ? '#1e2c37' : '#f1f5f9';
  const sampleBtnBorder = isDark ? '#3b5166' : '#cbd5e1';
  const playlistItemBg = isDark ? '#1b2730' : '#f8fafc';
  const playlistItemBorder = isDark ? '#334454' : '#e2e8f0';
  const keyBadgeBg = isDark ? '#243442' : '#f1f5f9';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: theme.modalBorder }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.topBarBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Importar Canción</Text>
            <TouchableOpacity
              style={[styles.headerCloseBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={handleClose}
              hitSlop={10}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* If a multi-song playlist was selected, show song selector */}
          {playlistSongs.length > 0 ? (
            <View style={styles.playlistSection}>
              <Text style={[styles.playlistTitle, { color: theme.textPrimary }]}>
                Se encontraron {playlistSongs.length} canciones:
              </Text>
              <Text style={[styles.playlistSubtitle, { color: descColor }]}>
                Elige una canción para abrirla o importa todas a tu repertorio permanente:
              </Text>

              {/* Import all songs button */}
              <TouchableOpacity
                style={styles.importAllBtn}
                onPress={handleImportAllPlaylistSongs}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Feather name="download" size={15} color="#ffffff" />
                  <Text style={styles.importAllBtnText}>
                    Importar Todas ({playlistSongs.length}) al Repertorio
                  </Text>
                </View>
              </TouchableOpacity>
              <FlatList
                style={styles.playlistList}
                data={playlistSongs}
                keyExtractor={(s, idx) => `${s.title}-${idx}`}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={7}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: s }) => (
                  <TouchableOpacity
                    style={[
                      styles.playlistItem,
                      {
                        backgroundColor: playlistItemBg,
                        borderColor: playlistItemBorder,
                      },
                    ]}
                    onPress={() => handleSelectPlaylistSong(s)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playlistItemText}>
                      <Text style={[styles.playlistSongTitle, { color: theme.textPrimary }]}>
                        {s.title}
                      </Text>
                      <Text style={[styles.playlistSongComposer, { color: theme.textSecondary }]}>
                        {s.composer} • {s.style}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.playlistKeyBadge,
                        {
                          backgroundColor: keyBadgeBg,
                          borderColor: theme.timeSigBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.playlistKeyText, { color: theme.timeSigText }]}>
                        {s.key}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setPlaylistSongs([])}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Feather name="chevron-left" size={16} color={isDark ? '#4daafc' : '#0284c7'} />
                  <Text style={[styles.backBtnText, { color: isDark ? '#4daafc' : '#0284c7' }]}>
                    Volver a opciones
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* File Picker Action Button */}
              <TouchableOpacity
                style={styles.filePickerBtn}
                onPress={handlePickFile}
                disabled={loadingFile}
                activeOpacity={0.8}
              >
                {loadingFile ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Feather name="folder" size={24} color="#ffffff" style={{ marginRight: 12 }} />
                    <View style={styles.filePickerTextCol}>
                      <Text style={styles.filePickerTitle}>
                        Abrir archivo(s) (.html)
                      </Text>
                      <Text style={styles.filePickerSub}>
                        Selecciona uno o varios archivos a la vez en tu dispositivo
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
                <Text style={[styles.dividerText, { color: theme.textSecondary }]}>o pega el código / enlace</Text>
                <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
              </View>

              <Text style={[styles.instructions, { color: descColor }]}>
                Pega el enlace con esquema <Text style={[styles.boldCode, { color: isDark ? '#4daafc' : '#0284c7' }]}>irealb://</Text> o el contenido completo del archivo <Text style={[styles.boldCode, { color: isDark ? '#4daafc' : '#0284c7' }]}>.html</Text>:
              </Text>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: theme.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={5}
                placeholder="Pega aquí el enlace irealb:// o el código HTML..."
                placeholderTextColor={theme.textSecondary}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (error) setError(null);
                }}
              />

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[
                    styles.sampleBtn,
                    {
                      backgroundColor: sampleBtnBg,
                      borderColor: sampleBtnBorder,
                    },
                  ]}
                  onPress={handleLoadSample}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="clipboard" size={13} color={isDark ? '#4daafc' : '#0284c7'} />
                    <Text style={[styles.sampleBtnText, { color: isDark ? '#4daafc' : '#0284c7' }]}>
                      Pegar Ejemplo
                    </Text>
                  </View>
                </TouchableOpacity>

                {inputText.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setInputText('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#0284c7' }]}
                  onPress={handleImportText}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>Cargar Texto</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    width: '100%',
    maxWidth: 580,
    maxHeight: '85%',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  filePickerBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 14,
  },
  filePickerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  filePickerTextCol: {
    flex: 1,
  },
  filePickerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  filePickerSub: {
    color: '#e0f2fe',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  instructions: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  boldCode: {
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sampleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  sampleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearBtnText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  playlistSection: {
    maxHeight: 380,
  },
  playlistTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  playlistSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  importAllBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  importAllBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  playlistList: {
    maxHeight: 280,
  },
  playlistItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playlistItemText: {
    flex: 1,
    marginRight: 8,
  },
  playlistSongTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  playlistSongComposer: {
    fontSize: 12,
    marginTop: 2,
  },
  playlistKeyBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playlistKeyText: {
    fontSize: 13,
    fontWeight: '900',
  },
  backBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
