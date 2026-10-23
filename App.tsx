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
import * as SplashScreen from 'expo-splash-screen';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { extractIRealSongs } from './src/core/deobfuscator';
import { parseIRealSong } from './src/core/parser';
import { transposeSong, transposeChord, getKeyRoot } from './src/core/transposer';
import { exportAndShareSongHtml, exportAndShareLibraryHtml } from './src/utils/fileExporter';
import { serializeSongToIRealHtml } from './src/core/serializer';
import { buildIRealHtml } from './src/core/exporter';
import {
  insertBarsAround,
  appendBarsToSection,
  appendBarsToRow,
  deleteBar,
  addSection,
  duplicateSection,
  deleteSectionOrRow,
  renameSectionAtRow,
  updateBarInSong,
  buildTemplateChordProgression,
} from './src/core/songEditor';
import { HOSANNA_SAMPLE_HTML } from './src/samples/defaultSong';
import { TopBar } from './src/components/TopBar';
import { LeadSheetGrid } from './src/components/LeadSheetGrid';
import { MetronomeBar } from './src/components/MetronomeBar';
import { SheetSettingsModal } from './src/components/SheetSettingsModal';
import { ImportModal } from './src/components/ImportModal';
import { PlaylistsModal } from './src/components/PlaylistsModal';
import { EditSongModal } from './src/components/EditSongModal';
import { EditChordModal, type BarUpdatePayload } from './src/components/EditChordModal';
import { EditSectionModal } from './src/components/EditSectionModal';
import { EditAnnotationModal } from './src/components/EditAnnotationModal';
import { CreateSongModal } from './src/components/CreateSongModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useMetronome } from './src/hooks/useMetronome';
import {
  PlaylistStorage,
  type SavedSong,
  type Playlist,
} from './src/storage/playlistStorage';
import { darkTheme, lightTheme, type ThemeMode } from './src/theme/theme';
import type { SongAST, BarAST, ChordToken } from './src/types/ireal';

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

