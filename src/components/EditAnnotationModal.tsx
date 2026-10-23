import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeColors } from '../theme/theme';

interface EditAnnotationModalProps {
  visible: boolean;
  theme: ThemeColors;
  annotationText: string;
  onClose: () => void;
  onSave: (newText: string) => void;
  onDelete: () => void;
}

const PRESET_ANNOTATIONS = [
  'Fine',
  'Al Intro',
  'Al Coda',
  'D.S.',
  'D.S. al Coda',
  'D.C.',
  '2x',
  '3x',
  '4x',
  '(Solo Batería)',
  '(Full banda)',
  '(Suave)',
  '(Corte)',
];

export const EditAnnotationModal: React.FC<EditAnnotationModalProps> = ({
  visible,
  theme,
  annotationText,
  onClose,
  onSave,
  onDelete,
}) => {
  const [text, setText] = useState(annotationText);

  useEffect(() => {
    setText(annotationText);
  }, [annotationText, visible]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onDelete();
    } else {
      onSave(trimmed);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.modalCard,
              borderColor: theme.modalBorder,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.topBarBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="message-square"
                size={18}
                color={theme.activeKeyBg || '#0284c7'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {annotationText ? 'Editar Anotación' : 'Añadir Anotación'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Texto de la anotación o indicación:
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.btnBorder,
                  color: theme.textPrimary,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Ej. Fine, Al Intro, (Solo Batería)..."
              placeholderTextColor={theme.textSecondary}
              autoFocus={true}
              selectTextOnFocus={true}
            />

            {/* Quick Presets */}
            <Text style={[styles.presetsTitle, { color: theme.textSecondary }]}>
              Sugerencias rápidas:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsContainer}
            >
              {PRESET_ANNOTATIONS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor:
                        text === preset
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBg,
                      borderColor: theme.btnBorder,
                    },
                  ]}
                  onPress={() => setText(preset)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        color:
                          text === preset
                            ? theme.activeKeyText || '#ffffff'
                            : theme.textPrimary,
                      },
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.topBarBorder }]}>
            {annotationText ? (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: '#ef44441a', borderColor: '#ef4444' }]}
                onPress={onDelete}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={15} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.deleteBtnText}>Quitar</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: theme.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.activeKeyBg || '#0284c7' },
                ]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Feather
                  name="check"
                  size={15}
                  color={theme.activeKeyText || '#ffffff'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: theme.activeKeyText || '#ffffff' },
                  ]}
                >
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    padding: 18,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
