import { useColorScheme } from '@/hooks/use-color-scheme';

// North Via Marketing colors: brand blue #274290, orange #f27921.

const light = {
  bg: '#F4F5F8',
  card: '#FFFFFF',
  text: '#11131A',
  muted: '#5E6472',
  border: '#E3E5EB',
  brand: '#274290',
  brandSoft: '#E6EBF7',
  accent: '#F27921',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  warn: '#B26A00',
  warnSoft: '#FFF4E0',
  ok: '#1B7F45',
  okSoft: '#E5F5EC',
  onBrand: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#0E1016',
  card: '#181B24',
  text: '#F1F3F8',
  muted: '#A0A6B5',
  border: '#2A2F3B',
  brand: '#7D9BEA',
  brandSoft: '#1D2640',
  accent: '#F58C3F',
  danger: '#F07070',
  dangerSoft: '#3A1D1F',
  warn: '#F0B04A',
  warnSoft: '#3A2D14',
  ok: '#5CC98A',
  okSoft: '#16301F',
  onBrand: '#0E1016',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
