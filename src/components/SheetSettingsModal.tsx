import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Linking,
  ToastAndroid,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { STANDARD_KEYS, getKeyRoot, PITCH_MAP } from '../core/transposer';
import { AboutModal } from './AboutModal';
import type { SongAST } from '../types/ireal';
import type { ThemeColors, ThemeMode } from '../theme/theme';

interface SheetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  song: SongAST;
  originalKey: string;
  fontScale: number;
  theme: ThemeColors;
  themeMode: ThemeMode;
  showMetronome: boolean;
  keepScreenAwake: boolean;
  onSelectKey: (key: string) => void;
  onTransposeStep: (step: number) => void;
  onResetKey: () => void;
  onSetFontScale: (scale: number) => void;
  onToggleTheme: () => void;
  onToggleMetronome: () => void;
  onToggleKeepAwake: () => void;
  onToggleFullScreen: () => void;
  onShareSong: () => void;
  onOpenPlaylists: () => void;
  onOpenImport: () => void;
  onDeleteCurrentSong?: () => void;
  onOpenEditSong?: () => void;
}

const FONT_PRESETS = [
  { label: 'A⁻⁻ Mini', scale: 0.65, desc: '65%' },
  { label: 'A⁻ Compacto', scale: 0.80, desc: '80%' },
  { label: 'A Normal', scale: 1.0, desc: '100%' },
  { label: 'A⁺ Grande', scale: 1.15, desc: '115%' },
  { label: 'A⁺⁺ Extra', scale: 1.30, desc: '130%' },
];

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  visible,
  onClose,
  song,
  originalKey,
  fontScale,
  theme,
  themeMode,
  showMetronome,
  keepScreenAwake,
  onSelectKey,
  onTransposeStep,
  onResetKey,
  onSetFontScale,
  onToggleTheme,
  onToggleMetronome,
  onToggleKeepAwake,
  onToggleFullScreen,
  onShareSong,
  onOpenPlaylists,
  onOpenImport,
  onDeleteCurrentSong,
  onOpenEditSong,
}) => {
  const isTransposed = song.transposeAmount !== 0;
  const currentRoot = getKeyRoot(song.currentKey);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const descColor = theme.mode === 'dark' ? '#cbd5e1' : '#475569';

  const handleConfirmDelete = () => {
    if (!onDeleteCurrentSong || song.title === 'Sin Canciones') return;
    const songTitle = song.title;

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `¿Estás seguro de que deseas eliminar permanentemente "${songTitle}" de tu repertorio?`
        )
      ) {
        onClose();
        onDeleteCurrentSong();
      }
    } else {
      Alert.alert(
        '¿Eliminar canción?',
        `¿Estás seguro de que deseas eliminar permanentemente "${songTitle}" de tu repertorio?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              onClose();
              onDeleteCurrentSong();
            },
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.modalCard, borderColor: theme.modalBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.rowBorder }]}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                Configuración
              </Text>
              <Text style={[styles.headerSubtitle, { color: descColor }]}>
                {song.title} • {song.composer || 'iReal Pro'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={17} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Tonalidad & Transporte */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Tonalidad
                </Text>
                <View style={styles.keyInfoPill}>
                  <Text style={[styles.keyInfoText, { color: theme.activeKeyBg }]}>
                    {song.currentKey}
                  </Text>
                  {isTransposed && (
                    <Text style={styles.keyDeltaText}>
                      ({song.transposeAmount > 0 ? `+${song.transposeAmount}` : song.transposeAmount} st)
                    </Text>
                  )}
                </View>
              </View>

              {/* Step buttons */}
              <View style={styles.keyStepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => onTransposeStep(-1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperBtnText, { color: theme.btnText }]}>-1 semitono</Text>
                </TouchableOpacity>

                {isTransposed ? (
                  <TouchableOpacity
                    style={[styles.resetKeyBtn, { borderColor: '#e5a93b' }]}
                    onPress={onResetKey}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetKeyText}>Restablecer ({originalKey})</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.origKeyBadge}>
                    <Text style={[styles.origKeyBadgeText, { color: descColor }]}>
                      Original
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => onTransposeStep(1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperBtnText, { color: theme.btnText }]}>+1 semitono</Text>
                </TouchableOpacity>
              </View>

              {/* 12 Keys Grid */}
              <View style={styles.keysGrid}>
                {STANDARD_KEYS.map((k) => {
                  const isSelected = PITCH_MAP[currentRoot] !== undefined && PITCH_MAP[currentRoot] === PITCH_MAP[k];
                  const isOrig = PITCH_MAP[getKeyRoot(originalKey)] !== undefined && PITCH_MAP[getKeyRoot(originalKey)] === PITCH_MAP[k];

                  return (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.keyGridItem,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                        isSelected && {
                          backgroundColor: theme.activeKeyBg,
                          borderColor: theme.activeKeyBg,
                        },
                        isOrig && !isSelected && styles.keyOrigBorder,
                      ]}
                      onPress={() => onSelectKey(k)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.keyGridItemText,
                          { color: theme.btnText },
                          isSelected && { color: theme.activeKeyText, fontWeight: '900' },
                        ]}
                      >
                        {k}
                      </Text>
                      {isOrig && <View style={styles.origKeyDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Botón para editar tono original y metadatos */}
              {onOpenEditSong && (
                <TouchableOpacity
                  style={[
                    styles.editSongInfoBtn,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                  ]}
                  onPress={() => {
                    onClose();
                    onOpenEditSong();
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={14} color={theme.textPrimary} />
                  <Text style={[styles.editSongInfoText, { color: theme.textPrimary }]}>
                    Editar Datos de la Canción
                  </Text>
                </TouchableOpacity>
              )}

              {/* Botón e indicación para editar acordes */}
              <TouchableOpacity
                style={[
                  styles.editSongInfoBtn,
                  { backgroundColor: theme.btnBg, borderColor: theme.btnBorder, marginTop: 8 },
                ]}
                onPress={() => {
                  onClose();
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Toca cualquier compás en la partitura para editar sus acordes', ToastAndroid.LONG);
                  } else {
                    Alert.alert('Editar Acordes', 'Toca directamente cualquier compás o acorde en la partitura para modificarlo, sustituirlo o añadir nuevos acordes.');
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather name="music" size={14} color={theme.activeKeyBg || '#0284c7'} />
                <Text style={[styles.editSongInfoText, { color: theme.textPrimary }]}>
                  Editar Acordes (Toca un compás)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Tamaño de Letra y Partitura */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Fuente
                </Text>
                <View style={styles.scaleStepperContainer}>
                  <TouchableOpacity
                    style={[styles.scaleStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                    onPress={() => onSetFontScale(Math.max(0.55, Math.round((fontScale - 0.05) * 100) / 100))}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="minus" size={13} color={theme.btnText} />
                  </TouchableOpacity>
                  <Text style={[styles.scaleValueText, { color: theme.activeKeyBg }]}>
                    {Math.round(fontScale * 100)}%
                  </Text>
                  <TouchableOpacity
                    style={[styles.scaleStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                    onPress={() => onSetFontScale(Math.min(1.40, Math.round((fontScale + 0.05) * 100) / 100))}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="plus" size={13} color={theme.btnText} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.presetsRow}>
                {FONT_PRESETS.map((p) => {
                  const isSelected = Math.abs(p.scale - fontScale) < 0.05;

                  return (
                    <TouchableOpacity
                      key={p.scale}
                      style={[
                        styles.presetBtn,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                        isSelected && {
                          backgroundColor: theme.activeKeyBg,
                          borderColor: theme.activeKeyBg,
                        },
                      ]}
                      onPress={() => onSetFontScale(p.scale)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          { color: theme.btnText },
                          isSelected && { color: theme.activeKeyText, fontWeight: '900' },
                        ]}
                      >
                        {p.label}
                      </Text>
                      <Text
                        style={[
                          styles.presetDesc,
                          {
                            color: isSelected
                              ? (theme.mode === 'dark' ? '#0f172a' : '#ffffff')
                              : (theme.mode === 'dark' ? '#cbd5e1' : '#475569'),
                          },
                        ]}
                      >
                        {p.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Apariencia & Tema */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Apariencia
              </Text>
              <View style={styles.themeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    themeMode === 'light' && styles.themeOptionActive,
                  ]}
                  onPress={() => {
                    if (themeMode !== 'light') onToggleTheme();
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="sun"
                    size={16}
                    color={themeMode === 'light' ? '#0284c7' : theme.textPrimary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeMode === 'light' ? '#0284c7' : theme.textPrimary },
                    ]}
                  >
                    Modo Claro
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    themeMode === 'dark' && styles.themeOptionActive,
                  ]}
                  onPress={() => {
                    if (themeMode !== 'dark') onToggleTheme();
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="moon"
                    size={16}
                    color={themeMode === 'dark' ? '#0284c7' : theme.textPrimary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeMode === 'dark' ? '#0284c7' : theme.textPrimary },
                    ]}
                  >
                    Modo Oscuro
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Ensayos en Vivo & Rendimiento */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Opciones
              </Text>

              {/* Keep Screen Awake Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleRowCard,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: keepScreenAwake ? '#0284c7' : theme.btnBorder,
                    marginTop: 6,
                  },
                ]}
                onPress={onToggleKeepAwake}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.optionRowTitle, { color: theme.textPrimary }]}>
                    Pantalla Siempre Activa
                  </Text>
                  <Text style={[styles.optionRowDesc, { color: descColor }]}>
                    Evita que el teléfono se apague mientras tocas
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: keepScreenAwake ? '#0284c7' : (theme.mode === 'dark' ? '#1a2632' : '#e2e8f0'),
                      borderColor: keepScreenAwake ? '#38bdf8' : theme.btnBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleSwitchText,
                      { color: keepScreenAwake ? '#ffffff' : (theme.mode === 'dark' ? '#94a3b8' : '#64748b') },
                    ]}
                  >
                    {keepScreenAwake ? 'ACTIVADA' : 'DESACTIVADA'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Metronome Bar Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleRowCard,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: showMetronome ? '#0284c7' : theme.btnBorder,
                    marginTop: 8,
                  },
                ]}
                onPress={onToggleMetronome}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.optionRowTitle, { color: theme.textPrimary }]}>
                    Barra de Metrónomo
                  </Text>
                  <Text style={[styles.optionRowDesc, { color: descColor }]}>
                    Muestra u oculta la barra inferior de pulsos
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: showMetronome ? '#0284c7' : (theme.mode === 'dark' ? '#1a2632' : '#e2e8f0'),
                      borderColor: showMetronome ? '#38bdf8' : theme.btnBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleSwitchText,
                      { color: showMetronome ? '#ffffff' : (theme.mode === 'dark' ? '#94a3b8' : '#64748b') },
                    ]}
                  >
                    {showMetronome ? 'ACTIVADA' : 'DESACTIVADA'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Full Screen Mode Button */}
              <TouchableOpacity
                style={[
                  styles.actionRowBtn,
                  { backgroundColor: theme.btnBg, borderColor: theme.btnBorder, marginTop: 8 },
                ]}
                onPress={() => {
                  onClose();
                  onToggleFullScreen();
                }}
                activeOpacity={0.7}
              >
                <Feather name="maximize-2" size={17} color={theme.textPrimary} />
                <View style={styles.actionRowTextCol}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                    Modo Pantalla Completa
                  </Text>
                  <Text style={[styles.actionRowDesc, { color: descColor }]}>
                    Oculta barras para optimizar el espacio
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 5. Compartir, Biblioteca & Archivos */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Biblioteca
              </Text>
              <View style={styles.actionButtonsCol}>
                {/* Share Song */}
                {song.title !== 'Sin Canciones' && (
                  <TouchableOpacity
                    style={[styles.actionRowBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                    onPress={() => {
                      onClose();
                      onShareSong();
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="share-2" size={17} color={theme.textPrimary} />
                    <View style={styles.actionRowTextCol}>
                      <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                        Compartir / Exportar .html
                      </Text>
                      <Text style={[styles.actionRowDesc, { color: descColor }]}>
                        Exporta el archivo .html para iReal Pro, WhatsApp o Archivos
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}

                {/* Playlists & Songs */}
                <TouchableOpacity
                  style={[styles.actionRowBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => {
                    onClose();
                    onOpenPlaylists();
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="list" size={17} color={theme.textPrimary} />
                  <View style={styles.actionRowTextCol}>
                    <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                      Repertorio & Listas de Canciones
                    </Text>
                    <Text style={[styles.actionRowDesc, { color: descColor }]}>
                      Gestiona tus canciones y sets en vivo
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Import Song */}
                <TouchableOpacity
                  style={[styles.actionRowBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => {
                    onClose();
                    onOpenImport();
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="folder" size={17} color={theme.textPrimary} />
                  <View style={styles.actionRowTextCol}>
                    <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                      Importar Canción / Archivo .html
                    </Text>
                    <Text style={[styles.actionRowDesc, { color: descColor }]}>
                      Abre archivos iReal Pro o pega enlaces irealb://
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Delete Current Song */}
                {onDeleteCurrentSong && song.title !== 'Sin Canciones' && (
                  <TouchableOpacity
                    style={[
                      styles.actionRowBtn,
                      {
                        backgroundColor:
                          theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                        borderColor:
                          theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5',
                        marginTop: 6,
                      },
                    ]}
                    onPress={handleConfirmDelete}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={17} color="#ef4444" />
                    <View style={styles.actionRowTextCol}>
                      <Text style={[styles.actionRowTitle, { color: '#ef4444' }]}>
                        Eliminar Canción del Repertorio
                      </Text>
                      <Text
                        style={[
                          styles.actionRowDesc,
                          { color: theme.mode === 'dark' ? '#fca5a5' : '#b91c1c' },
                        ]}
                      >
                        Elimina permanentemente "{song.title}" de tu memoria
                      </Text>
                    </View>
                    <Feather name="x" size={17} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 6. Información & Desarrollador */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Información de la Aplicación
              </Text>
              <TouchableOpacity
                style={[
                  styles.actionRowBtn,
                  { backgroundColor: theme.btnBg, borderColor: theme.btnBorder, marginTop: 6 },
                ]}
                onPress={() => setShowAboutModal(true)}
                activeOpacity={0.7}
              >
                <Feather name="info" size={17} color={theme.textPrimary} />
                <View style={styles.actionRowTextCol}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                    Acerca de iReal Free
                  </Text>
                  <Text style={[styles.actionRowDesc, { color: descColor }]}>
                    Versión 1.0.0 • Desarrollado por alejandroch.com
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Text style={[styles.modalFooterText, { color: descColor }]}>
                iReal Free v1.0.0
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => Linking.openURL('https://alejandroch.com').catch(() => {})}
                activeOpacity={0.7}
              >
                <Text style={styles.modalFooterLink}>
                  Desarrollado por alejandroch.com
                </Text>
                <Feather name="external-link" size={12} color="#0284c7" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* About Modal Dialog */}
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        theme={theme}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  keyInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyInfoText: {
    fontSize: 16,
    fontWeight: '900',
  },
  keyDeltaText: {
    fontSize: 11,
    color: '#e5a93b',
    fontWeight: '700',
  },
  keyStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  stepperBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  resetKeyBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetKeyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e5a93b',
  },
  origKeyBadge: {
    paddingHorizontal: 8,
  },
  origKeyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  keysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  keyGridItem: {
    width: '15%',
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  keyGridItemText: {
    fontSize: 12,
    fontWeight: '800',
  },
  keyOrigBorder: {
    borderColor: '#e5a93b',
  },
  origKeyDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#e5a93b',
  },
  editSongInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  editSongInfoIcon: {
    fontSize: 14,
  },
  editSongInfoText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  scaleStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scaleStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleStepBtnText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  scaleValueText: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  presetDesc: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  themeOptionActive: {
    borderColor: '#0284c7',
  },
  themeOptionIcon: {
    fontSize: 16,
  },
  themeOptionText: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  toggleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleSwitch: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleSwitchText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  optionRowTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionRowDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  actionButtonsCol: {
    gap: 8,
    marginTop: 8,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  actionRowIcon: {
    fontSize: 18,
  },
  actionRowTextCol: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionRowDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  chevronIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalFooter: {
    marginTop: 14,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
    gap: 4,
  },
  modalFooterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalFooterLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
});
