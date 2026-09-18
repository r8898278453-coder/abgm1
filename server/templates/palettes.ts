import { colord } from 'colord';
import { ContentType } from './types';

export interface ColorPalette {
  id: string;
  name: string;
  category: 'brand_derived' | 'seasonal' | 'modern';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  isSeasonal?: boolean;
  description?: string;
}

/**
 * Fixed Seasonal & Festive Palettes
 * Hand-tuned with high-contrast, authentic festive palettes (Diwali, Monsoon, Holi, etc.)
 */
export const FIXED_SEASONAL_PALETTES: ColorPalette[] = [
  {
    id: 'festive-diwali-gold',
    name: 'Diwali Crimson & Royal Gold',
    category: 'seasonal',
    isSeasonal: true,
    primaryColor: '#991b1b', // Deep Regal Crimson
    secondaryColor: '#d97706', // Royal Amber Gold
    accentColor: '#fbbf24', // Luminous Gold
    textColor: '#ffffff',
    description: 'Auspicious festive harmony with rich crimson and warm royal gold.',
  },
  {
    id: 'festive-monsoon-teal',
    name: 'Monsoon Azure & Deep Teal',
    category: 'seasonal',
    isSeasonal: true,
    primaryColor: '#0f766e', // Deep Teal
    secondaryColor: '#0284c7', // Monsoon Azure
    accentColor: '#38bdf8', // Raincloud Cyan
    textColor: '#ffffff',
    description: 'Refreshing cool blues and deep oceanic teals inspired by Indian monsoons.',
  },
  {
    id: 'festive-holi-vibrant',
    name: 'Holi Gulal Magenta & Saffron',
    category: 'seasonal',
    isSeasonal: true,
    primaryColor: '#be185d', // Gulal Magenta
    secondaryColor: '#ea580c', // Saffron Sunset
    accentColor: '#facc15', // Vibrant Yellow
    textColor: '#ffffff',
    description: 'High-energy celebration palette featuring joyous magenta and saffron.',
  },
  {
    id: 'festive-navratri-marigold',
    name: 'Navratri Marigold & Violet',
    category: 'seasonal',
    isSeasonal: true,
    primaryColor: '#c2410c', // Auspicious Marigold Orange
    secondaryColor: '#7e22ce', // Garba Royal Violet
    accentColor: '#fde047', // Marigold Yellow
    textColor: '#ffffff',
    description: 'Traditional energetic celebration palette with vivid orange and royal purple.',
  },
  {
    id: 'festive-eid-emerald',
    name: 'Eid Emerald & Crescent Gold',
    category: 'seasonal',
    isSeasonal: true,
    primaryColor: '#065f46', // Deep Emerald
    secondaryColor: '#b45309', // Crescent Gold
    accentColor: '#34d399', // Bright Jade
    textColor: '#ffffff',
    description: 'Refined celebration palette of noble emerald green and shimmering gold.',
  },
];

/**
 * Fixed Modern Editorial & Luxury Palettes
 */
export const FIXED_MODERN_PALETTES: ColorPalette[] = [
  {
    id: 'modern-nordic-slate',
    name: 'Nordic Slate & Electric Cyan',
    category: 'modern',
    primaryColor: '#0f172a', // Deep Slate
    secondaryColor: '#0284c7', // Sharp Sky
    accentColor: '#38bdf8', // Electric Cyan
    textColor: '#ffffff',
    description: 'Clean architectural minimalism with deep dark contrast and cyan punch.',
  },
  {
    id: 'modern-sunset-coral',
    name: 'Electric Sunset & Violet',
    category: 'modern',
    primaryColor: '#e11d48', // Electric Rose
    secondaryColor: '#7c3aed', // Twilight Violet
    accentColor: '#fb7185', // Warm Coral
    textColor: '#ffffff',
    description: 'Vibrant modern gradient pairing with warm coral and rich royal violet.',
  },
  {
    id: 'modern-cyber-lime',
    name: 'Cyber Noir & Sharp Lime',
    category: 'modern',
    primaryColor: '#18181b', // Midnight Zinc
    secondaryColor: '#65a30d', // Forest Lime
    accentColor: '#84cc16', // Neon Lime
    textColor: '#ffffff',
    description: 'High-tech cutting edge look with dark slate and neon electric lime.',
  },
  {
    id: 'modern-royal-indigo',
    name: 'Executive Indigo & Sapphire',
    category: 'modern',
    primaryColor: '#312e81', // Deep Indigo
    secondaryColor: '#0369a1', // Deep Sapphire
    accentColor: '#60a5fa', // Soft Blue
    textColor: '#ffffff',
    description: 'Premium corporate executive elegance with multi-tone blue harmony.',
  },
];

/**
 * Computes Brand-Derived Palettes by shifting the company's primaryColor into
 * complementary, analogous, triadic, and split-complementary mathematical harmonies.
 */
