import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ThemeColors } from '../theme/theme';

interface ErrorBoundaryProps {
  theme: ThemeColors;
  onResetToLibrary?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.warn('ErrorBoundary capturó un error de renderizado:', error, info.componentStack);
  }

  handleRecover = (): void => {
    this.setState({ hasError: false, errorMessage: '' }, () => {
      this.props.onResetToLibrary?.();
    });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { theme } = this.props;
    const accentColor = theme.activeKeyBg || '#0284c7';

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.modalBorder,
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Feather name="alert-triangle" size={28} color="#f59e0b" />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            No se pudo mostrar esta vista
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Ocurrió un problema inesperado al dibujar la partitura. Tus canciones y listas siguen a salvo en tu biblioteca.
          </Text>

          {Boolean(this.state.errorMessage) && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.btnBg,
                  borderColor: theme.btnBorder,
                },
              ]}
            >
              <Text
                style={[styles.errorDetail, { color: theme.textSecondary }]}
                numberOfLines={3}
              >
                {this.state.errorMessage}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.recoverBtn, { backgroundColor: accentColor }]}
            onPress={this.handleRecover}
            activeOpacity={0.8}
            accessibilityLabel="Volver al repertorio"
          >
            <Feather
              name="list"
              size={16}
              color={theme.activeKeyText || '#ffffff'}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.recoverBtnText,
                { color: theme.activeKeyText || '#ffffff' },
              ]}
            >
              Volver al Repertorio
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBox: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 18,
  },
  errorDetail: {
    fontSize: 11,
    textAlign: 'center',
  },
  recoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  recoverBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
