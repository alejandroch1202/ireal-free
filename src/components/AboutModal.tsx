import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ThemeColors } from '../theme/theme';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
}

export const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose, theme }) => {
  const isDark = theme.mode === 'dark';
  const descColor = isDark ? '#cbd5e1' : '#475569';
  const cardBg = isDark ? '#1a2632' : '#f8fafc';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const handleOpenWebsite = () => {
    Linking.openURL('https://alejandroch.com').catch((err) => {
      console.warn('Error al abrir alejandroch.com:', err);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.modalCard, borderColor: theme.modalBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.topBarBorder }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Acerca de la Aplicación
            </Text>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
              onPress={onClose}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* App Branding */}
            <View style={styles.brandSection}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: isDark ? '#1e293b' : '#e0f2fe', borderColor: '#0284c7' },
                ]}
              >
                <Feather name="music" size={28} color="#0284c7" />
              </View>

              <Text style={[styles.appName, { color: theme.textPrimary }]}>iReal Free</Text>

              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v1.0.1</Text>
              </View>

              <Text style={[styles.appTagline, { color: descColor }]}>
                Visor y reproductor de partituras lead sheet compatible con iReal Pro. Desarrollado con fines de práctica y aprendizaje.
              </Text>
            </View>

            {/* Developer item row (clean, standard item) */}
            <TouchableOpacity
              style={[styles.devRowItem, { backgroundColor: cardBg, borderColor }]}
              onPress={handleOpenWebsite}
              activeOpacity={0.7}
            >
              <Feather name="globe" size={18} color={theme.activeKeyBg || '#0284c7'} style={{ marginRight: 2 }} />
              <View style={styles.devRowTextCol}>
                <Text style={[styles.devRowTitle, { color: theme.textPrimary }]}>
                  Desarrollado por alejandroch.com
                </Text>
                <Text style={[styles.devRowSub, { color: descColor }]}>
                  Toca para visitar el sitio web
                </Text>
              </View>
              <Feather name="external-link" size={15} color="#0284c7" />
            </TouchableOpacity>

            {/* Key Features */}
            <View style={[styles.featuresCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.featuresTitle, { color: theme.textPrimary }]}>
                Características
              </Text>

              <View style={styles.featureItem}>
                <Feather name="file-text" size={16} color={isDark ? '#38bdf8' : '#0284c7'} style={styles.featureIcon} />
                <View style={styles.featureTextCol}>
                  <Text style={[styles.featureHeading, { color: theme.textPrimary }]}>
                    Compatibilidad Lead Sheet
                  </Text>
                  <Text style={[styles.featureDesc, { color: descColor }]}>
                    Abre y exporta archivos .html auténticos y enlaces irealb://
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Feather name="repeat" size={16} color={isDark ? '#38bdf8' : '#0284c7'} style={styles.featureIcon} />
                <View style={styles.featureTextCol}>
                  <Text style={[styles.featureHeading, { color: theme.textPrimary }]}>
                    Transposición en los 12 tonos
                  </Text>
                  <Text style={[styles.featureDesc, { color: descColor }]}>
                    Cambia la tonalidad armónica al instante sin alterar la canción original
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Feather name="clock" size={16} color={isDark ? '#38bdf8' : '#0284c7'} style={styles.featureIcon} />
                <View style={styles.featureTextCol}>
                  <Text style={[styles.featureHeading, { color: theme.textPrimary }]}>
                    Metrónomo Visual & Tap Tempo
                  </Text>
                  <Text style={[styles.featureDesc, { color: descColor }]}>
                    Pulsos sincronizados, vibración háptica y ajuste de tempo en vivo
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Feather name="shield" size={16} color={isDark ? '#38bdf8' : '#0284c7'} style={styles.featureIcon} />
                <View style={styles.featureTextCol}>
                  <Text style={[styles.featureHeading, { color: theme.textPrimary }]}>
                    100% Offline & Sin Anuncios
                  </Text>
                  <Text style={[styles.featureDesc, { color: descColor }]}>
                    Tus canciones se guardan permanentemente en tu dispositivo
                  </Text>
                </View>
              </View>
            </View>

            {/* Disclaimer */}
            <Text style={[styles.disclaimerText, { color: descColor }]}>
              iReal Free es un proyecto libre e independiente desarrollado con fines de práctica y aprendizaje. Sin fines comerciales. Compatible con formatos estándar de lead sheets.
            </Text>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Entendido</Text>
            </TouchableOpacity>

            <View style={{ height: 18 }} />
          </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 30,
  },
  appName: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  versionBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  appTagline: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  devRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  devRowIcon: {
    fontSize: 20,
  },
  devRowTextCol: {
    flex: 1,
  },
  devRowTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  devRowSub: {
    fontSize: 11,
    marginTop: 1,
  },
  devRowLink: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284c7',
  },
  featuresCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  featureIcon: {
    marginRight: 9,
    marginTop: 1,
  },
  featureTextCol: {
    flex: 1,
  },
  featureHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  featureDesc: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 15,
  },
  disclaimerText: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dismissBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
