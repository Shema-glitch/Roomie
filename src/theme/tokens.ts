/**
 * Roomie Design Tokens
 * Source of truth based on Roomie Design and Branding Doc v1 (Section 10)
 */

export const THEME = {
  colors: {
    primary: '#FF6B4A',
    primaryDark: '#D94E30',
    onPrimary: '#1F2033',
    primaryLight: '#FFF0ED',

    secondary: '#0B7A6E',
    secondaryDark: '#075950',
    secondaryText: '#0B6B5F',
    secondaryLight: '#E6FAF8',

    reward: '#FFC93C',
    rewardDark: '#DDA821',
    warningText: '#9A6700',
    rewardLight: '#FFF8E6',

    info: '#3B4BC4',
    infoDark: '#2D3BA3',
    infoLight: '#EEF0FD',

    success: '#0F7A3D',
    successDark: '#0A5C2D',
    successLight: '#EBF9F0',

    error: '#B42318',
    errorDark: '#8E1B12',
    errorLight: '#FEF2F2',

    ink: '#1F2033',
    muted: '#4B5063',
    line: '#E6E8EE',
    bg: '#F7F8FB',
    surface: '#FFFFFF',
  },
  
  fonts: {
    heading: "'Baloo 2', 'Nunito', cursive, sans-serif",
    body: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  
  radii: {
    btn: '16px',
    card: '20px',
    chip: '9999px',
    modal: '24px',
  },
  
  shadows: {
    soft: '0 4px 20px -2px rgba(31, 36, 48, 0.06)',
    card: '0 2px 8px -1px rgba(31, 36, 48, 0.05), 0 1px 3px -1px rgba(31, 36, 48, 0.03)',
    float: '0 12px 32px -4px rgba(31, 36, 48, 0.12)',
    btnPrimary: '0 4px 0 #D94E30',
    btnSecondary: '0 4px 0 #138E82',
    btnReward: '0 4px 0 #DDA821',
    btnOutline: '0 4px 0 #E6E8EE',
    btnDanger: '0 4px 0 #BF3337',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    touchMin: '44px',
  }
} as const;

export const TYPOGRAPHY = {
  bigNumber: 'font-heading font-bold text-[32px] leading-tight text-[#1F2430]',
  title: 'font-heading font-bold text-[24px] leading-tight text-[#1F2430]',
  sectionHeading: 'font-heading font-bold text-[18px] leading-snug text-[#1F2430]',
  cardTitle: 'font-heading font-semibold text-[16px] leading-snug text-[#1F2430]',
  body: 'font-sans font-normal text-[16px] leading-normal text-[#1F2430]',
  secondary: 'font-sans font-normal text-[14px] leading-normal text-[#475569]',
  label: 'font-sans font-semibold text-[14px] uppercase tracking-wider text-[#475569]',
} as const;

export type TypographyRole = keyof typeof TYPOGRAPHY;
export type ThemeColors = typeof THEME.colors;
