import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  BackHandler,
  AppState,
  ToastAndroid,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as FileSystem from 'expo-file-system/legacy';
import { extractIRealSongs } from './src/core/deobfuscator';
import { parseIRealSong } from './src/core/parser';
import { transposeSong } from './src/core/transposer';
import { exportAndShareSongHtml } from './src/utils/fileExporter';
import { DEFAULT_IREAL_HTML } from './src/samples/defaultSong';
import { TopBar } from './src/components/TopBar';
import { LeadSheetGrid } from './src/components/LeadSheetGrid';
import { MetronomeBar } from './src/components/MetronomeBar';
import { SheetSettingsModal } from './src/components/SheetSettingsModal';
import { ImportModal } from './src/components/ImportModal';
import { PlaylistsModal } from './src/components/PlaylistsModal';
import { useMetronome } from './src/hooks/useMetronome';
import {
  PlaylistStorage,
  type SavedSong,
  type Playlist,
} from './src/storage/playlistStorage';
import { darkTheme, lightTheme, type ThemeMode } from './src/theme/theme';
import type { SongAST } from './src/types/ireal';

const EMPTY_SONG: SongAST = {
  title: 'Sin Canciones',
  composer: 'Importa tu primera canción',
  style: 'Lead Sheet',
  originalKey: 'C',
  currentKey: 'C',
  transposeAmount: 0,
  timeSignature: '4/4',
  sections: [],
  rows: [],
  totalBars: 0,
  rawDeobfuscated: '',
};

