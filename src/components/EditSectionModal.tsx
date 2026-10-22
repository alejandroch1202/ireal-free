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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ThemeColors } from '../theme/theme';

interface EditSectionModalProps {
  visible: boolean;
  theme: ThemeColors;
  fontScale?: number;
  initialLabel: string;
  rowIndex: number;
  onClose: () => void;
  onSave: (rowIndex: number, newLabel: string) => Promise<void> | void;
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

export const EditSectionModal: React.FC<EditSectionModalProps> = ({
  visible,
  theme,
  fontScale = 1.0,
  initialLabel,
  rowIndex,
  onClose,
  onSave,
}) => {
  const [sectionText, setSectionText] = useState(initialLabel);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSectionText(initialLabel || '');
      setIsSaving(false);
    }
  }, [visible, initialLabel]);

  const handleSelectPreset = (preset: string) => {
    setSectionText(preset);
  };

  const handleClear = () => {
    setSectionText('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(rowIndex, sectionText.trim());
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
                <Feather name="bookmark" size={18} color={theme.activeKeyBg || '#0284c7'} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Editar Sección
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Personaliza el nombre de esta parte de la canción
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
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
                      { backgroundColor: (theme.activeKeyBg || '#0284c7') + '18', borderColor: theme.activeKeyBg || '#0284c7' },
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

                {/* Option to clear section label completely */}
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
                    name="trash-2"
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
                    Quitar sección
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.modalBorder }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
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
              <Feather name="check" size={17} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Guardar Sección</Text>
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
    maxHeight: '85%',
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
    marginBottom: 16,
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
    marginBottom: 16,
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
