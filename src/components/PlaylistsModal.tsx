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
import { PlaylistStorage, type SavedSong, type Playlist } from '../storage/playlistStorage';
import { extractIRealSongs } from '../core/deobfuscator';
import { parseIRealSong } from '../core/parser';
import { exportAndShareSongHtml } from '../utils/fileExporter';
import { AboutModal } from './AboutModal';
import type { SongAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface PlaylistsModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onSelectSong: (song: SongAST, playlistId?: string) => void;
  playlists: Playlist[];
  songs: SavedSong[];
  onRefreshData: () => Promise<void>;
  onDeleteSong?: (songId: string) => Promise<void>;
}

export const PlaylistsModal: React.FC<PlaylistsModalProps> = ({
  visible,
  theme,
  onClose,
  onSelectSong,
  playlists,
  songs,
  onRefreshData,
  onDeleteSong,
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'songs'>('playlists');
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.modalCard, borderColor: theme.modalBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.topBarBorder }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {selectedPlaylist ? selectedPlaylist.name : 'Listas y Repertorio'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity
                onPress={() => setShowAbout(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16 }}>ℹ️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
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
                      <Text
                        style={[
                          styles.playlistSelectStatus,
                          { color: alreadyIn ? theme.textSecondary : theme.activeKeyBg },
                        ]}
                      >
                        {alreadyIn ? '✓ Ya agregada' : '+ Agregar'}
                      </Text>
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
                  <Text style={[styles.backBtnText, { color: theme.activeKeyBg }]}>
                    ← Todas las Listas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deletePlBtn}
                  onPress={() => handleDeletePlaylist(selectedPlaylist.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deletePlText}>Eliminar Lista</Text>
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
                          <View style={[styles.keyBadge, { borderColor: theme.timeSigBorder }]}>
                            <Text style={[styles.keyBadgeText, { color: theme.timeSigText }]}>
                              {song.key}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.exportSongBtn}
                          onPress={() => handleExportSong(song)}
                          hitSlop={8}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.exportSongIcon}>📤</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeSongBtn}
                          onPress={() => handleRemoveFromPlaylist(selectedPlaylist.id, song.id)}
                          hitSlop={8}
                        >
                          <Text style={styles.removeSongText}>✕</Text>
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
                    activeTab === 'playlists' && { backgroundColor: theme.activeKeyBg },
                  ]}
                  onPress={() => setActiveTab('playlists')}
                >
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
                    📋 Listas ({playlists.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'songs' && { backgroundColor: theme.activeKeyBg },
                  ]}
                  onPress={() => setActiveTab('songs')}
                >
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
                    🎵 Canciones ({songs.length})
                  </Text>
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
                      >
                        <Text style={{ color: theme.textSecondary }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addPlaylistBtn, { borderColor: theme.activeKeyBg }]}
                      onPress={() => setIsCreatingPlaylist(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.addPlaylistText, { color: theme.activeKeyBg }]}>
                        + Crear Nueva Lista
                      </Text>
                    </TouchableOpacity>
                  )}

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
                        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                /* Tab 2: All Songs Library */
                <View style={{ flex: 1 }}>
                  {/* Search bar */}
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: theme.cardBackground,
                        color: theme.textPrimary,
                        borderColor: theme.btnBorder,
                      },
                    ]}
                    placeholder="🔍 Buscar por título o compositor..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />

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
                            style={[styles.keyBadge, { borderColor: theme.timeSigBorder }]}
                          >
                            <Text
                              style={[styles.keyBadgeText, { color: theme.timeSigText }]}
                            >
                              {song.key}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Export as .html */}
                        <TouchableOpacity
                          style={styles.exportSongBtn}
                          onPress={() => handleExportSong(song)}
                          hitSlop={8}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.exportSongIcon}>📤</Text>
                        </TouchableOpacity>

                        {/* Add to Playlist button */}
                        <TouchableOpacity
                          style={styles.addToListBtn}
                          onPress={() => setSongToAddToPlaylist(song)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.addToListText}>+ Lista</Text>
                        </TouchableOpacity>

                        {/* Delete from library */}
                        <TouchableOpacity
                          style={styles.deleteSongBtn}
                          onPress={() => handleConfirmDeleteSong(song)}
                          hitSlop={8}
                        >
                          <Text style={styles.deleteSongText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>
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
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  songRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  keyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  exportSongBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportSongIcon: {
    fontSize: 14,
  },
  addToListBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  addToListText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  removeSongBtn: {
    padding: 6,
  },
  removeSongText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteSongBtn: {
    padding: 6,
  },
  deleteSongText: {
    fontSize: 14,
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
