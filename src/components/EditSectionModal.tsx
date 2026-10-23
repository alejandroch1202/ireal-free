import React, { useState, useEffect } from 'react';
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
import type { ThemeColors } from '../theme/theme';

interface EditSectionModalProps {
  visible: boolean;
  mode?: 'edit' | 'add';
  theme: ThemeColors;
  fontScale?: number;
  initialLabel: string;
  rowIndex: number;
  canDeleteSection?: boolean;
  onClose: () => void;
  onSave: (rowIndex: number, newLabel: string) => Promise<void> | void;
  onAddSection?: (label: string, barCount: number, withRepeat: boolean) => Promise<void> | void;
  onDuplicateSection?: (
    rowIndex: number,
    placement: 'after' | 'end',
    customLabel?: string
  ) => Promise<void> | void;
  onDeleteSection?: (rowIndex: number) => Promise<void> | void;
}

const SECTION_PRESETS = [
  'Intro',
  'Verso',
  'Verso 1',
  'Verso 2',
  'Pre-Coro',
  'Coro',
  'Coro Final',
  'Puente',
  'Solo',
  'Instrumental',
  'Final',
  'Outro',
];

const BAR_COUNT_OPTIONS = [2, 4, 8, 12, 16];

export const EditSectionModal: React.FC<EditSectionModalProps> = ({
  visible,
  mode = 'edit',
  theme,
  initialLabel,
  rowIndex,
  canDeleteSection = true,
  onClose,
  onSave,
  onAddSection,
  onDuplicateSection,
  onDeleteSection,
}) => {
  const [sectionText, setSectionText] = useState(initialLabel);
  const [barCount, setBarCount] = useState<number>(4);
  const [withRepeat, setWithRepeat] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSectionText(mode === 'add' ? initialLabel || 'Coro' : initialLabel || '');
      setBarCount(4);
      setWithRepeat(false);
      setIsSaving(false);
    }
  }, [visible, initialLabel, mode]);

  const handleSelectPreset = (preset: string) => {
    setSectionText(preset);
  };

  const handleClear = () => {
    setSectionText('');
  };

  const handleConfirmDeleteSection = () => {
    if (!onDeleteSection) return;
    const displayTitle = sectionText.trim() || initialLabel || 'esta sección';
    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(`¿Eliminar "${displayTitle}" y todos sus compases?`);
      if (ok) {
        onDeleteSection(rowIndex);
        onClose();
      }
      return;
    }
    Alert.alert(
      'Eliminar sección',
      `¿Seguro que deseas eliminar "${displayTitle}" junto con todos sus compases?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDeleteSection(rowIndex);
            onClose();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (mode === 'add' && onAddSection) {
        await onAddSection(sectionText.trim() || 'Sección', barCount, withRepeat);
      } else {
        await onSave(rowIndex, sectionText.trim());
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

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
          <View style={[styles.header, { borderBottomColor: theme.modalBorder }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconContainer,
                  { backgroundColor: (theme.activeKeyBg || '#0284c7') + '22' },
                ]}
              >
                <Feather
                  name={mode === 'add' ? 'plus-square' : 'bookmark'}
                  size={18}
                  color={theme.activeKeyBg || '#0284c7'}
                />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {mode === 'add' ? 'Nueva Sección' : 'Editar Sección'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {mode === 'add'
                    ? 'Agrega una nueva parte con sus compases al final'
                    : 'Personaliza o elimina esta parte de la canción'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de sección"
            >
              <Feather name="x" size={17} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentBody} showsVerticalScrollIndicator={false}>
            {/* Live Preview Badge */}
            <View
              style={[
                styles.previewCard,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
            >
              <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                VISTA PREVIA EN LA PARTITURA
              </Text>
              <View style={styles.previewBadgeRow}>
                {sectionText.trim().length > 0 ? (
                  <View
                    style={[
                      styles.sectionBadge,
                      {
                        backgroundColor: (theme.activeKeyBg || '#0284c7') + '18',
                        borderColor: theme.activeKeyBg || '#0284c7',
                      },
                    ]}
                  >
                    <Text style={[styles.sectionBadgeText, { color: theme.textPrimary }]}>
                      {sectionText.trim()}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.emptyPreviewText, { color: theme.textSecondary }]}>
                    (Sin encabezado de sección)
                  </Text>
                )}
              </View>
            </View>

            {/* Direct Text Input */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                NOMBRE DE LA SECCIÓN
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                ]}
              >
                <Feather
                  name="edit-2"
                  size={16}
                  color={theme.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={sectionText}
                  onChangeText={setSectionText}
                  placeholder="Ej: Intro Banda, Verso 1, Coro Final..."
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {sectionText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClear}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x-circle" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Quick Presets */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                SELECCIONAR PREAJUSTE
              </Text>
              <View style={styles.presetsGrid}>
                {SECTION_PRESETS.map((preset) => {
                  const isSelected = sectionText.trim().toLowerCase() === preset.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`preset-${preset}`}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBg,
                          borderColor: isSelected
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBorder,
                        },
                      ]}
                      onPress={() => handleSelectPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color: isSelected
                              ? theme.activeKeyText || '#ffffff'
                              : theme.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {mode === 'edit' && (
                  <TouchableOpacity
                    style={[
                      styles.presetChip,
                      styles.removeChip,
                      {
                        backgroundColor: sectionText.trim() === '' ? '#ef444422' : theme.btnBg,
                        borderColor: sectionText.trim() === '' ? '#ef4444' : theme.btnBorder,
                      },
                    ]}
                    onPress={handleClear}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="eye-off"
                      size={13}
                      color={sectionText.trim() === '' ? '#ef4444' : theme.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: sectionText.trim() === '' ? '#ef4444' : theme.textSecondary,
                          fontWeight: sectionText.trim() === '' ? '700' : '500',
                        },
                      ]}
                    >
                      Quitar solo título
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Add mode: Measure count & Repeat toggle */}
            {mode === 'add' && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  CANTIDAD INICIAL DE COMPASES
                </Text>
                <View style={styles.presetsGrid}>
                  {BAR_COUNT_OPTIONS.map((cnt) => {
                    const active = barCount === cnt;
                    return (
                      <TouchableOpacity
                        key={`cnt-${cnt}`}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: active
                              ? theme.activeKeyBg || '#0284c7'
                              : theme.btnBg,
                            borderColor: active
                              ? theme.activeKeyBg || '#0284c7'
                              : theme.btnBorder,
                            minWidth: 56,
                            alignItems: 'center',
                          },
                        ]}
                        onPress={() => setBarCount(cnt)}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            {
                              color: active
                                ? theme.activeKeyText || '#ffffff'
                                : theme.textPrimary,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {cnt} compases
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.repeatToggleRow,
                    {
                      backgroundColor: withRepeat
                        ? (theme.activeKeyBg || '#0284c7') + '18'
                        : theme.btnBg,
                      borderColor: withRepeat
                        ? theme.activeKeyBg || '#0284c7'
                        : theme.btnBorder,
                    },
                  ]}
                  onPress={() => setWithRepeat((p) => !p)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={withRepeat ? 'check-square' : 'square'}
                    size={16}
                    color={withRepeat ? theme.activeKeyBg || '#0284c7' : theme.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>
                    Envolver con barras de repetición ( ||:  :|| )
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Edit mode: Duplicate entire section */}
            {mode === 'edit' && onDuplicateSection && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  DUPLICAR SECCIÓN (CON SUS ACORDES)
                </Text>
                <View style={styles.duplicateBtnsRow}>
                  <TouchableOpacity
                    style={[
                      styles.duplicateSectionBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={async () => {
                      await onDuplicateSection(
                        rowIndex,
                        'after',
                        sectionText.trim() || initialLabel || undefined
                      );
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="copy"
                      size={14}
                      color={theme.activeKeyBg || '#0284c7'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.duplicateSectionBtnText, { color: theme.textPrimary }]}>
                      Duplicar debajo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.duplicateSectionBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={async () => {
                      await onDuplicateSection(
                        rowIndex,
                        'end',
                        sectionText.trim() || initialLabel || undefined
                      );
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="corner-right-down"
                      size={14}
                      color={theme.activeKeyBg || '#0284c7'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.duplicateSectionBtnText, { color: theme.textPrimary }]}>
                      Duplicar al final
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Edit mode: Delete entire section */}
            {mode === 'edit' && onDeleteSection && canDeleteSection && (
              <View style={[styles.sectionBlock, { marginTop: 4 }]}>
                <TouchableOpacity
                  style={[
                    styles.deleteSectionBtn,
                    { backgroundColor: '#ef444415', borderColor: '#ef444466' },
                  ]}
                  onPress={handleConfirmDeleteSection}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={15} color="#ef4444" style={{ marginRight: 7 }} />
                  <Text style={styles.deleteSectionBtnText}>
                    Eliminar toda esta sección (compases incluidos)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.modalBorder }]}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: theme.activeKeyBg || '#0284c7' },
                isSaving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Feather
                name={mode === 'add' ? 'plus' : 'check'}
                size={17}
                color="#ffffff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveBtnText}>
                {mode === 'add' ? 'Añadir Sección' : 'Guardar Sección'}
              </Text>
            </TouchableOpacity>
          </View>
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
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextGroup: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  contentBody: {
    padding: 16,
  },
  previewCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  previewLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  sectionBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyPreviewText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  sectionBlock: {
    marginBottom: 15,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12.5,
  },
  removeChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  deleteSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  duplicateBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  duplicateSectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  duplicateSectionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  deleteSectionBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