export function deriveBrandPalettes(rawBaseColor?: string): ColorPalette[] {
  const baseHex = rawBaseColor && colord(rawBaseColor).isValid()
    ? rawBaseColor
    : '#4f46e5';

  const base = colord(baseHex);
  const isDark = base.isDark();
  const textColor = isDark ? '#ffffff' : '#0f172a';

  return [
    {
      id: 'brand-core-identity',
      name: 'Brand Core Identity',
      category: 'brand_derived',
      primaryColor: base.toHex(),
      secondaryColor: base.rotate(28).saturate(0.08).toHex(),
      accentColor: base.rotate(180).saturate(0.15).toHex(),
      textColor,
      description: 'Your native brand colors with complementary accent highlight.',
    },
    {
      id: 'brand-complementary',
      name: 'Complementary Contrast',
      category: 'brand_derived',
      primaryColor: base.rotate(180).toHex(),
      secondaryColor: base.toHex(),
      accentColor: base.rotate(180).lighten(0.15).toHex(),
      textColor: colord(base.rotate(180).toHex()).isDark() ? '#ffffff' : '#0f172a',
      description: 'Dynamic 180° complementary color contrast for maximum promotional stopping power.',
    },
    {
      id: 'brand-analogous-warm',
      name: 'Warm Analogous Shift',
      category: 'brand_derived',
      primaryColor: base.rotate(35).toHex(),
      secondaryColor: base.toHex(),
      accentColor: base.rotate(65).saturate(0.2).lighten(0.1).toHex(),
      textColor: colord(base.rotate(35).toHex()).isDark() ? '#ffffff' : '#0f172a',
      description: 'Neighboring warm hue rotation providing a welcoming and friendly aesthetic.',
    },
    {
      id: 'brand-analogous-cool',
      name: 'Cool Analogous Shift',
      category: 'brand_derived',
      primaryColor: base.rotate(-35).toHex(),
      secondaryColor: base.toHex(),
      accentColor: base.rotate(-65).saturate(0.2).lighten(0.1).toHex(),
      textColor: colord(base.rotate(-35).toHex()).isDark() ? '#ffffff' : '#0f172a',
      description: 'Cool tone hue rotation evoking precision, reliability, and calm authority.',
    },
    {
      id: 'brand-triadic',
      name: 'Triadic Dynamic Harmony',
      category: 'brand_derived',
      primaryColor: base.rotate(120).toHex(),
      secondaryColor: base.rotate(240).toHex(),
      accentColor: base.toHex(),
      textColor: colord(base.rotate(120).toHex()).isDark() ? '#ffffff' : '#0f172a',
      description: 'Vibrant three-point geometric harmony across the color wheel.',
    },
    {
      id: 'brand-split-complement',
      name: 'Split-Complementary Balance',
      category: 'brand_derived',
      primaryColor: base.rotate(150).toHex(),
      secondaryColor: base.rotate(210).toHex(),
      accentColor: base.toHex(),
      textColor: colord(base.rotate(150).toHex()).isDark() ? '#ffffff' : '#0f172a',
      description: 'Nuanced high-contrast balance with two complementary adjacent tones.',
    },
    {
      id: 'brand-monochrome-deep',
      name: 'Monochromatic Deep Tone',
      category: 'brand_derived',
      primaryColor: base.darken(0.2).toHex(),
      secondaryColor: base.lighten(0.18).toHex(),
      accentColor: base.saturate(0.25).toHex(),
      textColor: '#ffffff',
      description: 'Sophisticated single-hue depth and tint modulation.',
    },
  ];
}

/**
 * Returns all active palettes available for a given brand color.
 * Contains at least 16 palettes (7 brand-derived, 5 seasonal/festive, 4 modern editorial).
 */
export function getAllPalettes(brandPrimaryColor?: string): ColorPalette[] {
  const derived = deriveBrandPalettes(brandPrimaryColor);
  return [...derived, ...FIXED_SEASONAL_PALETTES, ...FIXED_MODERN_PALETTES];
}

/**
 * Retrieves palettes tailored for a specific contentType.
 * For 'festival', returns the seasonal/festive set first, followed by vibrant brand shifts.
 * For 'offer', 'service', 'educational', prioritizes brand-derived and modern editorial sets.
 */
export function getPalettesForContentType(
  contentType: ContentType,
  brandPrimaryColor?: string
): ColorPalette[] {
  const all = getAllPalettes(brandPrimaryColor);

  if (contentType === 'festival') {
    // Festival content specifically prioritizes authentic seasonal/festive palettes
    const seasonal = all.filter((p) => p.category === 'seasonal');
    const vibrantBrand = all.filter((p) => p.id === 'brand-triadic' || p.id === 'brand-complementary' || p.id === 'modern-sunset-coral');
    return [...seasonal, ...vibrantBrand];
  }

  // Non-festival content uses brand-derived and modern palettes
  return all.filter((p) => p.category !== 'seasonal');
}

/**
 * Finds a palette by ID, dynamically recalculating if it's a brand-derived one.
 */
export function getPaletteById(paletteId: string, brandPrimaryColor?: string): ColorPalette | undefined {
  const all = getAllPalettes(brandPrimaryColor);
  return all.find((p) => p.id === paletteId);
}
