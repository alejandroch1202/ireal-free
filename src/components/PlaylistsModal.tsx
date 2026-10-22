import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PlaylistStorage, type SavedSong, type Playlist } from '../storage/playlistStorage';
import { extractIRealSongs } from '../core/deobfuscator';
import { parseIRealSong } from '../core/parser';
import { exportAndShareSongHtml } from '../utils/fileExporter';
import { AboutModal } from './AboutModal';
import type { SongAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface PlaylistsModalProps {
  visible?: boolean;
  isFullScreenView?: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onSelectSong: (song: SongAST, playlistId?: string) => void;
  playlists: Playlist[];
  songs: SavedSong[];
  onRefreshData: () => Promise<void>;
  onDeleteSong?: (songId: string) => Promise<void>;
  activeSongTitle?: string;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onReturnToSheet?: () => void;
}

export const PlaylistsModal: React.FC<PlaylistsModalProps> = ({
  visible,
  isFullScreenView = false,
  theme,
  onClose,
  onSelectSong,
  playlists,
  songs,
  onRefreshData,
  onDeleteSong,
  activeSongTitle,
  onOpenImport,
  onOpenSettings,
  onReturnToSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'songs'>('songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  // New playlist creation input state
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add song to playlist sub-modal/sheet state
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<SavedSong | null>(null);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  // Load a song from storage into the app
  const handleLoadSavedSong = (savedSong: SavedSong) => {
    try {
      const extracted = extractIRealSongs(savedSong.rawInput);
      if (extracted.length > 0) {
        const songAST = parseIRealSong(extracted[0]);
        onSelectSong(songAST, selectedPlaylistId || undefined);
        onClose();
      }
    } catch {
      // ignore
    }
  };

  // Export a song as .html file
  const handleExportSong = async (song: SavedSong) => {
    try {
      await exportAndShareSongHtml(song.title, song.composer, song.rawInput, song.key);
    } catch {
      // ignore
    }
  };

  // Create playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await PlaylistStorage.createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    await onRefreshData();
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    await PlaylistStorage.deletePlaylist(playlistId);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
    await onRefreshData();
  };

  // Remove song from playlist
  const handleRemoveFromPlaylist = async (playlistId: string, songId: string) => {
    await PlaylistStorage.removeSongFromPlaylist(playlistId, songId);
    await onRefreshData();
  };

  // Delete song from entire library with confirmation
  const handleConfirmDeleteSong = (song: SavedSong) => {
    const doDelete = async () => {
      if (onDeleteSong) {
        await onDeleteSong(song.id);
      } else {
        await PlaylistStorage.deleteSong(song.id);
        await onRefreshData();
      }
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `¿Estás seguro de que deseas eliminar permanentemente "${song.title}" de tu biblioteca?`
        )
      ) {
        doDelete();
      }
    } else {
      Alert.alert(
        '¿Eliminar canción?',
        `¿Estás seguro de que deseas eliminar permanentemente "${song.title}" de tu biblioteca?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: doDelete,
          },
        ]
      );
    }
  };

  // Add song to selected playlist
  const handleAddSongToTargetPlaylist = async (playlistId: string) => {
    if (!songToAddToPlaylist) return;
    await PlaylistStorage.addSongToPlaylist(playlistId, songToAddToPlaylist.id);
    setSongToAddToPlaylist(null);
    await onRefreshData();
  };

  // Filter songs by search query
  const filteredSongs = songs.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.composer.toLowerCase().includes(q);
  });

  const modalBody = (
    <View
      style={[
        isFullScreenView ? styles.fullScreenCard : styles.modalCard,
        {
          backgroundColor: isFullScreenView ? theme.background : theme.modalCard,
          borderColor: isFullScreenView ? 'transparent' : theme.modalBorder,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: theme.topBarBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {selectedPlaylistId && (
            <TouchableOpacity
              style={[styles.backToPlaylistsBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={() => setSelectedPlaylistId(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.backToPlaylistsText, { color: theme.textPrimary }]}>‹ Listas</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {selectedPlaylist ? selectedPlaylist.name : 'Repertorio'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isFullScreenView && onOpenImport && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onOpenImport}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Feather name="plus" size={15} color={theme.textPrimary} />
              <Text style={[styles.headerActionText, { color: theme.textPrimary }]}>Importar</Text>
            </TouchableOpacity>
          )}

          {isFullScreenView && onOpenSettings && (
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onOpenSettings}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityLabel="Ajustes"
            >
              <Feather name="settings" size={17} color={theme.textPrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
            onPress={() => setShowAbout(true)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            activeOpacity={0.7}
            accessibilityLabel="Acerca de"
          >
            <Feather name="info" size={17} color={theme.textPrimary} />
          </TouchableOpacity>

          {!isFullScreenView && (
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onClose}
              hitSlop={12}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

          {/* Sub-dialog: Add Song to Playlist */}
          {songToAddToPlaylist ? (
            <View style={styles.subModalContainer}>
              <Text style={[styles.subModalTitle, { color: theme.textPrimary }]}>
                Agregar "{songToAddToPlaylist.title}" a:
              </Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {playlists.map((pl) => {
                  const alreadyIn = pl.songIds.includes(songToAddToPlaylist.id);
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={[
                        styles.playlistSelectItem,
                        { backgroundColor: theme.cardBackground, borderColor: theme.rowBorder },
                      ]}
                      onPress={() => handleAddSongToTargetPlaylist(pl.id)}
                      disabled={alreadyIn}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.playlistSelectName, { color: theme.textPrimary }]}>
                        {pl.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather
                          name={alreadyIn ? 'check' : 'plus'}
                          size={13}
                          color={alreadyIn ? theme.textSecondary : theme.activeKeyBg}
                        />
                        <Text
                          style={[
                            styles.playlistSelectStatus,
                            { color: alreadyIn ? theme.textSecondary : theme.activeKeyBg },
                          ]}
                        >
                          {alreadyIn ? 'Ya agregada' : 'Agregar'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.cancelSubBtn, { borderColor: theme.btnBorder }]}
                onPress={() => setSongToAddToPlaylist(null)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : selectedPlaylist ? (
            /* Detailed Playlist View */
            <View style={styles.tabContent}>
              <View style={styles.playlistActionHeader}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setSelectedPlaylistId(null)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="chevron-left" size={16} color={theme.activeKeyBg} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: theme.activeKeyBg }]}>
                      Todas las Listas
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deletePlBtn}
                  onPress={() => handleDeletePlaylist(selectedPlaylist.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="trash-2" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.deletePlText}>Eliminar Lista</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
                {selectedPlaylist.songIds.length} canciones en esta lista:
              </Text>

              {selectedPlaylist.songIds.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Esta lista está vacía. Ve a la pestaña "Canciones" para agregar temas.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.scrollList}>
                  {selectedPlaylist.songIds.map((songId, index) => {
                    const song = songs.find((s) => s.id === songId);
                    if (!song) return null;

                    return (
                      <View
                        key={`${song.id}-${index}`}
                        style={[
                          styles.songRow,
                          { backgroundColor: theme.cardBackground, borderColor: theme.rowBorder },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.songRowContent}
                          onPress={() => handleLoadSavedSong(song)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.songIndex, { color: theme.textSecondary }]}>
                            {index + 1}.
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.songTitle, { color: theme.textPrimary }]}>
                              {song.title}
                            </Text>
                            <Text style={[styles.songMeta, { color: theme.textSecondary }]}>
                              {song.composer} • {song.style}
                            </Text>
                          </View>
                          <View style={[styles.keyBadge, { borderColor: theme.timeSigBorder, backgroundColor: theme.btnBg }]}>
                            <Text style={[styles.keyBadgeText, { color: theme.timeSigText }]} numberOfLines={1}>
                              {song.key}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rowActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                          onPress={() => handleExportSong(song)}
                          hitSlop={6}
                          activeOpacity={0.7}
                          accessibilityLabel="Exportar canción"
                        >
                          <Feather name="share-2" size={13} color={theme.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rowActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                          onPress={() => handleRemoveFromPlaylist(selectedPlaylist.id, song.id)}
                          hitSlop={6}
                          activeOpacity={0.7}
                          accessibilityLabel="Quitar de lista"
                        >
                          <Feather name="trash-2" size={13} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            /* Main Tabs View */
            <View style={styles.tabContent}>
              {/* Segmented Control */}
              <View style={[styles.tabBar, { backgroundColor: theme.cardBackground }]}>
                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'songs' && { backgroundColor: theme.activeKeyBg },
                  ]}
                  onPress={() => setActiveTab('songs')}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabItemInner}>
                    <Feather
                      name="music"
                      size={14}
                      color={
                        activeTab === 'songs'
                          ? theme.activeKeyText
                          : theme.textSecondary
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            activeTab === 'songs'
                              ? theme.activeKeyText
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      Canciones ({songs.length})
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'playlists' && { backgroundColor: theme.activeKeyBg },
                  ]}
                  onPress={() => setActiveTab('playlists')}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabItemInner}>
                    <Feather
                      name="list"
                      size={14}
                      color={
                        activeTab === 'playlists'
                          ? theme.activeKeyText
                          : theme.textSecondary
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            activeTab === 'playlists'
                              ? theme.activeKeyText
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      Listas ({playlists.length})
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {activeTab === 'playlists' ? (
                /* Tab 1: Playlists list */
                <View style={{ flex: 1 }}>
                  {isCreatingPlaylist ? (
                    <View style={styles.createPlRow}>
                      <TextInput
                        style={[
                          styles.createInput,
                          {
                            backgroundColor: theme.cardBackground,
                            color: theme.textPrimary,
                            borderColor: theme.btnBorder,
                          },
                        ]}
                        placeholder="Nombre de la nueva lista..."
                        placeholderTextColor={theme.textSecondary}
                        value={newPlaylistName}
                        onChangeText={setNewPlaylistName}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[styles.createConfirmBtn, { backgroundColor: theme.activeKeyBg }]}
                        onPress={handleCreatePlaylist}
                      >
                        <Text style={[styles.createConfirmText, { color: theme.activeKeyText }]}>
                          Guardar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.createCancelBtn}
                        onPress={() => setIsCreatingPlaylist(false)}
                        hitSlop={8}
                      >
                        <Feather name="x" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addPlaylistBtn, { borderColor: theme.activeKeyBg }]}
                      onPress={() => setIsCreatingPlaylist(true)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="plus" size={16} color={theme.activeKeyBg} style={{ marginRight: 6 }} />
                        <Text style={[styles.addPlaylistText, { color: theme.activeKeyBg }]}>
                          Crear Nueva Lista
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {playlists.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Feather name="list" size={38} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                        No hay listas creadas
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        Toca "Crear Nueva Lista" para agrupar canciones de tus conciertos o ensayos.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.scrollList}>
                      {playlists.map((pl) => (
                        <TouchableOpacity
                          key={pl.id}
                          style={[
                            styles.playlistCard,
                            {
                              backgroundColor: theme.cardBackground,
                              borderColor: theme.rowBorder,
                            },
                          ]}
                          onPress={() => setSelectedPlaylistId(pl.id)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.playlistCardName, { color: theme.textPrimary }]}>
                              {pl.name}
                            </Text>
                            <Text
                              style={[styles.playlistCardSub, { color: theme.textSecondary }]}
                            >
                              {pl.songIds.length} canciones
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ) : (
                /* Tab 2: All Songs Library */
                <View style={{ flex: 1 }}>
                  {/* Modern Search bar */}
                  <View
                    style={[
                      styles.searchContainer,
                      {
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.btnBorder,
                      },
                    ]}
                  >
                    <Feather name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.textPrimary }]}
                      placeholder="Buscar por título o compositor..."
                      placeholderTextColor={theme.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Feather name="x" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredSongs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Feather
                        name={searchQuery ? 'search' : 'music'}
                        size={38}
                        color={theme.textSecondary}
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                        {searchQuery ? 'Sin resultados' : 'Tu repertorio está vacío'}
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        {searchQuery
                          ? `No encontramos canciones con "${searchQuery}".`
                          : 'Toca "+ Importar" arriba para agregar archivos HTML o enlaces de canciones en formato iReal.'}
                      </Text>
                      {!searchQuery && onOpenImport && (
                        <TouchableOpacity
                          style={[styles.emptyImportBtn, { backgroundColor: theme.activeKeyBg || '#0284c7' }]}
                          onPress={onOpenImport}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="plus" size={15} color={theme.activeKeyText || '#ffffff'} style={{ marginRight: 6 }} />
                            <Text style={[styles.emptyImportBtnText, { color: theme.activeKeyText || '#ffffff' }]}>
                              Importar Canciones
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <ScrollView style={styles.scrollList}>
                      {filteredSongs.map((song) => (
                        <View
                          key={song.id}
                          style={[
                            styles.songRow,
                            {
                              backgroundColor: theme.cardBackground,
                              borderColor: theme.rowBorder,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.songRowContent}
                            onPress={() => handleLoadSavedSong(song)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.songTitle, { color: theme.textPrimary }]}>
                                {song.title}
                              </Text>
                              <Text style={[styles.songMeta, { color: theme.textSecondary }]}>
                                {song.composer} • {song.style}
                              </Text>
                            </View>
                            <View
                              style={[styles.keyBadge, { borderColor: theme.timeSigBorder, backgroundColor: theme.btnBg }]}
                            >
                              <Text
                                style={[styles.keyBadgeText, { color: theme.timeSigText }]}
                                numberOfLines={1}
                              >
                                {song.key}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* Export as .html */}
                          <TouchableOpacity
                            style={[styles.rowActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                            onPress={() => handleExportSong(song)}
                            hitSlop={6}
                            activeOpacity={0.7}
                            accessibilityLabel="Exportar canción"
                          >
                            <Feather name="share-2" size={13} color={theme.textPrimary} />
                          </TouchableOpacity>

                          {/* Add to Playlist button */}
                          <TouchableOpacity
                            style={[styles.rowActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                            onPress={() => setSongToAddToPlaylist(song)}
                            hitSlop={6}
                            activeOpacity={0.7}
                            accessibilityLabel="Agregar a lista"
                          >
                            <Feather name="folder-plus" size={13} color={theme.textPrimary} />
                          </TouchableOpacity>

                          {/* Delete from library */}
                          <TouchableOpacity
                            style={[styles.rowActionBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                            onPress={() => handleConfirmDeleteSong(song)}
                            hitSlop={6}
                            activeOpacity={0.7}
                            accessibilityLabel="Eliminar canción"
                          >
                            <Feather name="trash-2" size={13} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
  );

  if (isFullScreenView) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {modalBody}
        <AboutModal
          visible={showAbout}
          onClose={() => setShowAbout(false)}
          theme={theme}
        />
      </View>
    );
  }

  return (
    <Modal visible={Boolean(visible)} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        {modalBody}
      </KeyboardAvoidingView>

      {/* About Modal Dialog */}
      <AboutModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
        theme={theme}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    height: '82%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  fullScreenCard: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  backToPlaylistsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  backToPlaylistsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  returnToSheetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnToSheetText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerActionBtn: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  addPlaylistBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPlaylistText: {
    fontSize: 14,
    fontWeight: '800',
  },
  createPlRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
  },
  createConfirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  createConfirmText: {
    fontSize: 13,
    fontWeight: '800',
  },
  createCancelBtn: {
    padding: 8,
  },
  playlistCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playlistCardName: {
    fontSize: 15,
    fontWeight: '800',
  },
  playlistCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '700',
  },
  playlistActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  deletePlBtn: {
    paddingVertical: 4,
  },
  deletePlText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 280,
  },
  emptyImportBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyImportBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  songRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  songRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songIndex: {
    fontSize: 12,
    fontWeight: '700',
    width: 22,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  songMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  keyBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  keyBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subModalContainer: {
    flex: 1,
    paddingTop: 8,
  },
  subModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  playlistSelectItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playlistSelectName: {
    fontSize: 14,
    fontWeight: '800',
  },
  playlistSelectStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelSubBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
