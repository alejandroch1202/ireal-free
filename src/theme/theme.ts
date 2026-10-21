export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  background: string;
  cardBackground: string;
  topBarBackground: string;
  topBarBorder: string;
  textPrimary: string;
  textSecondary: string;
  gridBorder: string;
  rowBorder: string;
  barline: string;
  barlineAccent: string;
  thickBarline: string;
  chordRoot: string;
  chordQuality: string;
  chordBass: string;
  sectionBadgeBg: string;
  sectionBadgeText: string;
  sectionBoxBg: string;
  sectionBoxBorder: string;
  sectionBoxText: string;
  timeSigBg: string;
  timeSigBorder: string;
  timeSigText: string;
  annotationColor: string;
  modalOverlay: string;
  modalCard: string;
  modalBorder: string;
  btnBg: string;
  btnBorder: string;
  btnText: string;
  activeKeyBg: string;
  activeKeyText: string;
  repeatSymbolColor: string;
}

export const darkTheme: ThemeColors = {
  mode: 'dark',
  background: '#151e25',
  cardBackground: '#1b2730',
  topBarBackground: '#16212a',
  topBarBorder: '#283948',
  textPrimary: '#f4f3ee',
  textSecondary: '#7f91a1',
  gridBorder: '#364c5e',
  rowBorder: '#283948',
  barline: '#4f6376',
  barlineAccent: '#cbd5e1',
  thickBarline: '#e6e3da',
  chordRoot: '#f4f3ee',
  chordQuality: '#f4f3ee',
  chordBass: '#38bdf8',
  sectionBadgeBg: '#e5a93b',
  sectionBadgeText: '#0f172a',
  sectionBoxBg: '#1f2e3b',
  sectionBoxBorder: '#e6e3da',
  sectionBoxText: '#e6e3da',
  timeSigBg: '#243442',
  timeSigBorder: '#4daafc',
  timeSigText: '#4daafc',
  annotationColor: '#e5a93b',
  modalOverlay: 'rgba(10, 15, 20, 0.82)',
  modalCard: '#243442',
  modalBorder: '#374b5c',
  btnBg: '#22313e',
  btnBorder: '#34495c',
  btnText: '#e6e3da',
  activeKeyBg: '#4daafc',
  activeKeyText: '#0f172a',
  repeatSymbolColor: '#cbd5e1',
};

export const lightTheme: ThemeColors = {
  mode: 'light',
  background: '#f1f5f9',
  cardBackground: '#ffffff',
  topBarBackground: '#ffffff',
  topBarBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  gridBorder: '#cbd5e1',
  rowBorder: '#e2e8f0',
  barline: '#94a3b8',
  barlineAccent: '#475569',
  thickBarline: '#0f172a',
  chordRoot: '#0f172a',
  chordQuality: '#0f172a',
  chordBass: '#0284c7',
  sectionBadgeBg: '#d97706',
  sectionBadgeText: '#ffffff',
  sectionBoxBg: '#ffffff',
  sectionBoxBorder: '#0f172a',
  sectionBoxText: '#0f172a',
  timeSigBg: '#f8fafc',
  timeSigBorder: '#0284c7',
  timeSigText: '#0284c7',
  annotationColor: '#b45309',
  modalOverlay: 'rgba(15, 23, 42, 0.65)',
  modalCard: '#ffffff',
  modalBorder: '#cbd5e1',
  btnBg: '#f8fafc',
  btnBorder: '#cbd5e1',
  btnText: '#0f172a',
  activeKeyBg: '#0284c7',
  activeKeyText: '#ffffff',
  repeatSymbolColor: '#334155',
};