// Keep native splash screen visible until storage and theme are fully loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // Theme state (Light mode default, persisted)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Guards whether the initial storage load is complete.
  // Any incoming deep-link / file URI received before the app is ready is
  // queued here and processed immediately after initialization finishes.
  const [isAppReady, setIsAppReady] = useState(false);
  const pendingUriRef = useRef<string | null>(null);

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
  const [activeSongId, setActiveSongIdState] = useState<string | null>(null);

  // Initialize with empty song by default (no preloaded song)
  const [baseSong, setBaseSong] = useState<SongAST>(EMPTY_SONG);
  const [currentSong, setCurrentSong] = useState<SongAST>(EMPTY_SONG);

  // Edit history (Undo / Redo) for the currently open song
  const MAX_HISTORY_STEPS = 30;
  const [undoStack, setUndoStack] = useState<SongAST[]>([]);
  const [redoStack, setRedoStack] = useState<SongAST[]>([]);

  const clearEditHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Metronome hook (with Tap Tempo support)
  const metronome = useMetronome({
    initialBpm: currentSong.tempo || 115,
    timeSignature: currentSong.timeSignature || '4/4',
    songKey: `${currentSong.title}-${currentSong.composer}`,
  });

  // Navigation state (Home screen is 'library')
  const [currentScreen, setCurrentScreen] = useState<'library' | 'sheet'>('library');

  // Modals state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [playlistsModalVisible, setPlaylistsModalVisible] = useState(false);
  const [editSongModalVisible, setEditSongModalVisible] = useState(false);
  const [editChordModalVisible, setEditChordModalVisible] = useState(false);
  const [editingBar, setEditingBar] = useState<BarAST | null>(null);
  const [editingChordIndex, setEditingChordIndex] = useState<number>(0);
  const [editSectionModalVisible, setEditSectionModalVisible] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<'edit' | 'add'>('edit');
  const [editingSectionRowIndex, setEditingSectionRowIndex] = useState<number>(0);
  const [editingSectionLabel, setEditingSectionLabel] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [createSongModalVisible, setCreateSongModalVisible] = useState(false);
  const [editAnnotationModalVisible, setEditAnnotationModalVisible] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    text: string;
    bar?: BarAST;
    rowIndex?: number;
    isNew?: boolean;
  } | null>(null);

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
        setActiveSongIdState(active.id);
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
      setActiveSongIdState(null);
      setBaseSong(EMPTY_SONG);
      setCurrentSong(EMPTY_SONG);
    }
  }, []);

  useEffect(() => {
    refreshStorageData().finally(() => {
      setIsAppReady(true);
    });
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
      clearEditHistory();
      setActiveSongIdState(songId);
      setBaseSong(parsedSong);
      const transpositions = await PlaylistStorage.getTranspositions();
      const savedOffset = transpositions[songId] || 0;
      if (savedOffset !== 0) {
        setCurrentSong(transposeSong(parsedSong, savedOffset));
      } else {
        setCurrentSong(parsedSong);
      }
    },
    [clearEditHistory]
  );

  // Transpose step (+1 or -1 semitone) and persist for this song
  const handleTransposeStep = useCallback(
    async (step: number) => {
      let nextAmount = currentSong.transposeAmount + step;
      if (nextAmount > 11) nextAmount -= 12;
      if (nextAmount < -11) nextAmount += 12;

      const transposed = transposeSong(baseSong, nextAmount);
      setCurrentSong(transposed);

      const activeSaved =
        (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
        librarySongs.find(
          (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
        );
      if (activeSaved) {
        await PlaylistStorage.saveSongTransposition(activeSaved.id, nextAmount);
      }
    },
    [currentSong.transposeAmount, baseSong, activeSongId, librarySongs]
  );

  // Direct key selection (e.g. C, Db, D, Eb...) and persist
  const handleSelectKey = async (targetKey: string) => {
    const transposed = transposeSong(baseSong, targetKey);
    setCurrentSong(transposed);

    const activeSaved =
      (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
      librarySongs.find(
        (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
      );
    if (activeSaved) {
      await PlaylistStorage.saveSongTransposition(activeSaved.id, transposed.transposeAmount);
    }
  };

  // Reset to original key and persist
  const handleReset = async () => {
    setCurrentSong(baseSong);

    const activeSaved =
      (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
      librarySongs.find(
        (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
      );
    if (activeSaved) {
      await PlaylistStorage.saveSongTransposition(activeSaved.id, 0);
    }
  };

  // Load newly imported single song and automatically fix in persistent memory
  const handleSongLoaded = useCallback(
    async (newSong: SongAST, rawContent: string) => {
      clearEditHistory();
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
      setActiveSongIdState(saved.id);
      await PlaylistStorage.setActiveSongId(saved.id);
      await refreshStorageData();
      setCurrentScreen('sheet');
    },
    [clearEditHistory, refreshStorageData]
  );

  // Load batch of imported songs and fix all permanently in memory
  const handleMultipleSongsLoaded = useCallback(
    async (items: Array<{ song: SongAST; rawContent: string }>) => {
      if (items.length === 0) return;
      clearEditHistory();
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
        setActiveSongIdState(savedList[0].id);
        await PlaylistStorage.setActiveSongId(savedList[0].id);
      }
      await refreshStorageData();
      setCurrentScreen('sheet');
    },
    [clearEditHistory, refreshStorageData]
  );

  // Handle opening song from external .html file or irealb:// link (Android Intent / Deep Link)
  const processIncomingUri = useCallback(
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
          // Tier 1: Modern Expo File API (resolves all Android ContentResolver URIs via ContentProviderFile)
          try {
            const file = new File(uri);
            rawContent = await file.text();
          } catch (e1) {
            console.log('Tier 1 File.text() failed, trying tier 2:', e1);
          }

          // Tier 2: Copy content:// stream to local application cache, then read
          if (!rawContent || !rawContent.trim()) {
            try {
              const tempTarget = `${FileSystem.cacheDirectory || ''}incoming_import_${Date.now()}.html`;
              await FileSystem.copyAsync({ from: uri, to: tempTarget });
              rawContent = await FileSystem.readAsStringAsync(tempTarget);
              FileSystem.deleteAsync(tempTarget, { idempotent: true }).catch(() => {});
            } catch (e2) {
              console.log('Tier 2 copyAsync fallback failed, trying tier 3:', e2);
            }
          }

          // Tier 3: Direct FileSystem readAsStringAsync
          if (!rawContent || !rawContent.trim()) {
            try {
              rawContent = await FileSystem.readAsStringAsync(uri);
            } catch (e3) {
              console.log('Tier 3 readAsStringAsync failed, trying tier 4:', e3);
            }
          }

          // Tier 4: Decoded URI variant if URI was percent-encoded
          if (!rawContent || !rawContent.trim()) {
            try {
              const decoded = decodeURIComponent(uri);
              if (decoded !== uri) {
                const fileDecoded = new File(decoded);
                rawContent = await fileDecoded.text();
              }
            } catch (e4) {
              console.log('Tier 4 decoded URI failed:', e4);
            }
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

        if (!rawContent || !rawContent.trim()) {
          Alert.alert(
            'Error al abrir archivo',
            'No se pudo leer el archivo seleccionado. Por favor verifica que el archivo no esté dañado.'
          );
          return;
        }

        const extracted = extractIRealSongs(rawContent);
        if (extracted.length === 0) {
          Alert.alert(
            'Sin canciones iReal',
            'El archivo seleccionado se abrió, pero no contiene partituras válidas en formato iReal Pro (irealb://).'
          );
          return;
        }

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

  // Queue incoming URI if the app isn't ready yet; process it once ready.
  const handleOpenIncomingUri = useCallback(
    (uri: string) => {
      if (!uri) return;
      // Silently drop Expo dev server / localhost links
      if (
        uri.startsWith('exp://') ||
        uri.startsWith('exps://') ||
        uri.includes('localhost') ||
        uri.includes('127.0.0.1')
      ) {
        return;
      }
      if (!isAppReady) {
        // Store for deferred processing after init completes
        pendingUriRef.current = uri;
      } else {
        processIncomingUri(uri);
      }
    },
    [isAppReady, processIncomingUri]
  );

  // Once the app finishes initializing, dismiss splash screen and drain any pending URI that arrived early
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
      if (pendingUriRef.current) {
        const uri = pendingUriRef.current;
        pendingUriRef.current = null;
        processIncomingUri(uri);
      }
    }
  }, [isAppReady, processIncomingUri]);

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
  const libraryBackHandlerRef = useRef<(() => boolean) | null>(null);
  const libraryModalBackHandlerRef = useRef<(() => boolean) | null>(null);

  // Handle hardware Back button on Android (exit modals, exit sub-views, exit full screen, or confirm exit)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (settingsModalVisible) {
        setSettingsModalVisible(false);
        return true;
      }
      if (editSongModalVisible) {
        setEditSongModalVisible(false);
        return true;
      }
      if (editChordModalVisible) {
        setEditChordModalVisible(false);
        return true;
      }
      if (editSectionModalVisible) {
        setEditSectionModalVisible(false);
        return true;
      }
      if (createSongModalVisible) {
        setCreateSongModalVisible(false);
        return true;
      }
      if (editAnnotationModalVisible) {
        setEditAnnotationModalVisible(false);
        return true;
      }
      if (playlistsModalVisible) {
        if (libraryModalBackHandlerRef.current && libraryModalBackHandlerRef.current()) {
          return true;
        }
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
      if (isEditMode && currentScreen === 'sheet') {
        setIsEditMode(false);
        return true;
      }

      // If on sheet screen, hardware back returns to library home
      if (currentScreen === 'sheet') {
        setCurrentScreen('library');
        return true;
      }

      // If on library (home) screen, step back out of any active sub-view (selected playlist, options sheet, etc.) first
      if (libraryBackHandlerRef.current && libraryBackHandlerRef.current()) {
        return true;
      }

      // If at root of library screen, double-tap back within 2 seconds to exit app
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
  }, [
    settingsModalVisible,
    editSongModalVisible,
    editChordModalVisible,
    editSectionModalVisible,
    playlistsModalVisible,
    createSongModalVisible,
    editAnnotationModalVisible,
    importModalVisible,
    isFullScreen,
    isEditMode,
    currentScreen,
  ]);

  // Load song chosen from library or playlist and update active song in memory
  const handleSelectSongFromList = async (
    chosenSong: SongAST,
    playlistId?: string,
    songId?: string
  ) => {
    setActivePlaylistId(playlistId ?? null);
    const matching =
      (songId ? librarySongs.find((s) => s.id === songId) : undefined) ||
      librarySongs.find(
        (s) => s.title.toLowerCase().trim() === chosenSong.title.toLowerCase().trim()
      );
    if (matching) {
      await PlaylistStorage.setActiveSongId(matching.id);
      await loadSongWithPersistedKey(chosenSong, matching.id);
    } else {
      clearEditHistory();
      setBaseSong(chosenSong);
      setCurrentSong(chosenSong);
    }
    setCurrentScreen('sheet');
  };

  // Delete song from library and update active view if the deleted song was on screen
  const handleDeleteSong = async (songId: string) => {
    const isCurrentDeleted =
      songId === activeSongId ||
      librarySongs.find((s) => s.id === songId)?.title.toLowerCase().trim() ===
        currentSong.title.toLowerCase().trim();

    await PlaylistStorage.deleteSong(songId);
    const updatedSongs = await PlaylistStorage.getSongs();
    setLibrarySongs(updatedSongs);

    if (isCurrentDeleted) {
      clearEditHistory();
      if (updatedSongs.length > 0) {
        const nextTarget = updatedSongs[0];
        const parsedContainers = extractIRealSongs(nextTarget.rawInput);
        if (parsedContainers.length > 0) {
          const parsed = parseIRealSong(parsedContainers[0]);
          setBaseSong(parsed);
          setCurrentSong(parsed);
          setActiveSongIdState(nextTarget.id);
          await PlaylistStorage.setActiveSongId(nextTarget.id);
        }
      } else {
        setActiveSongIdState(null);
        setBaseSong(EMPTY_SONG);
        setCurrentSong(EMPTY_SONG);
        setCurrentScreen('library');
      }
    }
    await refreshStorageData();
  };

  // Delete current active song
  const handleDeleteCurrentSong = async () => {
    const currentSaved =
      (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
      librarySongs.find(
        (s) => s.title.toLowerCase().trim() === currentSong.title.toLowerCase().trim()
      );
    if (currentSaved) {
      await handleDeleteSong(currentSaved.id);
      setCurrentScreen('library');
    }
  };

  // Duplicate any song in the library by ID
  const handleDuplicateSongById = async (songId: string) => {
    const duplicated = await PlaylistStorage.duplicateSong(songId);
    await refreshStorageData();
    if (duplicated && Platform.OS === 'android') {
      ToastAndroid.show(`Copia creada: "${duplicated.title}"`, ToastAndroid.SHORT);
    }
  };

  // Duplicate the currently open song and switch directly to the new copy
  const handleDuplicateCurrentSong = async () => {
    const currentSaved =
      (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
      librarySongs.find(
        (s) => s.title.toLowerCase().trim() === currentSong.title.toLowerCase().trim()
      );
    if (!currentSaved) return;

    const duplicated = await PlaylistStorage.duplicateSong(currentSaved.id);
    if (!duplicated) return;

    await PlaylistStorage.setActiveSongId(duplicated.id);
    const updatedSongs = await PlaylistStorage.getSongs();
    setLibrarySongs(updatedSongs);

    const parsedContainers = extractIRealSongs(duplicated.rawInput);
    if (parsedContainers.length > 0) {
      const parsedCopy = parseIRealSong(parsedContainers[0]);
      await loadSongWithPersistedKey(parsedCopy, duplicated.id);
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Abriendo copia: "${duplicated.title}"`, ToastAndroid.SHORT);
    } else {
      Alert.alert(
        'Canción duplicada',
        `Se creó y abrió "${duplicated.title}". Ahora puedes editarla sin afectar la original.`
      );
    }
  };

  // Save updated song metadata (Title, Composer, Original Key, Style, Tempo)
  const handleSaveSongMetadata = async (updated: {
    title: string;
    composer: string;
    key: string;
    style: string;
    tempo?: number;
    setNewAsOriginal?: boolean;
  }) => {
    // 1. Locate the active song in storage (by active ID or title match)
    const activeId = await PlaylistStorage.getActiveSongId();
    let activeSaved = librarySongs.find((s) => s.id === activeId);
    if (!activeSaved) {
      activeSaved = librarySongs.find(
        (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
      );
    }
    if (!activeSaved) {
      const stored = await PlaylistStorage.getSongs();
      activeSaved =
        stored.find((s) => s.id === activeId) ||
        stored.find(
          (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
        );
    }
    if (!activeSaved) return;

    let newBase: SongAST;
    let newCurrent: SongAST;

    if (updated.setNewAsOriginal) {
      // The current transposed key becomes the new permanent original key!
      newBase = {
        ...currentSong,
        title: updated.title,
        composer: updated.composer,
        style: updated.style,
        tempo: updated.tempo,
        originalKey: currentSong.currentKey,
        currentKey: currentSong.currentKey,
        transposeAmount: 0,
      };
      newCurrent = newBase;
      await PlaylistStorage.saveSongTransposition(activeSaved.id, 0);
    } else {
      const keyChanged = updated.key !== baseSong.originalKey;
      if (keyChanged) {
        // Transpose all chords and notes to the newly chosen original key
        const transposed = transposeSong(baseSong, updated.key);
        newBase = {
          ...transposed,
          title: updated.title,
          composer: updated.composer,
          style: updated.style,
          tempo: updated.tempo,
          originalKey: updated.key,
          currentKey: updated.key,
          transposeAmount: 0,
        };
        newCurrent = newBase;
        await PlaylistStorage.saveSongTransposition(activeSaved.id, 0);
      } else {
        newBase = {
          ...baseSong,
          title: updated.title,
          composer: updated.composer,
          style: updated.style,
          tempo: updated.tempo,
        };
        newCurrent = {
          ...currentSong,
          title: updated.title,
          composer: updated.composer,
          style: updated.style,
          tempo: updated.tempo,
        };
      }
    }

    // 2. Sync edit history with metadata changes
    if (updated.setNewAsOriginal || updated.key !== baseSong.originalKey) {
      clearEditHistory();
    } else {
      const syncMeta = (ast: SongAST): SongAST => ({
        ...ast,
        title: updated.title,
        composer: updated.composer,
        style: updated.style,
        tempo: updated.tempo,
      });
      setUndoStack((prev) => prev.map(syncMeta));
      setRedoStack((prev) => prev.map(syncMeta));
    }

    // 3. Immediately update in-memory state
    setBaseSong(newBase);
    setCurrentSong(newCurrent);

    // 3. CRITICAL: Serialize the updated song AST to iReal Pro HTML and persist rawInput!
    const updatedRawHtml = serializeSongToIRealHtml(newBase);

    await PlaylistStorage.updateSong(activeSaved.id, {
      title: updated.title,
      composer: updated.composer,
      key: newBase.originalKey,
      style: updated.style,
      tempo: updated.tempo,
      rawInput: updatedRawHtml,
    });
    await PlaylistStorage.setActiveSongId(activeSaved.id);

    // 4. Update library state without overwriting baseSong/currentSong
    const updatedLibrary = await PlaylistStorage.getSongs();
    setLibrarySongs(updatedLibrary);

    if (Platform.OS === 'android') {
      ToastAndroid.show('Canción actualizada con éxito', ToastAndroid.SHORT);
    } else {
      Alert.alert('Canción actualizada', `Los datos de "${updated.title}" se han guardado con éxito.`);
    }
  };

  // Load sample song (Hosanna) only when library is empty
  const handleLoadHosannaSample = useCallback(async () => {
    try {
      const extracted = extractIRealSongs(HOSANNA_SAMPLE_HTML);
      if (extracted.length > 0) {
        const parsed = parseIRealSong(extracted[0]);
        await handleSongLoaded(parsed, HOSANNA_SAMPLE_HTML);
      }
    } catch (err) {
      console.warn('Error al cargar muestra de Hosanna:', err);
    }
  }, [handleSongLoaded]);

  // Export and share entire repertoire as a single authentic iReal Pro playlist .html file
  const handleExportAllSongs = async () => {
    if (librarySongs.length === 0) {
      Alert.alert('Repertorio vacío', 'No hay canciones en tu biblioteca para exportar.');
      return;
    }
    try {
      await exportAndShareLibraryHtml(librarySongs, 'Repertorio iReal Free');
    } catch (err) {
      console.warn('Error al exportar repertorio:', err);
      Alert.alert('Error', 'No se pudo exportar el repertorio.');
    }
  };

  // Persist an updated baseSong AST cleanly while preserving any active transposition
  const applyAndPersistBaseSong = useCallback(
    async (newBaseSong: SongAST, toastMsg?: string, recordHistory = true) => {
      if (recordHistory && baseSong.title !== 'Sin Canciones') {
        setUndoStack((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), baseSong]);
        setRedoStack([]);
      }

      const transposeDelta = currentSong.transposeAmount;
      const nextCurrent =
        transposeDelta !== 0 ? transposeSong(newBaseSong, transposeDelta) : newBaseSong;

      setBaseSong(newBaseSong);
      setCurrentSong(nextCurrent);

      try {
        const activeId = activeSongId || (await PlaylistStorage.getActiveSongId());
        let targetSaved: SavedSong | undefined;
        if (activeId) {
          const stored = await PlaylistStorage.getSongs();
          targetSaved = stored.find((s) => s.id === activeId);
        }
        if (!targetSaved) {
          const stored = await PlaylistStorage.getSongs();
          targetSaved = stored.find(
            (s) => s.title.toLowerCase().trim() === newBaseSong.title.toLowerCase().trim()
          );
        }
        if (!targetSaved && newBaseSong.title !== 'Sin Canciones') {
          const rawHtml = serializeSongToIRealHtml(newBaseSong);
          targetSaved = await PlaylistStorage.saveSong({
            title: newBaseSong.title,
            composer: newBaseSong.composer,
            key: newBaseSong.originalKey,
            style: newBaseSong.style,
            tempo: newBaseSong.tempo,
            rawInput: rawHtml,
          });
        }
        if (targetSaved) {
          const updatedHtml = serializeSongToIRealHtml(newBaseSong);
          await PlaylistStorage.updateSong(targetSaved.id, {
            title: newBaseSong.title,
            composer: newBaseSong.composer,
            key: newBaseSong.originalKey,
            style: newBaseSong.style,
            tempo: newBaseSong.tempo,
            rawInput: updatedHtml,
          });
          setActiveSongIdState(targetSaved.id);
          await PlaylistStorage.setActiveSongId(targetSaved.id);
          const updatedLibrary = await PlaylistStorage.getSongs();
          setLibrarySongs(updatedLibrary);
        }
      } catch (err) {
        console.warn('Error guardando cambios en storage:', err);
      }

      if (toastMsg && Platform.OS === 'android') {
        ToastAndroid.show(toastMsg, ToastAndroid.SHORT);
      }
    },
    [baseSong, currentSong.transposeAmount, activeSongId]
  );

  // Undo last score edit in Edit Mode
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const prevBase = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), baseSong]);
    await applyAndPersistBaseSong(prevBase, 'Cambio deshecho', false);
  }, [undoStack, baseSong, applyAndPersistBaseSong]);

  // Redo last undone score edit in Edit Mode
  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const nextBase = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), baseSong]);
    await applyAndPersistBaseSong(nextBase, 'Cambio rehecho', false);
  }, [redoStack, baseSong, applyAndPersistBaseSong]);

  // Open chord editor modal for a specific bar and chord (disabled in full-screen)
  const handleOpenEditChord = useCallback(
    (bar: BarAST, chordIndex = 0) => {
      if (isFullScreen || currentSong.title === 'Sin Canciones') return;
      setEditingBar(bar);
      setEditingChordIndex(chordIndex);
      setEditChordModalVisible(true);
    },
    [isFullScreen, currentSong.title]
  );

  // Open section editor modal for a specific row/section (disabled in full-screen)
  const handleOpenEditSection = useCallback(
    (rowIndex: number, currentLabel: string) => {
      if (isFullScreen || currentSong.title === 'Sin Canciones') return;
      setSectionModalMode('edit');
      setEditingSectionRowIndex(rowIndex);
      setEditingSectionLabel(currentLabel);
      setEditSectionModalVisible(true);
    },
    [isFullScreen, currentSong.title]
  );

  // Open section modal in 'add' mode to append a brand new section
  const handleOpenAddSection = useCallback(() => {
    if (isFullScreen || currentSong.title === 'Sin Canciones') return;
    setSectionModalMode('add');
    setEditingSectionLabel('Coro');
    setEditSectionModalVisible(true);
  }, [isFullScreen, currentSong.title]);

  // Save modified section name and persist permanently
  const handleSaveSection = async (rowIndex: number, newLabel: string) => {
    const newBaseSong = renameSectionAtRow(baseSong, rowIndex, newLabel);
    await applyAndPersistBaseSong(newBaseSong, 'Sección actualizada');
  };

  // Append a brand new section with N bars
  const handleAddNewSection = async (label: string, barCount: number, withRepeat: boolean) => {
    const newBaseSong = addSection(baseSong, label, barCount, withRepeat);
    await applyAndPersistBaseSong(newBaseSong, `Sección "${label}" añadida`);
  };

  // Duplicate an entire section (with all its chords, pulses, barlines, and annotations)
  const handleDuplicateSection = useCallback(
    async (
      rowIndex: number,
      placement: 'after' | 'end' = 'after',
      customLabel?: string
    ) => {
      const newBaseSong = duplicateSection(baseSong, rowIndex, placement, customLabel);
      await applyAndPersistBaseSong(newBaseSong, 'Sección duplicada');
    },
    [baseSong, applyAndPersistBaseSong]
  );

  // Delete an entire section (header row + continuation rows)
  const handleDeleteSection = useCallback(
    async (rowIndex: number) => {
      const newBaseSong = deleteSectionOrRow(baseSong, rowIndex, 'section');
      await applyAndPersistBaseSong(newBaseSong, 'Sección eliminada');
    },
    [baseSong, applyAndPersistBaseSong]
  );

  // Delete a single continuation row
  const handleDeleteRow = useCallback(
    async (rowIndex: number) => {
      const newBaseSong = deleteSectionOrRow(baseSong, rowIndex, 'row');
      await applyAndPersistBaseSong(newBaseSong, 'Fila eliminada');
    },
    [baseSong, applyAndPersistBaseSong]
  );

  // Append 1 or 4 measures to a section
  const handleAppendBarsToSection = useCallback(
    async (rowIndex: number, count: number) => {
      const newBaseSong = appendBarsToSection(baseSong, rowIndex, count);
      await applyAndPersistBaseSong(
        newBaseSong,
        count === 1 ? 'Compás añadido' : `${count} compases añadidos`
      );
    },
    [baseSong, applyAndPersistBaseSong]
  );

  // Append 1 or 4 measures to a specific row
  const handleAppendBarsToRow = useCallback(
    async (rowIndex: number, count: number) => {
      const newBaseSong = appendBarsToRow(baseSong, rowIndex, count);
      await applyAndPersistBaseSong(
        newBaseSong,
        count === 1 ? 'Compás añadido' : `${count} compases añadidos`
      );
    },
    [baseSong, applyAndPersistBaseSong]
  );

  // Insert 1 measure before or after a specific bar
  const handleInsertBar = async (barNumber: number, position: 'before' | 'after') => {
    const newBaseSong = insertBarsAround(baseSong, barNumber, position, 1);
    await applyAndPersistBaseSong(newBaseSong, 'Compás añadido');
  };

  // Delete a specific measure
  const handleDeleteBar = async (barNumber: number) => {
    if (baseSong.totalBars <= 1) {
      Alert.alert('Acción no disponible', 'La canción debe conservar al menos un compás.');
      return;
    }
    const newBaseSong = deleteBar(baseSong, barNumber);
    await applyAndPersistBaseSong(newBaseSong, 'Compás eliminado');
  };

  // Save modified chords, pulses, repeat status, barlines, and endings for a specific bar
  const handleSaveBarChords = async (barNumber: number, payload: BarUpdatePayload) => {
    const transposeDelta = currentSong.transposeAmount;

    const toBaseChord = (ch: ChordToken) =>
      transposeDelta !== 0 ? transposeChord(ch, -transposeDelta, baseSong.originalKey) : ch;

    const baseChords = payload.chords.map(toBaseChord);
    const baseElements = payload.elements.map((el) =>
      el.type === 'chord'
        ? { ...el, chord: toBaseChord(el.chord) }
        : {
            ...el,
            passingChord: el.passingChord ? toBaseChord(el.passingChord) : undefined,
          }
    );

    const newBaseSong = updateBarInSong(baseSong, barNumber, (b) => ({
      ...b,
      chords: baseChords,
      elements: baseElements,
      isRepeatMeasure: payload.isRepeatMeasure,
      isDoubleRepeatMeasure: false,
      leftBarline: payload.leftBarline,
      rightBarline: payload.rightBarline,
      ending: payload.ending,
    }));

    await applyAndPersistBaseSong(newBaseSong, 'Compás guardado');
  };

  // Active navigation song list (current setlist in exact playlist order, or all library songs)
  const activeNavigationList = useMemo(() => {
    if (activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        const setSongs = pl.songIds
          .map((id) => librarySongs.find((s) => s.id === id))
          .filter((s): s is SavedSong => Boolean(s));
        if (setSongs.length > 0) return setSongs;
      }
    }
    return librarySongs;
  }, [activePlaylistId, playlists, librarySongs]);

  const currentSongIndex = useMemo(() => {
    if (activeSongId) {
      const byId = activeNavigationList.findIndex((s) => s.id === activeSongId);
      if (byId >= 0) return byId;
    }
    return activeNavigationList.findIndex(
      (s) => s.title.trim().toLowerCase() === currentSong.title.trim().toLowerCase()
    );
  }, [activeNavigationList, activeSongId, currentSong.title]);

  const hasPrevSong = currentSongIndex > 0;
  const hasNextSong =
    currentSongIndex >= 0 && currentSongIndex < activeNavigationList.length - 1;

  // Jump to previous song in setlist
  const handlePrevSong = useCallback(async () => {
    if (hasPrevSong) {
      const target = activeNavigationList[currentSongIndex - 1];
      const parsedContainers = extractIRealSongs(target.rawInput);
      if (parsedContainers.length > 0) {
        const parsed = parseIRealSong(parsedContainers[0]);
        await PlaylistStorage.setActiveSongId(target.id);
        await loadSongWithPersistedKey(parsed, target.id);
      }
    }
  }, [hasPrevSong, activeNavigationList, currentSongIndex, loadSongWithPersistedKey]);

  // Jump to next song in setlist
  const handleNextSong = useCallback(async () => {
    if (hasNextSong) {
      const target = activeNavigationList[currentSongIndex + 1];
      const parsedContainers = extractIRealSongs(target.rawInput);
      if (parsedContainers.length > 0) {
        const parsed = parseIRealSong(parsedContainers[0]);
        await PlaylistStorage.setActiveSongId(target.id);
        await loadSongWithPersistedKey(parsed, target.id);
      }
    }
  }, [hasNextSong, activeNavigationList, currentSongIndex, loadSongWithPersistedKey]);

  // Create a brand new song from scratch and load it in Edit Mode
  const handleCreateSong = async (songData: {
    title: string;
    composer: string;
    key: string;
    timeSignature: string;
    style: string;
    tempo: number;
    template: 'blank' | 'basic' | 'complete';
  }) => {
    try {
      const cleanField = (val: string, fallback: string) =>
        (val || '').replace(/=/g, '-').trim() || fallback;
      const chordProg = buildTemplateChordProgression(
        songData.template || 'basic',
        songData.key,
        songData.timeSignature
      );
      const safeTitle = cleanField(songData.title, 'Nueva Canción');
      const safeComposer = cleanField(songData.composer, 'Desconocido');
      const safeStyle = cleanField(songData.style, 'Pop');
      const safeKey = cleanField(songData.key, 'C');
      const payload = `${safeTitle}=${safeComposer}==${safeStyle}=${safeKey}=0=${chordProg}=${safeStyle}=${songData.tempo}=3`;
      const irealUrl = `irealb://${encodeURIComponent(payload)}`;

      const fullHtml = buildIRealHtml(safeTitle, safeComposer, irealUrl);
      const parsedList = extractIRealSongs(fullHtml);
      if (parsedList.length > 0) {
        const parsed = parseIRealSong(parsedList[0]);
        await handleSongLoaded(parsed, fullHtml);
        setCreateSongModalVisible(false);
        setPlaylistsModalVisible(false);
        setSettingsModalVisible(false);
        setCurrentScreen('sheet');
        setIsEditMode(true);
      }
    } catch (err) {
      console.warn('Error al crear nueva canción:', err);
      Alert.alert('Error', 'No se pudo crear la nueva canción.');
    }
  };

  // Open Annotation editor (only in edit mode)
  const handleOpenEditAnnotation = useCallback(
    (text: string, bar?: BarAST, rowIndex?: number) => {
      setSelectedAnnotation({ text, bar, rowIndex, isNew: false });
      setEditAnnotationModalVisible(true);
    },
    []
  );

  // Open Annotation modal to add a brand new annotation onto a measure
  const handleAddAnnotationToBar = (bar: BarAST) => {
    setSelectedAnnotation({ text: '', bar, isNew: true });
    setEditAnnotationModalVisible(true);
  };

  // Save modified or newly added annotation
  const handleSaveAnnotation = async (newText: string) => {
    if (!selectedAnnotation) return;
    const oldText = selectedAnnotation.text;
    const targetBarNum = selectedAnnotation.bar?.barNumber;
    const isNew = Boolean(selectedAnnotation.isNew);
    setEditAnnotationModalVisible(false);

    if (isNew && targetBarNum !== undefined) {
      const isTopRepeatCount = /^\d+x$/i.test(newText.trim());
      const newBase = updateBarInSong(baseSong, targetBarNum, (b) => ({
        ...b,
        topAnnotations: isTopRepeatCount
          ? [...(b.topAnnotations || []), newText]
          : b.topAnnotations || [],
        bottomAnnotations: !isTopRepeatCount
          ? [...(b.bottomAnnotations || []), newText]
          : b.bottomAnnotations || [],
      }));
      await applyAndPersistBaseSong(newBase, 'Anotación añadida');
      return;
    }

    const updateBars = (bars: BarAST[]) =>
      bars.map((bar) => {
        if (targetBarNum !== undefined && bar.barNumber !== targetBarNum) return bar;
        const hasTop = bar.topAnnotations?.includes(oldText);
        const hasBottom = bar.bottomAnnotations?.includes(oldText);
        const hasGeneral = bar.annotations?.includes(oldText);
        if (!hasTop && !hasBottom && !hasGeneral) return bar;
        return {
          ...bar,
          topAnnotations: bar.topAnnotations.map((a) => (a === oldText ? newText : a)),
          bottomAnnotations: bar.bottomAnnotations.map((a) => (a === oldText ? newText : a)),
          annotations: bar.annotations.map((a) => (a === oldText ? newText : a)),
        };
      });

    const newRows = baseSong.rows.map((row) => ({
      ...row,
      bars: updateBars(row.bars),
    }));
    const newSections = baseSong.sections.map((sec) => ({
      ...sec,
      bars: updateBars(sec.bars),
    }));

    const newBase = { ...baseSong, rows: newRows, sections: newSections };
    await applyAndPersistBaseSong(newBase, 'Anotación guardada');
  };

  // Remove annotation
  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotation || selectedAnnotation.isNew) {
      setEditAnnotationModalVisible(false);
      return;
    }
    const oldText = selectedAnnotation.text;
    const targetBarNum = selectedAnnotation.bar?.barNumber;
    setEditAnnotationModalVisible(false);

    const filterBars = (bars: BarAST[]) =>
      bars.map((bar) => {
        if (targetBarNum !== undefined && bar.barNumber !== targetBarNum) return bar;
        const hasTop = bar.topAnnotations?.includes(oldText);
        const hasBottom = bar.bottomAnnotations?.includes(oldText);
        const hasGeneral = bar.annotations?.includes(oldText);
        if (!hasTop && !hasBottom && !hasGeneral) return bar;
        return {
          ...bar,
          topAnnotations: bar.topAnnotations.filter((a) => a !== oldText),
          bottomAnnotations: bar.bottomAnnotations.filter((a) => a !== oldText),
          annotations: bar.annotations.filter((a) => a !== oldText),
        };
      });

    const newRows = baseSong.rows.map((row) => ({
      ...row,
      bars: filterBars(row.bars),
    }));
    const newSections = baseSong.sections.map((sec) => ({
      ...sec,
      bars: filterBars(sec.bars),
    }));

    const newBase = { ...baseSong, rows: newRows, sections: newSections };
    await applyAndPersistBaseSong(newBase, 'Anotación eliminada');
  };

  // Stable UI navigation callbacks so TopBar and LeadSheetGrid never re-render on Metronome ticks
  const handleOpenSettings = useCallback(() => setSettingsModalVisible(true), []);
  const handleGoToLibrary = useCallback(() => setCurrentScreen('library'), []);
  const handleEnterFullScreen = useCallback(() => setIsFullScreen(true), []);
  const handleOpenEditSong = useCallback(() => setEditSongModalVisible(true), []);
  const handleToggleEditMode = useCallback(() => setIsEditMode((prev) => !prev), []);
  const handleResetToLibrary = useCallback(() => {
    setIsFullScreen(false);
    setIsEditMode(false);
    setCurrentScreen('library');
  }, []);

  // Export and share song as genuine .html file via native share sheet (WhatsApp, Files, Telegram).
  // When transposed, offers exporting either in the active transposed key or the original key.
  const handleShareSong = async () => {
    try {
      const currentSaved =
        (activeSongId ? librarySongs.find((s) => s.id === activeSongId) : undefined) ||
        librarySongs.find(
          (s) => s.title.toLowerCase() === currentSong.title.toLowerCase()
        );
      const originalRaw =
        currentSaved?.rawInput || serializeSongToIRealHtml(baseSong);

      const shareInOriginalKey = async () => {
        await exportAndShareSongHtml(
          baseSong.title,
          baseSong.composer,
          originalRaw,
          baseSong.originalKey
        );
      };

      const shareInTransposedKey = async () => {
        const transposedAst: SongAST = {
          ...currentSong,
          originalKey: currentSong.currentKey,
          transposeAmount: 0,
        };
        const transposedHtml = serializeSongToIRealHtml(transposedAst);
        await exportAndShareSongHtml(
          currentSong.title,
          currentSong.composer,
          transposedHtml,
          currentSong.currentKey
        );
      };

      const isTransposed =
        currentSong.transposeAmount !== 0 &&
        currentSong.currentKey !== baseSong.originalKey;

      if (!isTransposed) {
        if (Platform.OS === 'web') {
          await shareInOriginalKey();
        } else {
          setTimeout(() => {
            void shareInOriginalKey();
          }, 120);
        }
        return;
      }

      if (Platform.OS === 'web') {
        const useTransposed =
          typeof window !== 'undefined'
            ? window.confirm(
                `Esta canción está transportada a ${currentSong.currentKey} (tono original: ${baseSong.originalKey}).\n\nPulsa Aceptar para exportarla en ${currentSong.currentKey}, o Cancelar para exportarla en su tono original (${baseSong.originalKey}).`
              )
            : true;
        if (useTransposed) {
          await shareInTransposedKey();
        } else {
          await shareInOriginalKey();
        }
        return;
      }

      setTimeout(() => {
        Alert.alert(
          'Exportar canción transportada',
          `¿En qué tonalidad deseas compartir "${currentSong.title}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: `Tono original (${baseSong.originalKey})`,
              onPress: () => {
                void shareInOriginalKey();
              },
            },
            {
              text: `Tono actual (${currentSong.currentKey})`,
              onPress: () => {
                void shareInTransposedKey();
              },
            },
          ]
        );
      }, 120);
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
        <ErrorBoundary theme={theme} onResetToLibrary={handleResetToLibrary}>
          <View style={[styles.container, { backgroundColor: theme.background }]}>
            {currentScreen === 'library' ? (
              /* Home Screen: Full Repertoire & Playlists View */
              <PlaylistsModal
                isFullScreenView={true}
                theme={theme}
                onClose={() => {}}
                onSelectSong={handleSelectSongFromList}
                playlists={playlists}
                songs={librarySongs}
                onRefreshData={refreshStorageData}
                onDeleteSong={handleDeleteSong}
                onDuplicateSong={handleDuplicateSongById}
                activeSongTitle={currentSong.title !== 'Sin Canciones' ? currentSong.title : undefined}
                onOpenImport={() => setImportModalVisible(true)}
                onOpenCreateSong={() => setCreateSongModalVisible(true)}
                onOpenSettings={handleOpenSettings}
                onReturnToSheet={() => setCurrentScreen('sheet')}
                onLoadHosannaSample={librarySongs.length === 0 ? handleLoadHosannaSample : undefined}
                backHandlerRef={libraryBackHandlerRef}
              />
            ) : (
              /* Lead Sheet Screen */
              <>
                {/* Top Bar (Hidden in Full-Screen Mode) */}
                {!isFullScreen && (
                  <TopBar
                    song={currentSong}
                    originalKey={baseSong.originalKey}
                    theme={theme}
                    hasPrevSong={hasPrevSong}
                    hasNextSong={hasNextSong}
                    onTransposeStep={handleTransposeStep}
                    onOpenSettings={handleOpenSettings}
                    onOpenPlaylists={handleGoToLibrary}
                    onPrevSong={handlePrevSong}
                    onNextSong={handleNextSong}
                    onToggleFullScreen={handleEnterFullScreen}
                    onBackToLibrary={handleGoToLibrary}
                    onOpenEditSong={handleOpenEditSong}
                  />
                )}

                {/* Authentic Lead Sheet Grid */}
                <LeadSheetGrid
                  song={currentSong}
                  theme={theme}
                  fontScale={fontScale}
                  onEditBar={isFullScreen ? undefined : handleOpenEditChord}
                  onEditSection={isFullScreen ? undefined : handleOpenEditSection}
                  onEditAnnotation={isFullScreen ? undefined : handleOpenEditAnnotation}
                  onAppendBarsToSection={isFullScreen ? undefined : handleAppendBarsToSection}
                  onAppendBarsToRow={isFullScreen ? undefined : handleAppendBarsToRow}
                  onDuplicateSection={isFullScreen ? undefined : handleDuplicateSection}
                  onDeleteSection={isFullScreen ? undefined : handleDeleteSection}
                  onDeleteRow={isFullScreen ? undefined : handleDeleteRow}
                  onOpenAddSection={isFullScreen ? undefined : handleOpenAddSection}
                  onLoadHosannaSample={librarySongs.length === 0 ? handleLoadHosannaSample : undefined}
                  isEditMode={isEditMode}
                  onToggleEditMode={handleToggleEditMode}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
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

              {/* Floating Navigation Dock for Full-Screen Mode */}
              {isFullScreen && (
                <View
                  style={[
                    styles.fullScreenFloatingBar,
                    {
                      backgroundColor:
                        theme.mode === 'dark'
                          ? 'rgba(21, 30, 37, 0.94)'
                          : 'rgba(255, 255, 255, 0.96)',
                      borderColor: theme.gridBorder,
                    },
                  ]}
                >
                  {/* Previous Song */}
                  <TouchableOpacity
                    style={[
                      styles.fsNavBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      !hasPrevSong && styles.fsBtnDisabled,
                    ]}
                    onPress={handlePrevSong}
                    disabled={!hasPrevSong}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                  >
                    <Feather
                      name="chevron-left"
                      size={16}
                      color={hasPrevSong ? (theme.activeKeyBg || '#0284c7') : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.fsNavLabel,
                        { color: hasPrevSong ? theme.textPrimary : theme.textSecondary },
                      ]}
                    >
                      Anterior
                    </Text>
                  </TouchableOpacity>

                  {/* Center Progress & Exit */}
                  <TouchableOpacity
                    style={[
                      styles.fsExitBtn,
                      { backgroundColor: theme.cardBackground, borderColor: theme.btnBorder },
                    ]}
                    onPress={() => setIsFullScreen(false)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <View style={styles.fsExitInner}>
                      {activeNavigationList.length > 0 && currentSongIndex >= 0 && (
                        <Text style={[styles.fsExitText, { color: theme.textSecondary }]}>
                          {currentSongIndex + 1}/{activeNavigationList.length} •
                        </Text>
                      )}
                      <Feather name="minimize-2" size={13} color={theme.textSecondary} />
                      <Text style={[styles.fsExitText, { color: theme.textSecondary }]}>Salir</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Next Song */}
                  <TouchableOpacity
                    style={[
                      styles.fsNavBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      !hasNextSong && styles.fsBtnDisabled,
                    ]}
                    onPress={handleNextSong}
                    disabled={!hasNextSong}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                  >
                    <Text
                      style={[
                        styles.fsNavLabel,
                        { color: hasNextSong ? theme.textPrimary : theme.textSecondary },
                      ]}
                    >
                      Siguiente
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={hasNextSong ? (theme.activeKeyBg || '#0284c7') : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
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
            onOpenPlaylists={() => setCurrentScreen('library')}
            onOpenImport={() => setImportModalVisible(true)}
            onDuplicateCurrentSong={
              currentSong.title !== 'Sin Canciones' ? handleDuplicateCurrentSong : undefined
            }
            onDeleteCurrentSong={
              currentSong.title !== 'Sin Canciones' ? handleDeleteCurrentSong : undefined
            }
            onOpenEditSong={() => setEditSongModalVisible(true)}
            onExportAllSongs={librarySongs.length > 0 ? handleExportAllSongs : undefined}
            onOpenCreateSong={() => setCreateSongModalVisible(true)}
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
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
            onDuplicateSong={handleDuplicateSongById}
            onOpenCreateSong={() => setCreateSongModalVisible(true)}
            onLoadHosannaSample={librarySongs.length === 0 ? handleLoadHosannaSample : undefined}
            backHandlerRef={libraryModalBackHandlerRef}
          />

          {/* Edit Song Information & Original Key Modal */}
          <EditSongModal
            visible={editSongModalVisible}
            theme={theme}
            song={currentSong}
            onClose={() => setEditSongModalVisible(false)}
            onSave={handleSaveSongMetadata}
          />

          {/* Edit Individual Chord / Measure Modal */}
          <EditChordModal
            visible={editChordModalVisible}
            bar={editingBar}
            defaultKeyRoot={getKeyRoot(currentSong.currentKey || 'C')}
            initialChordIndex={editingChordIndex}
            canDeleteBar={currentSong.totalBars > 1}
            theme={theme}
            fontScale={fontScale}
            onClose={() => setEditChordModalVisible(false)}
            onSaveBar={handleSaveBarChords}
            onInsertBar={handleInsertBar}
            onDeleteBar={handleDeleteBar}
            onAddAnnotationToBar={handleAddAnnotationToBar}
          />

          {/* Edit / Add Section Modal */}
          <EditSectionModal
            visible={editSectionModalVisible}
            mode={sectionModalMode}
            theme={theme}
            fontScale={fontScale}
            initialLabel={editingSectionLabel}
            rowIndex={editingSectionRowIndex}
            canDeleteSection={currentSong.rows.length > 1}
            onClose={() => setEditSectionModalVisible(false)}
            onSave={handleSaveSection}
            onAddSection={handleAddNewSection}
            onDuplicateSection={handleDuplicateSection}
            onDeleteSection={handleDeleteSection}
          />

          {/* Edit Annotation Modal */}
          <EditAnnotationModal
            visible={editAnnotationModalVisible}
            theme={theme}
            annotationText={selectedAnnotation?.text || ''}
            onClose={() => setEditAnnotationModalVisible(false)}
            onSave={handleSaveAnnotation}
            onDelete={handleDeleteAnnotation}
          />

          {/* Create New Song Modal */}
          <CreateSongModal
            visible={createSongModalVisible}
            theme={theme}
            onClose={() => setCreateSongModalVisible(false)}
            onCreate={handleCreateSong}
          />
          </View>
        </ErrorBoundary>
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
  fullScreenFloatingBar: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
  },
  fsNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  fsBtnDisabled: {
    opacity: 0.35,
  },
  fsNavLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  fsArrowText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  fsExitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fsExitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fsExitText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