export default function App() {
  // Theme state (Dark mode default, persisted)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Font scale modifier (persisted)
  const [fontScale, setFontScale] = useState<number>(1.0);

  // Keep screen awake for live gig/rehearsal (persisted)
  const [keepScreenAwake, setKeepScreenAwake] = useState<boolean>(true);

  // Full-screen / immersive mode
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Metronome bar visibility
  const [showMetronome, setShowMetronome] = useState<boolean>(true);

  // Active playlist context for Prev/Next navigation
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Initialize with the sample song
  const initialBaseSong = useMemo(() => {
    const parsedContainers = extractIRealSongs(DEFAULT_IREAL_HTML);
    return parsedContainers.length > 0 ? parseIRealSong(parsedContainers[0]) : EMPTY_SONG;
  }, []);

  const [baseSong, setBaseSong] = useState<SongAST>(initialBaseSong);
  const [currentSong, setCurrentSong] = useState<SongAST>(initialBaseSong);

  // Metronome hook (with Tap Tempo support)
  const metronome = useMetronome({
    initialBpm: currentSong.tempo || 115,
    timeSignature: currentSong.timeSignature || '4/4',
    songKey: `${currentSong.title}-${currentSong.composer}`,
  });

  // Modals state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [playlistsModalVisible, setPlaylistsModalVisible] = useState(false);

  // Playlists and Library data
  const [librarySongs, setLibrarySongs] = useState<SavedSong[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Load theme, font scale, keep awake, library, and active song on mount
  const refreshStorageData = useCallback(async () => {
    const [
      storedSongs,
      storedPlaylists,
      storedTheme,
      storedFontScale,
      storedKeepAwake,
      storedActiveId,
      transpositions,
    ] = await Promise.all([
      PlaylistStorage.getSongs(),
      PlaylistStorage.getPlaylists(),
      PlaylistStorage.getThemeMode(),
      PlaylistStorage.getFontScale(),
      PlaylistStorage.getKeepAwake(),
      PlaylistStorage.getActiveSongId(),
      PlaylistStorage.getTranspositions(),
    ]);

    setLibrarySongs(storedSongs);
    setPlaylists(storedPlaylists);
    setThemeMode(storedTheme);
    setFontScale(storedFontScale);
    setKeepScreenAwake(storedKeepAwake);

    if (storedSongs.length > 0) {
      const active =
        (storedActiveId ? storedSongs.find((s) => s.id === storedActiveId) : null) ||
        storedSongs[0];
      if (active) {
        const parsedContainers = extractIRealSongs(active.rawInput);
        if (parsedContainers.length > 0) {
          const parsed = parseIRealSong(parsedContainers[0]);
          setBaseSong(parsed);
          const savedOffset = transpositions[active.id] || 0;
          if (savedOffset !== 0) {
            setCurrentSong(transposeSong(parsed, savedOffset));
          } else {
            setCurrentSong(parsed);
          }
          if (active.id !== storedActiveId) {
            await PlaylistStorage.setActiveSongId(active.id);
          }
        }
      }
    } else {
      setBaseSong(EMPTY_SONG);
      setCurrentSong(EMPTY_SONG);
    }
  }, []);

  useEffect(() => {
    refreshStorageData();
  }, [refreshStorageData]);

  // Manage keep-awake lifecycle
  useEffect(() => {
    const tag = 'ireal-live-sheet';
    if (keepScreenAwake) {
      activateKeepAwakeAsync(tag).catch(() => {});
    } else {
      deactivateKeepAwake(tag).catch(() => {});
    }
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [keepScreenAwake]);

  // Toggle keep-awake
  const handleToggleKeepAwake = async () => {
    const nextVal = !keepScreenAwake;
    setKeepScreenAwake(nextVal);
    await PlaylistStorage.setKeepAwake(nextVal);
  };

  // Toggle theme mode (dark <-> light)
  const handleToggleTheme = async () => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    await PlaylistStorage.setThemeMode(nextMode);
  };

  // Change font scale directly
  const handleSetFontScale = async (scale: number) => {
    setFontScale(scale);
    await PlaylistStorage.setFontScale(scale);
  };

  // Helper to load song with user's saved transposition
  const loadSongWithPersistedKey = useCallback(
    async (parsedSong: SongAST, songId: string) => {
      setBaseSong(parsedSong);
      const transpositions = await PlaylistStorage.getTranspositions();
      const savedOffset = transpositions[songId] || 0;
      if (savedOffset !== 0) {
        setCurrentSong(transposeSong(parsedSong, savedOffset));
      } else {
        setCurrentSong(parsedSong);
      }
    },
    []
  );

  // Transpose step (+1 or -1 semitone) and persist for this song
  const handleTransposeStep = async (step: number) => {
    let nextAmount = currentSong.transposeAmount + step;
    if (nextAmount > 11) nextAmount -= 12;
    if (nextAmount < -11) nextAmount += 12;

    const transposed = transposeSong(baseSong, nextAmount);
    setCurrentSong(transposed);

    const activeSaved = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
    );
    if (activeSaved) {
      await PlaylistStorage.saveSongTransposition(activeSaved.id, nextAmount);
    }
  };

  // Direct key selection (e.g. C, Db, D, Eb...) and persist
  const handleSelectKey = async (targetKey: string) => {
    const transposed = transposeSong(baseSong, targetKey);
    setCurrentSong(transposed);

    const activeSaved = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
    );
    if (activeSaved) {
      await PlaylistStorage.saveSongTransposition(activeSaved.id, transposed.transposeAmount);
    }
  };

  // Reset to original key and persist
  const handleReset = async () => {
    setCurrentSong(baseSong);

    const activeSaved = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
    );
    if (activeSaved) {
      await PlaylistStorage.saveSongTransposition(activeSaved.id, 0);
    }
  };

  // Load newly imported single song and automatically fix in persistent memory
  const handleSongLoaded = async (newSong: SongAST, rawContent: string) => {
    setBaseSong(newSong);
    setCurrentSong(newSong);

    const saved = await PlaylistStorage.saveSong({
      title: newSong.title,
      composer: newSong.composer,
      key: newSong.originalKey,
      style: newSong.style,
      tempo: newSong.tempo,
      rawInput: rawContent,
    });
    await PlaylistStorage.setActiveSongId(saved.id);
    await refreshStorageData();
  };

  // Load batch of imported songs and fix all permanently in memory
  const handleMultipleSongsLoaded = async (
    items: Array<{ song: SongAST; rawContent: string }>
  ) => {
    if (items.length === 0) return;
    const toSave = items.map((it) => ({
      title: it.song.title,
      composer: it.song.composer,
      key: it.song.originalKey,
      style: it.song.style,
      tempo: it.song.tempo,
      rawInput: it.rawContent,
    }));

    const savedList = await PlaylistStorage.saveMultipleSongs(toSave);
    if (savedList.length > 0) {
      setBaseSong(items[0].song);
      setCurrentSong(items[0].song);
      await PlaylistStorage.setActiveSongId(savedList[0].id);
    }
    await refreshStorageData();
  };

  // Handle opening song from external .html file or irealb:// link (Android Intent / Deep Link)
  const handleOpenIncomingUri = useCallback(
    async (uri: string) => {
      try {
        if (!uri) return;

        // Ignore internal Expo development server and localhost URLs
        if (
          uri.startsWith('exp://') ||
          uri.startsWith('exps://') ||
          uri.includes('localhost') ||
          uri.includes('127.0.0.1')
        ) {
          return;
        }

        let rawContent = '';

        if (uri.startsWith('irealb://') || uri.startsWith('irealbook://')) {
          rawContent = uri;
        } else if (Platform.OS !== 'web' && (uri.startsWith('content://') || uri.startsWith('file://'))) {
          try {
            rawContent = await FileSystem.readAsStringAsync(uri);
          } catch {
            const res = await fetch(uri);
            rawContent = await res.text();
          }
        } else if (
          (uri.startsWith('http://') || uri.startsWith('https://')) &&
          (uri.includes('.html') || uri.includes('irealb'))
        ) {
          const res = await fetch(uri);
          rawContent = await res.text();
        } else {
          // Unsupported or unknown scheme, ignore safely
          return;
        }

        if (!rawContent || !rawContent.trim()) return;

        const extracted = extractIRealSongs(rawContent);
        if (extracted.length === 0) return;

        if (extracted.length === 1) {
          const parsed = parseIRealSong(extracted[0]);
          await handleSongLoaded(parsed, rawContent);
          Alert.alert('Canción importada', `"${parsed.title}" se ha abierto y añadido a tu biblioteca.`);
        } else {
          const items = extracted.map((ex) => ({
            song: parseIRealSong(ex),
            rawContent,
          }));
          await handleMultipleSongsLoaded(items);
          Alert.alert('Lista importada', `Se han añadido ${items.length} canciones a tu biblioteca.`);
        }
      } catch (err) {
        console.warn('Error al abrir archivo externo:', err);
      }
    },
    [handleSongLoaded, handleMultipleSongsLoaded]
  );

  // Listen for incoming files and links from Android Intents and deep links
  useEffect(() => {
    let isMounted = true;

    // On Web, Linking.getInitialURL() returns the current browser URL (e.g. http://localhost:8081).
    // Do not attempt to process it as an incoming music file unless it contains an iReal scheme.
    Linking.getInitialURL()
      .then((url) => {
        if (isMounted && url) {
          if (Platform.OS === 'web' && !url.includes('irealb://') && !url.includes('irealbook://')) {
            return;
          }
          handleOpenIncomingUri(url);
        }
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        if (Platform.OS === 'web' && !url.includes('irealb://') && !url.includes('irealbook://')) {
          return;
        }
        handleOpenIncomingUri(url);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleOpenIncomingUri]);

  // Pause metronome when app goes into background/lock screen to save battery
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState.match(/inactive|background/) && metronome.isPlaying) {
        metronome.stop();
      }
    });
    return () => sub.remove();
  }, [metronome.isPlaying, metronome.stop]);

  const lastBackPressRef = useRef(0);

  // Handle hardware Back button on Android (exit modals, exit full screen, or confirm exit)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (settingsModalVisible) {
        setSettingsModalVisible(false);
        return true;
      }
      if (playlistsModalVisible) {
        setPlaylistsModalVisible(false);
        return true;
      }
      if (importModalVisible) {
        setImportModalVisible(false);
        return true;
      }
      if (isFullScreen) {
        setIsFullScreen(false);
        return true;
      }

      // If on main screen, double-tap back within 2 seconds to exit app
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // let Android exit
      }
      lastBackPressRef.current = now;
      ToastAndroid.show('Presiona atrás de nuevo para salir', ToastAndroid.SHORT);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [settingsModalVisible, playlistsModalVisible, importModalVisible, isFullScreen]);

  // Load song chosen from library or playlist and update active song in memory
  const handleSelectSongFromList = async (chosenSong: SongAST, playlistId?: string) => {
    if (playlistId !== undefined) {
      setActivePlaylistId(playlistId);
    }
    const matching = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === chosenSong.title.toLowerCase().trim()
    );
    if (matching) {
      await PlaylistStorage.setActiveSongId(matching.id);
      await loadSongWithPersistedKey(chosenSong, matching.id);
    } else {
      setBaseSong(chosenSong);
      setCurrentSong(chosenSong);
    }
  };

  // Delete song from library and update active view if the deleted song was on screen
  const handleDeleteSong = async (songId: string) => {
    const isCurrentDeleted =
      librarySongs.find((s) => s.id === songId)?.title.toLowerCase().trim() ===
      currentSong.title.toLowerCase().trim();

    await PlaylistStorage.deleteSong(songId);
    const updatedSongs = await PlaylistStorage.getSongs();
    setLibrarySongs(updatedSongs);

    if (isCurrentDeleted) {
      if (updatedSongs.length > 0) {
        const nextTarget = updatedSongs[0];
        const parsedContainers = extractIRealSongs(nextTarget.rawInput);
        if (parsedContainers.length > 0) {
          const parsed = parseIRealSong(parsedContainers[0]);
          setBaseSong(parsed);
          setCurrentSong(parsed);
          await PlaylistStorage.setActiveSongId(nextTarget.id);
        }
      } else {
        setBaseSong(EMPTY_SONG);
        setCurrentSong(EMPTY_SONG);
      }
    }
    await refreshStorageData();
  };

  // Delete current active song
  const handleDeleteCurrentSong = async () => {
    const currentSaved = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === currentSong.title.toLowerCase().trim()
    );
    if (currentSaved) {
      await handleDeleteSong(currentSaved.id);
    }
  };

  // Active navigation song list (current setlist or all library songs)
  const activeNavigationList = useMemo(() => {
    if (activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        const setSongs = librarySongs.filter((s) => pl.songIds.includes(s.id));
        if (setSongs.length > 0) return setSongs;
      }
    }
    return librarySongs;
  }, [activePlaylistId, playlists, librarySongs]);

  const currentSongIndex = useMemo(() => {
    return activeNavigationList.findIndex(
      (s) => s.title.trim().toLowerCase() === currentSong.title.trim().toLowerCase()
    );
  }, [activeNavigationList, currentSong.title]);

  const hasPrevSong = currentSongIndex > 0;
  const hasNextSong =
    currentSongIndex >= 0 && currentSongIndex < activeNavigationList.length - 1;

  // Jump to previous song in setlist
  const handlePrevSong = async () => {
    if (hasPrevSong) {
      const target = activeNavigationList[currentSongIndex - 1];
      const parsedContainers = extractIRealSongs(target.rawInput);
      if (parsedContainers.length > 0) {
        const parsed = parseIRealSong(parsedContainers[0]);
        await PlaylistStorage.setActiveSongId(target.id);
        await loadSongWithPersistedKey(parsed, target.id);
      }
    }
  };

  // Jump to next song in setlist
  const handleNextSong = async () => {
    if (hasNextSong) {
      const target = activeNavigationList[currentSongIndex + 1];
      const parsedContainers = extractIRealSongs(target.rawInput);
      if (parsedContainers.length > 0) {
        const parsed = parseIRealSong(parsedContainers[0]);
        await PlaylistStorage.setActiveSongId(target.id);
        await loadSongWithPersistedKey(parsed, target.id);
      }
    }
  };

  // Export and share song as genuine .html file via native share sheet (WhatsApp, Files, Telegram)
  const handleShareSong = async () => {
    try {
      const currentSaved = librarySongs.find(
        (s) => s.title.toLowerCase() === currentSong.title.toLowerCase()
      );
      const rawFallback = currentSaved?.rawInput || DEFAULT_IREAL_HTML;
      await exportAndShareSongHtml(
        currentSong.title,
        currentSong.composer,
        rawFallback,
        currentSong.currentKey
      );
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: isFullScreen ? theme.background : theme.topBarBackground },
        ]}
        edges={isFullScreen ? [] : ['top', 'left', 'right', 'bottom']}
      >
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} hidden={isFullScreen} />
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Top Bar (Hidden in Full-Screen Mode) */}
          {!isFullScreen && (
            <TopBar
              song={currentSong}
              originalKey={baseSong.originalKey}
              theme={theme}
              hasPrevSong={hasPrevSong}
              hasNextSong={hasNextSong}
              onTransposeStep={handleTransposeStep}
              onOpenSettings={() => setSettingsModalVisible(true)}
              onOpenPlaylists={() => setPlaylistsModalVisible(true)}
              onPrevSong={handlePrevSong}
              onNextSong={handleNextSong}
              onToggleFullScreen={() => setIsFullScreen(true)}
            />
          )}

          {/* Authentic Lead Sheet Grid */}
          <LeadSheetGrid
            song={currentSong}
            theme={theme}
            fontScale={fontScale}
          />

          {/* Bottom Metronome Player Bar (Hidden in Full-Screen Mode) */}
          {!isFullScreen && showMetronome && (
            <MetronomeBar
              isPlaying={metronome.isPlaying}
              bpm={metronome.bpm}
              currentBeat={metronome.currentBeat}
              beatsPerMeasure={metronome.beatsPerMeasure}
              currentKey={currentSong.currentKey}
              timeSignature={currentSong.timeSignature}
              theme={theme}
              onTogglePlay={metronome.toggle}
              onStepBpm={metronome.stepBpm}
              onTapTempo={metronome.tapTempo}
            />
          )}

          {/* Floating Exit Button for Full-Screen Mode */}
          {isFullScreen && (
            <TouchableOpacity
              style={[
                styles.floatingExitBtn,
                {
                  backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                  borderColor: theme.gridBorder,
                },
              ]}
              onPress={() => setIsFullScreen(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.floatingExitText, { color: theme.textPrimary }]}>
                ✕ Salir Pantalla Completa
              </Text>
            </TouchableOpacity>
          )}

          {/* Unified Controls & Settings Menu Modal */}
          <SheetSettingsModal
            visible={settingsModalVisible}
            onClose={() => setSettingsModalVisible(false)}
            song={currentSong}
            originalKey={baseSong.originalKey}
            fontScale={fontScale}
            theme={theme}
            themeMode={themeMode}
            showMetronome={showMetronome}
            keepScreenAwake={keepScreenAwake}
            onSelectKey={handleSelectKey}
            onTransposeStep={handleTransposeStep}
            onResetKey={handleReset}
            onSetFontScale={handleSetFontScale}
            onToggleTheme={handleToggleTheme}
            onToggleMetronome={() => setShowMetronome(!showMetronome)}
            onToggleKeepAwake={handleToggleKeepAwake}
            onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
            onShareSong={handleShareSong}
            onOpenPlaylists={() => setPlaylistsModalVisible(true)}
            onOpenImport={() => setImportModalVisible(true)}
            onDeleteCurrentSong={
              currentSong.title !== 'Sin Canciones' ? handleDeleteCurrentSong : undefined
            }
          />

          {/* Import Modal */}
          <ImportModal
            visible={importModalVisible}
            theme={theme}
            onClose={() => setImportModalVisible(false)}
            onSongLoaded={handleSongLoaded}
            onMultipleSongsLoaded={handleMultipleSongsLoaded}
          />

          {/* Playlists and Song Library Manager */}
          <PlaylistsModal
            visible={playlistsModalVisible}
            theme={theme}
            onClose={() => setPlaylistsModalVisible(false)}
            onSelectSong={handleSelectSongFromList}
            playlists={playlists}
            songs={librarySongs}
            onRefreshData={refreshStorageData}
            onDeleteSong={handleDeleteSong}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  floatingExitBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 99,
  },
  floatingExitText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
