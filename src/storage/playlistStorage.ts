import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractIRealSongs, normalizeComposerName } from '../core/deobfuscator';
import { parseIRealSong } from '../core/parser';
import { serializeSongToIRealHtml } from '../core/serializer';

export interface SavedSong {
  id: string;
  title: string;
  composer: string;
  key: string;
  style: string;
  tempo?: number;
  rawInput: string;
  dateAdded: number;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

const STORAGE_KEYS = {
  INITIALIZED: '@ireal_storage_initialized_v3',
  SONGS: '@ireal_saved_songs_v3',
  PLAYLISTS: '@ireal_playlists_v3',
  THEME: '@ireal_theme_mode_v2',
  FONT_SCALE: '@ireal_font_scale_v1',
  KEEP_AWAKE: '@ireal_keep_awake_v1',
  ACTIVE_SONG_ID: '@ireal_active_song_id_v3',
  SONG_KEYS: '@ireal_song_keys_v1',
  DELETED_SONGS: '@ireal_deleted_song_ids_v3',
};

const SEED_IDS = new Set(['seed-hay-libertad', 'seed-venid-glorificad', 'seed-mas-el-dios']);

/**
 * Lightweight sequential promise queue to serialize read-modify-write operations on AsyncStorage
 * and prevent race conditions on rapid consecutive user actions (e.g. fast setlist reordering or transposition taps).
 */
let storageWriteQueue: Promise<unknown> = Promise.resolve();

function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = storageWriteQueue.then(operation, operation);
  storageWriteQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export const PlaylistStorage = {
  /**
   * Retrieves all saved songs. Defaults to empty repertoire (no bundled songs).
   */
  async getSongs(): Promise<SavedSong[]> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        // Migrate custom user-imported songs from v2 if any exist, filtering out old seed songs
        let migratedSongs: SavedSong[] = [];
        try {
          const v2Json = await AsyncStorage.getItem('@ireal_saved_songs_v2');
          if (v2Json) {
            const v2List: SavedSong[] = JSON.parse(v2Json);
            migratedSongs = v2List.filter((s) => !SEED_IDS.has(s.id) && !s.id.startsWith('seed-'));
          }
        } catch {
          // ignore
        }

        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(migratedSongs));
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify([]));
        if (migratedSongs.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SONG_ID, migratedSongs[0].id);
        }
        return migratedSongs;
      }

      const json = await AsyncStorage.getItem(STORAGE_KEYS.SONGS);
      let existingSongs: SavedSong[] = json ? JSON.parse(json) : [];

      const deletedJson = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_SONGS);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];

      // Purge any songs previously recorded as deleted by the user
      if (deletedIds.length > 0) {
        const initialCount = existingSongs.length;
        existingSongs = existingSongs.filter(
          (s) => !deletedIds.includes(s.id) && !deletedIds.includes(s.title.toLowerCase().trim())
        );
        if (existingSongs.length !== initialCount) {
          await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(existingSongs));
        }
      }

      // Purge any corrupted non-songs (e.g. accidentally parsed HTML documents)
      const sanitized = existingSongs.filter(
        (s) =>
          !s.title.startsWith('<!DOCTYPE') &&
          !s.title.startsWith('<html') &&
          !s.title.startsWith('<meta')
      );
      if (sanitized.length !== existingSongs.length) {
        existingSongs = sanitized;
        await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(existingSongs));
        if (existingSongs.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SONG_ID, existingSongs[0].id);
        }
      }

      // Ensure all loaded composers are normalized to clean forward format
      let hasNormalizedComposer = false;
      existingSongs.forEach((s) => {
        const norm = normalizeComposerName(s.composer, s.rawInput);
        if (norm !== s.composer) {
          s.composer = norm;
          hasNormalizedComposer = true;
        }
      });

      if (hasNormalizedComposer) {
        await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(existingSongs));
      }

      return existingSongs;
    } catch {
      return [];
    }
  },

  /**
   * Retrieves the map of user transpositions for each song: { [songId]: transposeAmount }
   */
  async getTranspositions(): Promise<Record<string, number>> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SONG_KEYS);
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  },

  /**
   * Persists the user's chosen transposition for a song permanently in memory.
   */
  async saveSongTransposition(songId: string, transposeAmount: number): Promise<void> {
    return withStorageLock(async () => {
      try {
        const map = await this.getTranspositions();
        map[songId] = transposeAmount;
        await AsyncStorage.setItem(STORAGE_KEYS.SONG_KEYS, JSON.stringify(map));
      } catch {
        // ignore
      }
    });
  },

  /**
   * Adds or updates a single song in the library.
   */
  async saveSong(songInput: {
    title: string;
    composer: string;
    key: string;
    style: string;
    tempo?: number;
    rawInput: string;
  }): Promise<SavedSong> {
    const [saved] = await this.saveMultipleSongs([songInput]);
    return saved;
  },

  /**
   * Adds or updates multiple songs in the library in a single atomic storage write.
   */
  async saveMultipleSongs(
    songInputs: Array<{
      title: string;
      composer: string;
      key: string;
      style: string;
      tempo?: number;
      rawInput: string;
    }>
  ): Promise<SavedSong[]> {
    return withStorageLock(async () => {
      const songs = await this.getSongs();
      const savedList: SavedSong[] = [];

      for (const songInput of songInputs) {
        const baseId = songInput.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const existingIndex = songs.findIndex(
          (s) => s.title.toLowerCase().trim() === songInput.title.toLowerCase().trim()
        );

        const savedSong: SavedSong = {
          id:
            existingIndex >= 0
              ? songs[existingIndex].id
              : `song-${baseId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          title: songInput.title,
          composer: songInput.composer,
          key: songInput.key,
          style: songInput.style,
          tempo: songInput.tempo,
          rawInput: songInput.rawInput,
          dateAdded: Date.now(),
        };

        if (existingIndex >= 0) {
          songs[existingIndex] = savedSong;
        } else {
          songs.unshift(savedSong);
        }
        savedList.push(savedSong);
      }

      // If re-importing previously deleted songs, un-mark them from deletedIds
      const deletedJson = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_SONGS);
      let deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      let updatedDeleted = false;
      for (const songInput of songInputs) {
        const normTitle = songInput.title.toLowerCase().trim();
        if (deletedIds.includes(normTitle)) {
          deletedIds = deletedIds.filter((id) => id !== normTitle);
          updatedDeleted = true;
        }
      }
      if (updatedDeleted) {
        await AsyncStorage.setItem(STORAGE_KEYS.DELETED_SONGS, JSON.stringify(deletedIds));
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
      return savedList;
    });
  },

  /**
   * Updates an existing song in the library by its ID.
   */
  async updateSong(
    songId: string,
    updates: Partial<Omit<SavedSong, 'id' | 'dateAdded'>>
  ): Promise<SavedSong | null> {
    return withStorageLock(async () => {
      const songs = await this.getSongs();
      const idx = songs.findIndex((s) => s.id === songId);
      if (idx === -1) return null;

      const current = songs[idx];
      const updatedSong: SavedSong = {
        ...current,
        ...updates,
      };
      songs[idx] = updatedSong;
      await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
      return updatedSong;
    });
  },

  /**
   * Duplicates an existing song in the library with a unique "(Copia)" title,
   * updating its serialized iReal HTML payload and copying any saved transposition.
   */
  async duplicateSong(songId: string): Promise<SavedSong | null> {
    return withStorageLock(async () => {
      const songs = await this.getSongs();
      const sourceIdx = songs.findIndex((s) => s.id === songId);
      if (sourceIdx === -1) return null;

      const source = songs[sourceIdx];
      const baseTitle =
        source.title.replace(/\s*\(Copia(?:\s+\d+)?\)\s*$/i, '').trim() || source.title;
      const existingTitles = new Set(songs.map((s) => s.title.toLowerCase().trim()));

      let copyTitle = `${baseTitle} (Copia)`;
      let counter = 2;
      while (existingTitles.has(copyTitle.toLowerCase().trim())) {
        copyTitle = `${baseTitle} (Copia ${counter})`;
        counter++;
      }

      let copyRawInput = source.rawInput;
      try {
        const extracted = extractIRealSongs(source.rawInput);
        if (extracted.length > 0) {
          const parsed = parseIRealSong(extracted[0]);
          copyRawInput = serializeSongToIRealHtml({
            ...parsed,
            title: copyTitle,
          });
        }
      } catch {
        // keep source rawInput if re-serialization fails
      }

      const baseId = copyTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const duplicated: SavedSong = {
        id: `song-${baseId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: copyTitle,
        composer: source.composer,
        key: source.key,
        style: source.style,
        tempo: source.tempo,
        rawInput: copyRawInput,
        dateAdded: Date.now(),
      };

      songs.splice(sourceIdx + 1, 0, duplicated);
      await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));

      // Preserve any user-chosen transposition on the duplicated copy (directly, inside the active lock)
      const transpositions = await this.getTranspositions();
      if (transpositions[source.id] !== undefined && transpositions[source.id] !== 0) {
        transpositions[duplicated.id] = transpositions[source.id];
        await AsyncStorage.setItem(STORAGE_KEYS.SONG_KEYS, JSON.stringify(transpositions));
      }

      return duplicated;
    });
  },

  /**
   * Deletes a song from the library and from any playlists it belongs to.
   * Records the deletion so automatic seed sync never re-introduces it.
   */
  async deleteSong(songId: string): Promise<void> {
    return withStorageLock(async () => {
      const songs = await this.getSongs();
      const songToDelete = songs.find((s) => s.id === songId);

      // Track deleted ID and title so seed auto-sync never re-introduces it
      const deletedJson = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_SONGS);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedIds.includes(songId)) {
        deletedIds.push(songId);
      }
      if (songToDelete) {
        const normTitle = songToDelete.title.toLowerCase().trim();
        if (!deletedIds.includes(normTitle)) {
          deletedIds.push(normTitle);
        }
      }
      await AsyncStorage.setItem(STORAGE_KEYS.DELETED_SONGS, JSON.stringify(deletedIds));

      const updatedSongs = songs.filter(
        (s) =>
          s.id !== songId &&
          (songToDelete
            ? s.title.toLowerCase().trim() !== songToDelete.title.toLowerCase().trim()
            : true)
      );
      await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(updatedSongs));

      // Clean up any stored transposition for the deleted song
      const transpositions = await this.getTranspositions();
      if (transpositions[songId] !== undefined) {
        delete transpositions[songId];
        await AsyncStorage.setItem(STORAGE_KEYS.SONG_KEYS, JSON.stringify(transpositions));
      }

      // Also remove from all playlists
      const playlists = await this.getPlaylists();
      const updatedPlaylists = playlists.map((pl) => ({
        ...pl,
        songIds: pl.songIds.filter((id) => id !== songId),
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));

      // If active song is deleted, point to next available song
      const activeId = await this.getActiveSongId();
      if (activeId === songId) {
        if (updatedSongs.length > 0) {
          await this.setActiveSongId(updatedSongs[0].id);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SONG_ID);
        }
      }
    });
  },

  /**
   * Retrieves the ID of the last active song.
   */
  async getActiveSongId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SONG_ID);
    } catch {
      return null;
    }
  },

  /**
   * Sets the ID of the currently active song in memory.
   */
  async setActiveSongId(songId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SONG_ID, songId);
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves all playlists.
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      // Ensure songs are seeded first if empty
      await this.getSongs();
      const json = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  /**
   * Creates a new playlist.
   */
  async createPlaylist(name: string): Promise<Playlist> {
    return withStorageLock(async () => {
      const playlists = await this.getPlaylists();
      const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newPl: Playlist = {
        id: `pl-${baseId}-${Date.now().toString(36)}`,
        name,
        songIds: [],
        createdAt: Date.now(),
      };
      playlists.push(newPl);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      return newPl;
    });
  },

  /**
   * Deletes a playlist.
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    return withStorageLock(async () => {
      const playlists = await this.getPlaylists();
      const updated = playlists.filter((p) => p.id !== playlistId);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updated));
    });
  },

  /**
   * Adds a song to a playlist.
   */
  async addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
    return withStorageLock(async () => {
      const playlists = await this.getPlaylists();
      const target = playlists.find((p) => p.id === playlistId);
      if (target && !target.songIds.includes(songId)) {
        target.songIds.push(songId);
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      }
    });
  },

  /**
   * Removes a song from a playlist.
   */
  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    return withStorageLock(async () => {
      const playlists = await this.getPlaylists();
      const target = playlists.find((p) => p.id === playlistId);
      if (target) {
        target.songIds = target.songIds.filter((id) => id !== songId);
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      }
    });
  },

  /**
   * Reorders a song inside a playlist from `fromIndex` to `toIndex`.
   */
  async moveSongInPlaylist(
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<void> {
    return withStorageLock(async () => {
      const playlists = await this.getPlaylists();
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return;
      if (
        fromIndex < 0 ||
        fromIndex >= target.songIds.length ||
        toIndex < 0 ||
        toIndex >= target.songIds.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const updatedIds = [...target.songIds];
      const [moved] = updatedIds.splice(fromIndex, 1);
      updatedIds.splice(toIndex, 0, moved);
      target.songIds = updatedIds;
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    });
  },

  /**
   * Theme mode preference persistence.
   */
  async getThemeMode(): Promise<'dark' | 'light'> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      return mode === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  },

  async setThemeMode(mode: 'dark' | 'light'): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, mode);
    } catch {
      // ignore
    }
  },

  /**
   * Font scale modifier preference persistence.
   */
  async getFontScale(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.FONT_SCALE);
      return val ? parseFloat(val) : 1.0;
    } catch {
      return 1.0;
    }
  },

  async setFontScale(scale: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SCALE, scale.toString());
    } catch {
      // ignore
    }
  },

  /**
   * Keep screen awake preference persistence.
   */
  async getKeepAwake(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.KEEP_AWAKE);
      return val !== null ? val === 'true' : true;
    } catch {
      return true;
    }
  },

  async setKeepAwake(val: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.KEEP_AWAKE, val ? 'true' : 'false');
    } catch {
      // ignore
    }
  },
};
