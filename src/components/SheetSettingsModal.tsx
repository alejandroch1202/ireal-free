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
} from 'react-native';
import { STANDARD_KEYS, getKeyRoot } from '../core/transposer';
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
}

const FONT_PRESETS = [
  { label: 'A⁻ Compacto', scale: 0.85, desc: '85%' },
  { label: 'A Normal', scale: 1.0, desc: '100%' },
  { label: 'A⁺ Grande', scale: 1.18, desc: '118%' },
  { label: 'A⁺⁺ Extra', scale: 1.35, desc: '135%' },
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
                Opciones & Configuración
              </Text>
              <Text style={[styles.headerSubtitle, { color: descColor }]}>
                {song.title} • {song.composer || 'iReal Pro'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: theme.textPrimary }]}>✕</Text>
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
                      Tono original ({originalKey})
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
                  const isSelected = currentRoot === k;
                  const isOrig = getKeyRoot(originalKey) === k;

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
            </View>

            {/* 2. Tamaño de Letra y Partitura */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Tamaño de Acordes & Escala
                </Text>
                <Text style={[styles.scaleValueText, { color: theme.activeKeyBg }]}>
                  {Math.round(fontScale * 100)}%
                </Text>
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
                  <Text style={styles.themeOptionIcon}>☀️</Text>
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeMode === 'light' ? '#0284c7' : theme.textPrimary },
                    ]}
                  >
                    Modo Claro (Papel Blanco)
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
                  <Text style={styles.themeOptionIcon}>🌙</Text>
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeMode === 'dark' ? '#0284c7' : theme.textPrimary },
                    ]}
                  >
                    Modo Oscuro (Pizarra iReal)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Ensayos en Vivo & Rendimiento */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Ensayos en Vivo & Rendimiento
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
                <Text style={styles.actionRowIcon}>⛶</Text>
                <View style={styles.actionRowTextCol}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                    Modo Pantalla Completa
                  </Text>
                  <Text style={[styles.actionRowDesc, { color: descColor }]}>
                    Oculta barras para dar 100% de espacio a los acordes
                  </Text>
                </View>
                <Text style={[styles.chevronIcon, { color: theme.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Compartir, Biblioteca & Archivos */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Compartir & Biblioteca
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
                    <Text style={styles.actionRowIcon}>📤</Text>
                    <View style={styles.actionRowTextCol}>
                      <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                        Compartir / Exportar .html
                      </Text>
                      <Text style={[styles.actionRowDesc, { color: descColor }]}>
                        Exporta el archivo .html para iReal Pro, WhatsApp o Archivos
                      </Text>
                    </View>
                    <Text style={[styles.chevronIcon, { color: theme.textSecondary }]}>›</Text>
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
                  <Text style={styles.actionRowIcon}>📋</Text>
                  <View style={styles.actionRowTextCol}>
                    <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                      Repertorio & Listas de Canciones
                    </Text>
                    <Text style={[styles.actionRowDesc, { color: descColor }]}>
                      Gestiona tus canciones y sets en vivo
                    </Text>
                  </View>
                  <Text style={[styles.chevronIcon, { color: theme.textSecondary }]}>›</Text>
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
                  <Text style={styles.actionRowIcon}>📂</Text>
                  <View style={styles.actionRowTextCol}>
                    <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                      Importar Canción / Archivo .html
                    </Text>
                    <Text style={[styles.actionRowDesc, { color: descColor }]}>
                      Abre archivos iReal Pro o pega enlaces irealb://
                    </Text>
                  </View>
                  <Text style={[styles.chevronIcon, { color: theme.textSecondary }]}>›</Text>
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
                    <Text style={styles.actionRowIcon}>🗑️</Text>
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
                    <Text style={[styles.chevronIcon, { color: '#ef4444' }]}>✕</Text>
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
                <Text style={styles.actionRowIcon}>ℹ️</Text>
                <View style={styles.actionRowTextCol}>
                  <Text style={[styles.actionRowTitle, { color: theme.textPrimary }]}>
                    Acerca de iReal Free
                  </Text>
                  <Text style={[styles.actionRowDesc, { color: descColor }]}>
                    Versión 1.0.0 • Desarrollado por alejandroch.com
                  </Text>
                </View>
                <Text style={[styles.chevronIcon, { color: theme.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Text style={[styles.modalFooterText, { color: descColor }]}>
                iReal Free v1.0.0
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://alejandroch.com').catch(() => {})}
                activeOpacity={0.7}
              >
                <Text style={styles.modalFooterLink}>
                  Desarrollado por alejandroch.com ↗
                </Text>
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
    borderRadius: 16,
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
  scaleValueText: {
    fontSize: 13,
    fontWeight: '800',
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
