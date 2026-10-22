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
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { extractIRealSongs } from './src/core/deobfuscator';
import { parseIRealSong } from './src/core/parser';
import { transposeSong, transposeChord } from './src/core/transposer';
import { exportAndShareSongHtml } from './src/utils/fileExporter';
import { serializeSongToIRealHtml } from './src/core/serializer';
import { TopBar } from './src/components/TopBar';
import { LeadSheetGrid } from './src/components/LeadSheetGrid';
import { MetronomeBar } from './src/components/MetronomeBar';
import { SheetSettingsModal } from './src/components/SheetSettingsModal';
import { ImportModal } from './src/components/ImportModal';
import { PlaylistsModal } from './src/components/PlaylistsModal';
import { EditSongModal } from './src/components/EditSongModal';
import { EditChordModal } from './src/components/EditChordModal';
import { EditSectionModal } from './src/components/EditSectionModal';
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

export default function App() {
  // Theme state (Light mode default, persisted)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
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

  // Initialize with empty song by default (no preloaded song)
  const [baseSong, setBaseSong] = useState<SongAST>(EMPTY_SONG);
  const [currentSong, setCurrentSong] = useState<SongAST>(EMPTY_SONG);

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
  const [editingSectionRowIndex, setEditingSectionRowIndex] = useState<number>(0);
  const [editingSectionLabel, setEditingSectionLabel] = useState<string>('');

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
    setCurrentScreen('sheet');
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
    setCurrentScreen('sheet');
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

      // If on sheet screen, hardware back returns to library home
      if (currentScreen === 'sheet') {
        setCurrentScreen('library');
        return true;
      }

      // If on library (home) screen, double-tap back within 2 seconds to exit app
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
    importModalVisible,
    isFullScreen,
    currentScreen,
  ]);

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
    setCurrentScreen('sheet');
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
        setCurrentScreen('library');
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
      setCurrentScreen('library');
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
    const activeSaved = librarySongs.find(
      (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
    );
    if (!activeSaved) return;

    if (updated.setNewAsOriginal) {
      // The current transposed key becomes the new permanent original key!
      const newBase: SongAST = {
        ...currentSong,
        title: updated.title,
        composer: updated.composer,
        style: updated.style,
        tempo: updated.tempo,
        originalKey: currentSong.currentKey,
        currentKey: currentSong.currentKey,
        transposeAmount: 0,
      };
      setBaseSong(newBase);
      setCurrentSong(newBase);

      await PlaylistStorage.saveSongTransposition(activeSaved.id, 0);
      await PlaylistStorage.updateSong(activeSaved.id, {
        title: updated.title,
        composer: updated.composer,
        key: currentSong.currentKey,
        style: updated.style,
        tempo: updated.tempo,
      });
    } else {
      // Key or metadata changed
      const keyChanged = updated.key !== baseSong.originalKey;
      let newBase: SongAST;
      let newCurrent: SongAST;

      if (keyChanged) {
        // Transpose the song to the newly selected original key
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

      setBaseSong(newBase);
      setCurrentSong(newCurrent);

      await PlaylistStorage.updateSong(activeSaved.id, {
        title: updated.title,
        composer: updated.composer,
        key: updated.key,
        style: updated.style,
        tempo: updated.tempo,
      });
    }

    await PlaylistStorage.setActiveSongId(activeSaved.id);
    await refreshStorageData();
    Alert.alert('Canción actualizada', `Los datos de "${updated.title}" se han guardado con éxito.`);
  };

  // Open chord editor modal for a specific bar and chord (disabled in full-screen)
  const handleOpenEditChord = (bar: BarAST, chordIndex = 0) => {
    if (isFullScreen || currentSong.title === 'Sin Canciones') return;
    setEditingBar(bar);
    setEditingChordIndex(chordIndex);
    setEditChordModalVisible(true);
  };

  // Open section editor modal for a specific row/section (disabled in full-screen)
  const handleOpenEditSection = (rowIndex: number, currentLabel: string) => {
    if (isFullScreen || currentSong.title === 'Sin Canciones') return;
    setEditingSectionRowIndex(rowIndex);
    setEditingSectionLabel(currentLabel);
    setEditSectionModalVisible(true);
  };

  // Save modified section name and persist permanently
  const handleSaveSection = async (rowIndex: number, newLabel: string) => {
    const cleanLabel = newLabel.trim();
    let letter = 'A';
    let suffix = cleanLabel;

    if (!cleanLabel) {
      letter = '';
      suffix = '';
    } else {
      const lower = cleanLabel.toLowerCase();
      if (lower.startsWith('intro')) {
        letter = 'IN';
        suffix = cleanLabel.length > 5 ? cleanLabel.slice(5).trim() : 'tro';
        if (!suffix) suffix = 'tro';
      } else if (lower.startsWith('verso')) {
        letter = 'V';
        suffix = cleanLabel.length > 5 ? cleanLabel.slice(5).trim() : 'erso';
        if (!suffix) suffix = 'erso';
      } else if (lower.startsWith('coro')) {
        letter = 'C';
        suffix = cleanLabel.length > 4 ? cleanLabel.slice(4).trim() : 'oro';
        if (!suffix) suffix = 'oro';
      } else if (lower.startsWith('puente') || lower.startsWith('bridge')) {
        letter = 'B';
        suffix = cleanLabel;
      } else if (lower.startsWith('final') || lower.startsWith('outro')) {
        letter = 'F';
        suffix = cleanLabel;
      } else if (lower.startsWith('solo') || lower.startsWith('instrumental')) {
        letter = 'IN';
        suffix = cleanLabel;
      } else {
        letter = cleanLabel.charAt(0).toUpperCase();
        suffix = cleanLabel;
      }
    }

    const updateSongSection = (songToUpdate: SongAST): SongAST => {
      const targetRow = songToUpdate.rows[rowIndex];
      const targetFirstBar = targetRow?.bars[0];

      const newRows = songToUpdate.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        return {
          ...row,
          sectionLabel: cleanLabel || undefined,
          sectionLetter: letter || undefined,
          sectionSuffix: suffix || undefined,
          bars: row.bars.map((bar, bIdx) => {
            if (bIdx !== 0) return bar;
            return {
              ...bar,
              sectionLabel: cleanLabel || undefined,
              sectionLetter: letter || undefined,
              sectionSuffix: suffix || undefined,
            };
          }),
        };
      });

      const newSections = songToUpdate.sections.map((sec) => {
        if (targetFirstBar && sec.bars.some((b) => b.barNumber === targetFirstBar.barNumber)) {
          return {
            ...sec,
            label: cleanLabel || 'Main',
            letter: letter || 'A',
          };
        }
        return sec;
      });

      return {
        ...songToUpdate,
        rows: newRows,
        sections: newSections,
      };
    };

    const newBaseSong = updateSongSection(baseSong);
    const newCurrentSong = updateSongSection(currentSong);

    setBaseSong(newBaseSong);
    setCurrentSong(newCurrentSong);

    try {
      let activeSaved = librarySongs.find(
        (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
      );
      if (!activeSaved) {
        const stored = await PlaylistStorage.getSongs();
        activeSaved = stored.find(
          (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
        );
      }
      if (activeSaved) {
        const updatedHtml = serializeSongToIRealHtml(newBaseSong);
        await PlaylistStorage.updateSong(activeSaved.id, {
          rawInput: updatedHtml,
        });
        await PlaylistStorage.setActiveSongId(activeSaved.id);
        const updatedLibrary = await PlaylistStorage.getSongs();
        setLibrarySongs(updatedLibrary);
      }
    } catch (err) {
      console.warn('Error guardando sección:', err);
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show('Sección actualizada', ToastAndroid.SHORT);
    }
  };

  // Save modified chords for a specific bar and persist permanently
  const handleSaveBarChords = async (
    barNumber: number,
    updatedChords: ChordToken[],
    isRepeatMeasure: boolean
  ) => {
    // In transposed mode, translate the user's chords back to the base original key
    const transposeDelta = currentSong.transposeAmount;
    const baseChords =
      transposeDelta !== 0
        ? updatedChords.map((ch) => transposeChord(ch, -transposeDelta, baseSong.originalKey))
        : updatedChords;

    const cellIdRevision = Date.now().toString(36);

    const updateSongBar = (songToUpdate: SongAST, chordsForBar: ChordToken[]): SongAST => {
      const newRows = songToUpdate.rows.map((row) => ({
        ...row,
        bars: row.bars.map((b) => {
          if (b.barNumber !== barNumber) return b;
          return {
            ...b,
            id: `bar-${b.barNumber}-${cellIdRevision}`,
            chords: chordsForBar,
            elements: chordsForBar.map((c) => ({ type: 'chord' as const, chord: c })),
            isRepeatMeasure,
            isDoubleRepeatMeasure: false,
          };
        }),
      }));
      const newSections = songToUpdate.sections.map((sec) => ({
        ...sec,
        bars: sec.bars.map((b) => {
          if (b.barNumber !== barNumber) return b;
          return {
            ...b,
            id: `bar-${b.barNumber}-${cellIdRevision}`,
            chords: chordsForBar,
            elements: chordsForBar.map((c) => ({ type: 'chord' as const, chord: c })),
            isRepeatMeasure,
            isDoubleRepeatMeasure: false,
          };
        }),
      }));
      return {
        ...songToUpdate,
        rows: newRows,
        sections: newSections,
      };
    };

    // 1. Immediately apply to state so the score updates instantly on screen without latency
    const newBaseSong = updateSongBar(baseSong, baseChords);
    const newCurrentSong = updateSongBar(currentSong, updatedChords);

    setBaseSong(newBaseSong);
    setCurrentSong(newCurrentSong);

    // 2. Persist updated iReal Pro document permanently to storage
    try {
      let activeSaved = librarySongs.find(
        (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
      );
      if (!activeSaved) {
        const stored = await PlaylistStorage.getSongs();
        activeSaved = stored.find(
          (s) => s.title.toLowerCase().trim() === baseSong.title.toLowerCase().trim()
        );
      }
      if (!activeSaved && baseSong.title !== 'Sin Canciones') {
        const rawHtml = serializeSongToIRealHtml(baseSong);
        activeSaved = await PlaylistStorage.saveSong({
          title: baseSong.title,
          composer: baseSong.composer,
          key: baseSong.originalKey,
          style: baseSong.style,
          tempo: baseSong.tempo,
          rawInput: rawHtml,
        });
      }

      if (activeSaved) {
        const updatedHtml = serializeSongToIRealHtml(newBaseSong);
        await PlaylistStorage.updateSong(activeSaved.id, {
          rawInput: updatedHtml,
        });
        await PlaylistStorage.setActiveSongId(activeSaved.id);
        const updatedLibrary = await PlaylistStorage.getSongs();
        setLibrarySongs(updatedLibrary);
      }
    } catch (err) {
      console.warn('Error guardando acordes en storage:', err);
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show('Acordes guardados', ToastAndroid.SHORT);
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
      const rawFallback = currentSaved?.rawInput || currentSong.rawDeobfuscated;
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
              activeSongTitle={currentSong.title !== 'Sin Canciones' ? currentSong.title : undefined}
              onOpenImport={() => setImportModalVisible(true)}
              onOpenSettings={() => setSettingsModalVisible(true)}
              onReturnToSheet={() => setCurrentScreen('sheet')}
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
                  onOpenSettings={() => setSettingsModalVisible(true)}
                  onOpenPlaylists={() => setCurrentScreen('library')}
                  onPrevSong={handlePrevSong}
                  onNextSong={handleNextSong}
                  onToggleFullScreen={() => setIsFullScreen(true)}
                  onBackToLibrary={() => setCurrentScreen('library')}
                  onOpenEditSong={() => setEditSongModalVisible(true)}
                />
              )}

              {/* Authentic Lead Sheet Grid */}
              <LeadSheetGrid
                song={currentSong}
                theme={theme}
                fontScale={fontScale}
                onEditBar={isFullScreen ? undefined : handleOpenEditChord}
                onEditSection={isFullScreen ? undefined : handleOpenEditSection}
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
            onDeleteCurrentSong={
              currentSong.title !== 'Sin Canciones' ? handleDeleteCurrentSong : undefined
            }
            onOpenEditSong={() => setEditSongModalVisible(true)}
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
            initialChordIndex={editingChordIndex}
            theme={theme}
            fontScale={fontScale}
            onClose={() => setEditChordModalVisible(false)}
            onSaveBar={handleSaveBarChords}
          />

          {/* Edit Section Label Modal */}
          <EditSectionModal
            visible={editSectionModalVisible}
            theme={theme}
            fontScale={fontScale}
            initialLabel={editingSectionLabel}
            rowIndex={editingSectionRowIndex}
            onClose={() => setEditSectionModalVisible(false)}
            onSave={handleSaveSection}
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
