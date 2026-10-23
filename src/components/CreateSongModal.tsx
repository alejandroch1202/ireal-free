import React, { useState } from 'react';
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

interface CreateSongModalProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onCreate: (songData: {
    title: string;
    composer: string;
    key: string;
    timeSignature: string;
    style: string;
    tempo: number;
    template: 'blank' | 'basic' | 'complete';
  }) => void;
}

const COMMON_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const COMMON_TIME_SIGS = ['4/4', '3/4', '6/8', '2/4'];
const TEMPLATE_OPTIONS: Array<{
  id: 'blank' | 'basic' | 'complete';
  label: string;
  desc: string;
}> = [
  { id: 'blank', label: 'En blanco', desc: '4 compases' },
  { id: 'basic', label: 'Básica', desc: 'Intro + Verso' },
  { id: 'complete', label: 'Completa', desc: 'Intro, Verso, Coro, Puente' },
];

export const CreateSongModal: React.FC<CreateSongModalProps> = ({
  visible,
  theme,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [key, setKey] = useState('C');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [style, setStyle] = useState('Pop-Rock');
  const [tempo, setTempo] = useState('120');
  const [template, setTemplate] = useState<'blank' | 'basic' | 'complete'>('basic');

  const handleCreate = () => {
    const cleanTitle = title.trim() || 'Nueva Canción';
    const cleanComposer = composer.trim() || 'Compositor';
    const parsedTempo = parseInt(tempo, 10) || 120;

    onCreate({
      title: cleanTitle,
      composer: cleanComposer,
      key,
      timeSignature,
      style,
      tempo: Math.max(30, Math.min(300, parsedTempo)),
      template,
    });

    // Reset inputs
    setTitle('');
    setComposer('');
    setKey('C');
    setTimeSignature('4/4');
    setStyle('Pop-Rock');
    setTempo('120');
    setTemplate('basic');
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
                name="file-plus"
                size={19}
                color={theme.activeKeyBg || '#0284c7'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Crear Nueva Canción
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Título de la canción:
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
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Gracia Sublime, Cuan Grande Es..."
              placeholderTextColor={theme.textSecondary}
              autoFocus={true}
            />

            {/* Composer */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Artista o Compositor:
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
              value={composer}
              onChangeText={setComposer}
              placeholder="Ej. Bethel Music, En Espiritu Y En Verdad..."
              placeholderTextColor={theme.textSecondary}
            />

            {/* Key Selector */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Tonalidad original:
            </Text>
            <View style={styles.chipsWrap}>
              {COMMON_KEYS.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        key === k
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBg,
                      borderColor: theme.btnBorder,
                    },
                  ]}
                  onPress={() => setKey(k)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          key === k
                            ? theme.activeKeyText || '#ffffff'
                            : theme.textPrimary,
                      },
                    ]}
                  >
                    {k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Signature */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 10 }]}>
              Compás (Métrica):
            </Text>
            <View style={styles.chipsWrap}>
              {COMMON_TIME_SIGS.map((ts) => (
                <TouchableOpacity
                  key={ts}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        timeSignature === ts
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBg,
                      borderColor: theme.btnBorder,
                    },
                  ]}
                  onPress={() => setTimeSignature(ts)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          timeSignature === ts
                            ? theme.activeKeyText || '#ffffff'
                            : theme.textPrimary,
                      },
                    ]}
                  >
                    {ts}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Style & Tempo Row */}
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Estilo:
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
                  value={style}
                  onChangeText={setStyle}
                  placeholder="Pop-Rock"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Tempo (BPM):
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.btnBorder,
                      color: theme.textPrimary,
                      textAlign: 'center',
                    },
                  ]}
                  value={tempo}
                  onChangeText={setTempo}
                  keyboardType="numeric"
                  placeholder="120"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            {/* Initial Structure Template */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 4 }]}>
              Estructura inicial:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {TEMPLATE_OPTIONS.map((tpl) => {
                const active = template === tpl.id;
                return (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[
                      styles.chip,
                      {
                        flex: 1,
                        paddingVertical: 8,
                        backgroundColor: active
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBg,
                        borderColor: active
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBorder,
                      },
                    ]}
                    onPress={() => setTemplate(tpl.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? theme.activeKeyText || '#ffffff'
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {tpl.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        textAlign: 'center',
                        color: active
                          ? (theme.activeKeyText || '#ffffff') + 'dd'
                          : theme.textSecondary,
                      }}
                    >
                      {tpl.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginBottom: 6 }}>
              Tip: Al abrirse en Modo Edición podrás añadir o borrar compases y secciones libremente.
            </Text>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.topBarBorder }]}>
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
                styles.createBtn,
                { backgroundColor: theme.activeKeyBg || '#0284c7' },
              ]}
              onPress={handleCreate}
              activeOpacity={0.8}
            >
              <Feather
                name="plus-circle"
                size={16}
                color={theme.activeKeyText || '#ffffff'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.createBtnText,
                  { color: theme.activeKeyText || '#ffffff' },
                ]}
              >
                Crear y Editar
              </Text>
            </TouchableOpacity>
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
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
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
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
